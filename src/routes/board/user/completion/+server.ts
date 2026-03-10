import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';
import { CommonServerErrorTypes, CompletionExceptionType, Ort } from '$lib/enums';
// import OpenAI from 'openai';
import * as genai from '@google/genai';
import { err, ok, ResultAsync } from 'neverthrow';
import { CompletionException } from '$src/lib/errors';
import { countTokens } from '$src/lib/utils/token_counter';
import * as Sentry from '@sentry/sveltekit';
import { error as errorJson } from '@sveltejs/kit';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getContextPrompt } from '$src/lib/completion/prompt';
import { completionApiSchema, completionSchema } from '$src/lib/schemas';
import { supabaseAdmin } from '$src/lib/server/admin';

// API key from environment
const apiKey = env.GOOGLE_AI_API_KEY;

async function deductUserTokens(supabase: SupabaseClient, userId: string, text: string) {
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

	if (!apiKey) {
		return errorJson(500, {
			type: CompletionExceptionType.INVALID_TOKEN,
			message: 'API key not configured'
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

	const tokensDeducted = await deductUserTokens(supabaseAdmin, user!.id!, text);

	if (tokensDeducted.isErr()) {
		return tokensDeducted.error.toResponse();
	}

	const response = ResultAsync.fromPromise(getGeminiCompletion(text, apiKey, ort), (e) =>
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

async function getGeminiCompletion(
	text: string,
	apiKey: string,
	ort: Ort
): Promise<string | undefined | null> {
	const ai = new genai.GoogleGenAI({ apiKey });

	const completion = await ai.models.generateContent({
		config: {
			responseMimeType: 'application/json',
			systemInstruction: getContextPrompt(ort),
			responseSchema: completionSchema.toJSONSchema()
		},
		// Using Gemini 2.0 Flash Lite - smaller, faster model
		model: 'gemini-2.0-flash-lite',
		contents: text
	});

	return completion.text;
}

/*
// OpenAI/DeepSeek completion - commented out
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
*/
