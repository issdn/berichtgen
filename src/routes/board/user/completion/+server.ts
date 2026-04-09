import type { RequestHandler } from './$types';
import {
	***REMOVED***Error,
	ECommonServerError,
	throwSvelteError
} from '$lib/errors';
import { ECompletionException, EWizardError } from '$wizard/errors';
import * as genai from '@google/genai';
import { LocalTokenizer } from '@google/genai/tokenizer';
import { json } from '@sveltejs/kit';
import db from '$lib/server/db';
import { sql } from 'kysely';
import * as Sentry from '@sentry/sveltekit';
import {
	batchCompletionApiSchema,
	completionSchema,
	type BatchCompletionApiResponse,
	type BatchCompletionItem
} from '$wizard/schemas';
import { getContextPrompt } from '$wizard/completion/prompt';
import { GCS_SERVICE_ACCOUNT_KEY } from '$env/static/private';
import { env } from '$env/dynamic/private';
import { DEFAULT_MODEL, MODEL_LOCATION } from '$lib/constants';

if (!env.GEMINI_MODEL) {
	console.debug('GEMINI_MODEL not set, defaulting to', DEFAULT_MODEL);
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export const POST: RequestHandler = async ({ request, locals: { user } }) => {
	if (!user) return throwSvelteError(ECommonServerError.UNAUTHORIZED);

	const credentials = JSON.parse(GCS_SERVICE_ACCOUNT_KEY.replace(/\n/g, ''));
	if (!credentials) return throwSvelteError(ECompletionException.INTERNAL);

	const body = await request.json();
	const parsed = batchCompletionApiSchema.safeParse(body);
	if (!parsed.success)
		return throwSvelteError(ECommonServerError.VALIDATION_ERROR);

	const model = env.GEMINI_MODEL ?? DEFAULT_MODEL;
	const modelLocation = env.GEMINI_MODEL_LOCATION ?? MODEL_LOCATION;

	const ai = new genai.GoogleGenAI({
		vertexai: true,
		location: modelLocation,
		project: credentials.project_id,
		googleAuthOptions: {
			credentials: {
				client_email: credentials.client_email,
				private_key: credentials.private_key
			},
			projectId: credentials.project_id
		}
	});
	// TODO: Switch to DEFAULT_MODEL when the 3.1 tokenizer is available
	const tokenizer = new LocalTokenizer('gemini-2.5-flash-lite');

	const { items } = parsed.data;

	const tokenCounts = await Promise.all(
		items.map((item) => countItemTokens(item, ai, model, tokenizer))
	);

	const userBalance = await readUserBalance(user.id);
	if (!userBalance || userBalance <= 0)
		return throwSvelteError(ECompletionException.NOT_ENOUGH_TOKENS);

	const budget = selectItemsWithinBudget(tokenCounts, userBalance);
	if (budget.fittingIndices.length === 0)
		return throwSvelteError(ECompletionException.NOT_ENOUGH_TOKENS);

	try {
		await deductUserTokens(user.id, budget.totalTokens);
	} catch (e) {
		if (e instanceof ***REMOVED***Error) return throwSvelteError(e.apiError);
		Sentry.captureException(e);
		return throwSvelteError(ECompletionException.INTERNAL);
	}

	const geminiResults = await Promise.allSettled(
		budget.fittingIndices.map((i) => generateCompletion(items[i], ai, model))
	);

	if (geminiResults.some((r) => r.status === 'rejected')) {
		await refundUserTokens(user.id, budget.totalTokens);
		return throwSvelteError(ECompletionException.UNKNOWN_THIRD_PARTY_ERROR);
	}

	const { results, parseErrorCount } = parseGeminiResponses(
		geminiResults as PromiseFulfilledResult<
			Awaited<ReturnType<typeof generateCompletion>>
		>[],
		budget.fittingIndices,
		items.length
	);

	if (parseErrorCount > 0) {
		await refundUserTokens(user.id, budget.totalTokens);
		return throwSvelteError(EWizardError.INVALID_JSON_FROM_AI);
	}

	const response: BatchCompletionApiResponse = {
		results,
		insufficient_tokens: budget.insufficientTokens
	};

	return json(response);
};

// ─── Token helpers ────────────────────────────────────────────────────────────

/**
 * Counts the tokens for a single completion item.
 * Text items use the fast local tokenizer; file items call the Gemini API.
 */
async function countItemTokens(
	item: BatchCompletionItem,
	ai: genai.GoogleGenAI,
	model: string,
	localTokenizer: InstanceType<typeof LocalTokenizer>
): Promise<number> {
	if (item.type === 'text') {
		const result = await localTokenizer.countTokens(item.text);
		return result.totalTokens ?? 0;
	}
	const part = itemToContentPart(item);
	const result = await ai.models.countTokens({
		model,
		contents: [{ parts: [part] }]
	});
	return result.totalTokens ?? 0;
}

/**
 * Reads the user's token balance without a lock.
 * The real guard against double-spending is inside `deductUserTokens`.
 */
async function readUserBalance(userId: string): Promise<number | undefined> {
	const row = await db
		.selectFrom('user_token_count')
		.select('tokens')
		.where('user_id', '=', userId)
		.executeTakeFirst();
	return row?.tokens;
}

/**
 * Greedily selects items that fit within the available token budget (preserves order).
 * Returns the fitting indices, their total token cost, and whether any items were skipped.
 */
function selectItemsWithinBudget(
	tokenCounts: number[],
	availableTokens: number
): {
	fittingIndices: number[];
	totalTokens: number;
	insufficientTokens: boolean;
} {
	const fittingIndices: number[] = [];
	let totalTokens = 0;
	let remaining = availableTokens;

	for (let i = 0; i < tokenCounts.length; i++) {
		const cost = tokenCounts[i];
		if (cost && remaining >= cost) {
			fittingIndices.push(i);
			totalTokens += cost;
			remaining -= cost;
		}
	}

	return {
		fittingIndices,
		totalTokens,
		insufficientTokens: fittingIndices.length < tokenCounts.length
	};
}

/**
 * Deducts tokens from the user inside a serialisable transaction.
 * SELECT FOR UPDATE prevents concurrent requests from double-spending.
 * Throws `***REMOVED***Error(NOT_ENOUGH_TOKENS)` if the balance is insufficient.
 */
async function deductUserTokens(userId: string, amount: number): Promise<void> {
	await db.transaction().execute(async (trx) => {
		const current = await trx
			.selectFrom('user_token_count')
			.select('tokens')
			.where('user_id', '=', userId)
			.forUpdate()
			.executeTakeFirst();

		if (!current || current.tokens < amount) {
			throw new ***REMOVED***Error(ECompletionException.NOT_ENOUGH_TOKENS);
		}

		await trx
			.updateTable('user_token_count')
			.set({ tokens: sql`tokens - ${amount}` })
			.where('user_id', '=', userId)
			.execute();
	});
}

/**
 * Best-effort token refund after a downstream failure.
 * Not transactional — called only when Gemini or response parsing has already failed.
 */
async function refundUserTokens(userId: string, amount: number): Promise<void> {
	if (amount <= 0) return;
	await db
		.updateTable('user_token_count')
		.set({ tokens: sql`tokens + ${amount}` })
		.where('user_id', '=', userId)
		.execute();
}

// ─── Gemini helpers ───────────────────────────────────────────────────────────

/**
 * Calls the Gemini API for a single completion item.
 * Builds the appropriate content part based on the item type:
 * - `text`   → text part
 * - `inline` → `inlineData` part (base64-encoded bytes)
 * - `gcs`    → `fileData` part (`gs://` URI — Gemini fetches natively)
 */
async function generateCompletion(
	item: BatchCompletionItem,
	ai: genai.GoogleGenAI,
	model: string
) {
	return ai.models.generateContent({
		config: {
			responseMimeType: 'application/json',
			systemInstruction: getContextPrompt(item.ort),
			responseSchema: completionSchema.toJSONSchema()
		},
		model,
		contents: [{ role: 'user', parts: [itemToContentPart(item)] }]
	});
}

/** Maps a `BatchCompletionItem` to its Gemini content part. */
function itemToContentPart(item: BatchCompletionItem): genai.Part {
	if (item.type === 'text') return { text: item.text };
	if (item.type === 'inline')
		return { inlineData: { data: item.data, mimeType: item.mimeType } };
	return { fileData: { fileUri: item.fileUri, mimeType: item.mimeType } };
}

/**
 * Validates and maps fulfilled Gemini responses to per-item string arrays.
 * Reports parse errors to Sentry and returns a count for the caller to act on.
 */
function parseGeminiResponses(
	settled: PromiseFulfilledResult<
		Awaited<ReturnType<typeof generateCompletion>>
	>[],
	fittingIndices: number[],
	totalItems: number
): { results: (string[] | null)[]; parseErrorCount: number } {
	const results: (string[] | null)[] = new Array(totalItems).fill(null);
	let parseErrorCount = 0;

	for (let i = 0; i < fittingIndices.length; i++) {
		const text = settled[i].value.text;

		if (!text) {
			parseErrorCount++;
			Sentry.captureEvent({
				message: 'Gemini returned empty text for a batch item',
				level: 'error'
			});
			continue;
		}

		let parsed: ReturnType<typeof completionSchema.safeParse>;
		try {
			parsed = completionSchema.safeParse(text);
		} catch (e) {
			parseErrorCount++;
			Sentry.captureException(e);
			continue;
		}

		if (!parsed.success) {
			parseErrorCount++;
			Sentry.captureMessage(parsed.error.message);
			continue;
		}

		results[fittingIndices[i]] = parsed.data;
	}

	return { results, parseErrorCount };
}
