import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';
import { CommonServerErrorTypes, CompletionExceptionType, Ort } from '$lib/enums';
import OpenAI from 'openai';
import * as genai from '@google/genai';
import { err, ok, ResultAsync } from 'neverthrow';
import { CompletionException } from '$src/lib/errors';
import { countTokens } from '$src/lib/utils/token_counter';
import * as Sentry from '@sentry/node';
import { error as errorJson } from '@sveltejs/kit';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getContextPrompt } from '$src/lib/completion/prompt';
import { completionApiSchema, completionSchema } from '$src/lib/schemas';
import { supabaseAdmin } from '$src/lib/server/admin';
import zodToJsonSchema from 'zod-to-json-schema';

function getTokenByOwner(owner: string) {
	switch (owner) {
		case 'deepseek':
			return ok(env.DEEPSEEK);
		case 'google':
			return ok(env.GEMINI);
		default:
			return err(
				new CompletionException(
					'Dieses Modell ist nicht verfügbar',
					CompletionExceptionType.INVALID_TOKEN
				)
			);
	}
}

async function deductUserTokens(
	supabase: SupabaseClient,
	userId: string,
	reduced: boolean,
	text: string
) {
	let amount = countTokens(new Blob([text]));

	if (reduced) {
		amount = Math.ceil(amount / 4);
	}
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

	const { text, provider, owner, ort } = parsed.data;

	const berichtgenToken = getTokenByOwner(owner).mapErr((e) => e.toResponse());

	if (berichtgenToken.isErr()) {
		return berichtgenToken.error;
	}

	const { data: userProviderData } = await supabaseAdmin
		.from('userLLMProvider')
		.select('token')
		.eq('userId', user!.id!)
		.eq('providerId', provider)
		.single();

	const userToken = userProviderData?.token;

	const token = userToken ?? berichtgenToken.value;

	const tokensDeducted = await deductUserTokens(
		supabaseAdmin,
		user!.id!,
		userToken !== undefined,
		text
	);

	if (tokensDeducted.isErr()) {
		return tokensDeducted.error.toResponse();
	}

	let response: ResultAsync<string | undefined | null, CompletionException>;

	if (owner === 'deepseek') {
		response = ResultAsync.fromPromise(getOpenAICompletion(text, token, ort), (e) =>
			CompletionException.fromUnknown(e)
		);
		// owner === 'google'
	} else {
		response = ResultAsync.fromPromise(getGeminiCompletion(text, token, ort), (e) =>
			CompletionException.fromUnknown(e)
		);
	}

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
	// Allow negative on output
	await deductUserTokens(supabaseAdmin, user!.id!, userToken !== undefined, completion);
	return new Response(completion);
};

async function getOpenAICompletion(text: string, token: string, ort: Ort) {
	const openai = new OpenAI({
		baseURL: 'https://api.deepseek.com',
		apiKey: token ?? env.DEEPSEEK
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
			// 	type: 'json_schema',
			// 	json_schema: {
			// 		name: 'berichtgen schema',
			// 		schema: {
			// 			lessons: {
			// 				type: 'array',
			// 				items: {
			// 					type: 'object',
			// 					properties: {
			// 						qualifikationen: {
			// 							type: 'array',
			// 							items: { type: 'string' }
			// 						},
			// 						text: { type: 'string' }
			// 					}
			// 				}
			// 			}
			// 		}
			// 	}
		}
	});

	return completion.choices[0].message.content;
}

async function getGeminiCompletion(
	text: string,
	token: string,
	ort: Ort
): Promise<string | undefined | null> {
	const ai = new genai.GoogleGenAI({ apiKey: token ?? env.GEMINI });

	const completion = await ai.models.generateContent({
		config: {
			responseMimeType: 'application/json',
			systemInstruction: getContextPrompt(ort),
			responseSchema: zodToJsonSchema(completionSchema)
		},
		model: 'gemini-1.5-flash',
		contents: text
	});

	return completion.text;
}
