import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';
import type { RequestHandler } from './$types';
import { Ort } from '$lib/enums';
import {
	E***REMOVED***Error,
	ECommonServerError,
	ECompletionException,
	EGenAIError,
	errorByHttpCode,
	throwSvelteError
} from '$lib/errors';
// import OpenAI from 'openai';
import * as genai from '@google/genai';
import { ok, ResultAsync } from 'neverthrow';
import { json } from '@sveltejs/kit';
import { getContextPrompt } from '$src/lib/completion/prompt';
import { completionApiSchema, completionSchema } from '$src/lib/schemas';
import { db } from '$lib/server/db';
import { sql } from 'kysely';
import * as Sentry from '@sentry/sveltekit';
import { DEFAULT_MODEL } from '$src/lib/constants';

// API key from environment
const apiKey = env.GOOGLE_AI_API_KEY;

async function deductUserTokens(userId: string, amount: number) {
	await db
		.updateTable('user_token_count')
		.set({ tokens: sql`tokens - ${amount}` })
		.where('user_id', '=', userId)
		.execute();

	return ok(amount);
}

export const POST: RequestHandler = async ({ request, locals: { user } }) => {
	if (!user) {
		return throwSvelteError(ECommonServerError.UNAUTHORIZED);
	}

	if (!apiKey) {
		return throwSvelteError(ECompletionException.INTERNAL);
	}

	const body = await request.json();

	const parsed = completionApiSchema.safeParse(body);

	if (!parsed.success) {
		return throwSvelteError(ECommonServerError.VALIDATION_ERROR);
	}

	const userTokens = await db
		.selectFrom('user_token_count')
		.select('tokens')
		.where('user_id', '=', user.id)
		.forUpdate()
		.executeTakeFirst();

	if (
		userTokens === undefined ||
		userTokens === null ||
		userTokens.tokens <= 0
	) {
		return throwSvelteError(ECompletionException.NOT_ENOUGH_TOKENS);
	}

	const { text, ort } = parsed.data;

	const result = await ResultAsync.fromPromise(
		getGeminiCompletion(text, apiKey, ort),
		(e) =>
			e instanceof genai.ApiError
				? (errorByHttpCode(EGenAIError, e.status) ??
					ECompletionException.UNKNOWN_THIRD_PARTY_ERROR)
				: ECompletionException.UNKNOWN_THIRD_PARTY_ERROR
	);

	if (result.isErr()) {
		return throwSvelteError(result.error);
	}

	const completion = result.value;
	const summary = completion.text;
	if (
		completion === undefined ||
		completion === null ||
		summary === undefined ||
		summary === null
	) {
		return throwSvelteError(ECompletionException.UNKNOWN_THIRD_PARTY_ERROR);
	}

	const tokensUsed = completion.usageMetadata?.totalTokenCount;

	if (!tokensUsed) {
		Sentry.captureEvent({
			message:
				'USER USED COMPLETION WITHOUT TOKEN USAGE INFO - NO TOKENS DEDUCTED',
			level: 'fatal'
		});
	}

	const parsedResponse = completionSchema.safeParse(summary);
	if (!parsedResponse.success) {
		Sentry.captureMessage(parsedResponse.error.message);
		return throwSvelteError(E***REMOVED***Error.INVALID_JSON_FROM_AI);
	}

	await deductUserTokens(user.id, tokensUsed ?? 0);

	return json(parsedResponse.data);
};

async function getGeminiCompletion(text: string, apiKey: string, ort: Ort) {
	const ai = new genai.GoogleGenAI({ apiKey });

	if (!env.GEMINI_MODEL) {
		if (!dev) return throwSvelteError(ECompletionException.INTERNAL);
		console.warn(`[dev] GEMINI_MODEL not set, defaulting to ${DEFAULT_MODEL}`);
	}
	const model = env.GEMINI_MODEL ?? DEFAULT_MODEL;

	const completion = await ai.models.generateContent({
		config: {
			responseMimeType: 'application/json',
			systemInstruction: getContextPrompt(ort),
			responseSchema: completionSchema.toJSONSchema()
		},
		model,
		contents: text
	});

	return completion;
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
