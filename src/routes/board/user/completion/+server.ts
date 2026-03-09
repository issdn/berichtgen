import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';
import { CommonServerErrorTypes, CompletionExceptionType, Ort } from '$lib/enums';
import OpenAI from 'openai';
import * as genai from '@google/genai';
import { err, ok, type Result, ResultAsync } from 'neverthrow';
import { CompletionException } from '$src/lib/errors';
import { countTokens } from '$src/lib/utils/token_counter';
import * as Sentry from '@sentry/node';
import { error as errorJson } from '@sveltejs/kit';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getContextPrompt } from '$src/lib/completion/prompt';
import { completionApiSchema, completionSchema } from '$src/lib/schemas';
import { supabaseAdmin } from '$src/lib/server/admin';
import zodToJsonSchema from 'zod-to-json-schema';

// Hardcoded provider configuration - uses DeepSeek by default
// Change this to 'google' to use Gemini instead
const PROVIDER_OWNER = 'deepseek';

function getToken(): Result<string, CompletionException> {
	const token = env.DEEPSEEK;
	if (!token) {
		return err(
			new CompletionException(
				'Dieses Modell ist nicht verfügbar',
				CompletionExceptionType.INVALID_TOKEN
			)
		);
	}
	return ok(token);
}

async function deductUserTokens(
	supabase: SupabaseClient,
	userId: string,
	text: string
) {
	const amount = countTokens(new Blob([text]));

	const { data, error } = await supabase.rpc('deduct_user_tokens', {
		user_id: userId,
		amount
	});
	if (error) {
		Sentry.captureException(error, {
			extra: { user_id: userId, amount }
		});
		return err(
			new CompletionException('Interner Datenbank Fehler.', CompletionExceptionType.INTERNAL)
		);
	}
	if (!data) {
		return err(
			new CompletionException('Nicht genug Tokens', CompletionExceptionType.NOT_ENOUGH_TOKENS)
		);
	}
	return ok(data);
}

export const POST: RequestHandler = async ({ request, locals: { user } }) => {
	if (!user) {
		return errorJson(401, {
			type: CommonServerErrorTypes.UNAUTHORIZED,
			message: 'Nicht autorisiert'
		});
	}

	const body = await request.json();

	const parsed = completionApiSchema.safeParse(body);

	if (!parsed.success) {
		return errorJson(400, {
			type: CommonServerErrorTypes.VALIDATION_ERROR,
			message: parsed.error.message
		});
	}

	const { text, ort } = parsed.data;

	const tokenResult = getToken().mapErr((e) => e.toResponse());

	if (tokenResult.isErr()) {
		return tokenResult.error;
	}

	const token = tokenResult.value;

	const tokensDeducted = await deductUserTokens(
		supabaseAdmin,
		user!.id!,
		text
	);

	if (tokensDeducted.isErr()) {
		return tokensDeducted.error.toResponse();
	}

	const response = ResultAsync.fromPromise(getOpenAICompletion(text, token, ort), (e) =>
		CompletionException.fromUnknown(e)
	);

	const result = await response.mapErr((e) => e.toResponse());
	if (result.isErr()) {
		return result.error;
	}
	const completion = result.value;
	if (completion === undefined || completion === null) {
		return errorJson(500, {
			type: CompletionExceptionType.UNKNOWN_THIRD_PARTY_ERROR,
			message: 'Die API hat nichts zurückgegeben.'
		});
	}
	// Deduct tokens for output
	await deductUserTokens(supabaseAdmin, user!.id!, completion);
	return new Response(completion);
};

async function getOpenAICompletion(text: string, token: string, ort: Ort) {
	const openai = new OpenAI({
		baseURL: 'https://api.deepseek.com',
		apiKey: token
	});

	const completion = await openai.chat.completions.create({
		messages: [
			{
				role: 'system',
				content: getContextPrompt(ort)
			},
			{
				role: 'user',
				content: text
			}
		],
		model: 'deepseek-chat',
		response_format: {
			type: 'json_object'
		}
	});

	return completion.choices[0].message.content;
}
