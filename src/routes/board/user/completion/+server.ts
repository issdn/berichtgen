import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';
import type { RequestHandler } from './$types';
import { Ort } from '$lib/enums';
import {
	E***REMOVED***Error,
	ECommonServerError,
	ECompletionException,
	throwSvelteError
} from '$lib/errors';
// import OpenAI from 'openai';
import * as genai from '@google/genai';
import { LocalTokenizer } from '@google/genai/tokenizer';
import { ok, ResultAsync } from 'neverthrow';
import { json } from '@sveltejs/kit';
import { getContextPrompt } from '$src/lib/completion/prompt';
import {
	batchCompletionApiSchema,
	completionSchema,
	type BatchCompletionApiResponse
} from '$src/lib/schemas';
import { db } from '$lib/server/db';
import { sql } from 'kysely';
import * as Sentry from '@sentry/sveltekit';
import { DEFAULT_MODEL } from '$src/lib/constants';

// API key from environment
const apiKey = env.GOOGLE_AI_API_KEY;

/**
 * Deducts tokens from the user inside a serialisable transaction.
 * The SELECT FOR UPDATE prevents concurrent requests from double-spending the same balance.
 * Throws `Error('insufficient_tokens')` if the balance is too low.
 */
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

/**
 * Refunds tokens to the user (best-effort, not transactional).
 * Called when a downstream error occurs after tokens have already been deducted.
 */
async function refundUserTokens(userId: string, amount: number): Promise<void> {
	if (amount <= 0) return;
	await db
		.updateTable('user_token_count')
		.set({ tokens: sql`tokens + ${amount}` })
		.where('user_id', '=', userId)
		.execute();
}

export const POST: RequestHandler = async ({ request, locals: { user } }) => {
	if (!user) return throwSvelteError(ECommonServerError.UNAUTHORIZED);
	if (!apiKey) return throwSvelteError(ECompletionException.INTERNAL);

	const body = await request.json();
	const parsed = batchCompletionApiSchema.safeParse(body);
	if (!parsed.success)
		return throwSvelteError(ECommonServerError.VALIDATION_ERROR);

	if (!env.GEMINI_MODEL) {
		if (!dev) return throwSvelteError(ECompletionException.INTERNAL);
		console.warn(`[dev] GEMINI_MODEL not set, defaulting to ${DEFAULT_MODEL}`);
	}
	const model = env.GEMINI_MODEL ?? DEFAULT_MODEL;

	const { items } = parsed.data;

	// Count tokens locally for all items before any API or DB call
	// TODO: Switch to DEFAULT_MODEL when the 3.1 tokenizer is availible
	const tokenizer = new LocalTokenizer('gemini-2.5-flash-lite');
	const tokenCounts = await Promise.all(
		items.map(async ({ text }) => {
			const counted = await tokenizer.countTokens(text);
			return counted.totalTokens;
		})
	);

	// Read user balance without a lock — the real guard is inside deductUserTokens
	const userBalance = await db
		.selectFrom('user_token_count')
		.select('tokens')
		.where('user_id', '=', user.id)
		.executeTakeFirst();

	if (!userBalance || userBalance.tokens <= 0) {
		return throwSvelteError(ECompletionException.NOT_ENOUGH_TOKENS);
	}

	// Greedily select items that fit within the user's token budget (preserves order)
	let budgetRemaining = userBalance.tokens;
	const fittingIndices: number[] = [];
	const fittingTokenCounts: number[] = [];

	for (let i = 0; i < items.length; i++) {
		const count = tokenCounts[i];
		if (count && budgetRemaining >= count) {
			fittingIndices.push(i);
			fittingTokenCounts.push(count);
			budgetRemaining -= count;
		}
	}

	const insufficientTokens = fittingIndices.length < items.length;

	if (fittingIndices.length === 0) {
		return throwSvelteError(ECompletionException.NOT_ENOUGH_TOKENS);
	}

	const totalDeducted = fittingTokenCounts.reduce((sum, t) => sum + t, 0);

	// Atomically deduct tokens for all fitting items before any Gemini call
	const deductResult = await ResultAsync.fromPromise(
		deductUserTokens(user.id, totalDeducted),
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

	// Send all fitting items to Gemini in parallel
	const geminiResults = await Promise.allSettled(
		fittingIndices.map((i) =>
			getGeminiCompletion(items[i].text, apiKey, items[i].ort, model)
		)
	);

	// If any Gemini call failed, refund everything and report the error
	const hasApiError = geminiResults.some((r) => r.status === 'rejected');
	if (hasApiError) {
		await refundUserTokens(user.id, totalDeducted);
		return throwSvelteError(ECompletionException.UNKNOWN_THIRD_PARTY_ERROR);
	}

	// Parse and validate each Gemini response
	const results: (string[] | null)[] = new Array(items.length).fill(null);
	let parseErrorCount = 0;

	for (let fi = 0; fi < fittingIndices.length; fi++) {
		const originalIndex = fittingIndices[fi];
		const settled = geminiResults[fi] as PromiseFulfilledResult<
			Awaited<ReturnType<typeof getGeminiCompletion>>
		>;
		const summary = settled.value.text;

		if (!summary) {
			parseErrorCount++;
			Sentry.captureEvent({
				message: 'Gemini returned empty text for a batch item',
				level: 'error'
			});
			continue;
		}

		let parsedResponse: ReturnType<typeof completionSchema.safeParse>;
		try {
			parsedResponse = completionSchema.safeParse(summary);
		} catch (e) {
			parseErrorCount++;
			Sentry.captureException(e);
			continue;
		}
		if (!parsedResponse.success) {
			parseErrorCount++;
			Sentry.captureMessage(parsedResponse.error.message);
			continue;
		}

		results[originalIndex] = parsedResponse.data;
	}

	// If any item failed JSON parsing, refund all tokens and error out
	if (parseErrorCount > 0) {
		await refundUserTokens(user.id, totalDeducted);
		return throwSvelteError(E***REMOVED***Error.INVALID_JSON_FROM_AI);
	}

	const response: BatchCompletionApiResponse = {
		results,
		insufficient_tokens: insufficientTokens
	};

	return json(response);
};

async function getGeminiCompletion(
	text: string,
	apiKey: string,
	ort: Ort,
	model: string
) {
	const ai = new genai.GoogleGenAI({ apiKey });

	return ai.models.generateContent({
		config: {
			responseMimeType: 'application/json',
			systemInstruction: getContextPrompt(ort),
			responseSchema: completionSchema.toJSONSchema()
		},
		model,
		contents: text
	});
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
