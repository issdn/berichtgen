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
import { LocalTokenizer } from '@google/genai/tokenizer';
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
	await db.transaction().execute(async (trx) => {
		const current = await trx
			.selectFrom('user_token_count')
			.select('tokens')
			.where('user_id', '=', userId)
			.forUpdate()
			.executeTakeFirst();

		if (!current || current.tokens < amount) {
			throw new Error('insufficient_tokens');
		}

		await trx
			.updateTable('user_token_count')
			.set({ tokens: sql`tokens - ${amount}` })
			.where('user_id', '=', userId)
			.execute();
	});

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

	if (!env.GEMINI_MODEL) {
		if (!dev) return throwSvelteError(ECompletionException.INTERNAL);
		console.warn(`[dev] GEMINI_MODEL not set, defaulting to ${DEFAULT_MODEL}`);
	}
	const model = env.GEMINI_MODEL ?? DEFAULT_MODEL;

	const { text, ort } = parsed.data;

	// Count tokens locally before making the API call
	const tokenizer = new LocalTokenizer(model);
	const estimatedTokens = await tokenizer.countTokens(text);

	if (!estimatedTokens.totalTokens) {
		return throwSvelteError(
			ECompletionException.INTERNAL,
			'Die Tokenization ist fehlgeschlagen.'
		);
	}

	const deductResult = await ResultAsync.fromPromise(
		deductUserTokens(user.id, estimatedTokens.totalTokens),
		(e) => {
			if (e instanceof Error && e.message === 'insufficient_tokens') {
				return ECompletionException.NOT_ENOUGH_TOKENS;
			}
			Sentry.captureException(e);
			return ECompletionException.INTERNAL;
		}
	);

	if (deductResult.isErr()) {
		return throwSvelteError(deductResult.error);
	}

	const result = await ResultAsync.fromPromise(
		getGeminiCompletion(text, apiKey, ort, model),
		(e) =>
			e instanceof genai.ApiError
				? (errorByHttpCode(EGenAIError, e.status) ??
					ECompletionException.UNKNOWN_THIRD_PARTY_ERROR)
				: ECompletionException.UNKNOWN_THIRD_PARTY_ERROR
	);

	if (result.isErr()) {
		await db
			.updateTable('user_token_count')
			.set({ tokens: sql`tokens + ${estimatedTokens.totalTokens}` })
			.where('user_id', '=', user.id)
			.execute();
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

	const parsedResponse = completionSchema.safeParse(summary);
	if (!parsedResponse.success) {
		Sentry.captureMessage(parsedResponse.error.message);
		return throwSvelteError(E***REMOVED***Error.INVALID_JSON_FROM_AI);
	}

	return json(parsedResponse.data);
};

async function getGeminiCompletion(
	text: string,
	apiKey: string,
	ort: Ort,
	model: string
) {
	const ai = new genai.GoogleGenAI({ apiKey });

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
