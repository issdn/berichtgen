import type { RequestHandler } from './$types';
import {
	BerichtgenError,
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
	type BatchCompletionApiResponse,
	type BatchCompletionItem
} from '$wizard/schemas';
import { itemToContentPart, runCompletion } from '$wizard/completion/gemini';
import { GCS_SERVICE_ACCOUNT_KEY } from '$env/static/private';
import { env } from '$env/dynamic/private';
import { DEFAULT_MODEL, MODEL_LOCATION } from '$lib/constants';
import { Storage } from '@google-cloud/storage';
import { tryResult } from '$lib/result';

if (!env.GEMINI_MODEL) {
	console.debug('GEMINI_MODEL not set, defaulting to', DEFAULT_MODEL);
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export const POST: RequestHandler = async ({ request, locals: { user } }) => {
	if (!user) return throwSvelteError(ECommonServerError.UNAUTHORIZED);

	const credentialsResult = await tryResult(
		Promise.resolve(JSON.parse(GCS_SERVICE_ACCOUNT_KEY.replace(/\n/g, ''))),
		BerichtgenError,
		ECompletionException.INTERNAL
	);
	if (!credentialsResult.ok)
		return throwSvelteError(credentialsResult.error.apiError);
	const credentials = credentialsResult.data;

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

	const deductResult = await tryResult(
		deductUserTokens(user.id, budget.totalTokens),
		BerichtgenError,
		ECompletionException.INTERNAL
	);
	if (!deductResult.ok) return throwSvelteError(deductResult.error.apiError);

	const geminiResults = await Promise.allSettled(
		budget.fittingIndices.map((i) => runCompletion(items[i], ai, model))
	);

	if (geminiResults.some((r) => r.status === 'rejected')) {
		await refundUserTokens(user.id, budget.totalTokens);
		return throwSvelteError(ECompletionException.UNKNOWN_THIRD_PARTY_ERROR);
	}

	const { results, parseErrorCount } = parseGeminiResponses(
		geminiResults as PromiseFulfilledResult<string[] | null>[],
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

	await deleteProcessedGcsFilesBestEffort(items, budget.fittingIndices, user.id);

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
 * Throws `BerichtgenError(NOT_ENOUGH_TOKENS)` if the balance is insufficient.
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
			throw new BerichtgenError(ECompletionException.NOT_ENOUGH_TOKENS);
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
 * Builds a sparse result array from fulfilled `runCompletion` results.
 * Reports unparseable responses to Sentry and counts them for the caller.
 */
function parseGeminiResponses(
	settled: PromiseFulfilledResult<string[] | null>[],
	fittingIndices: number[],
	totalItems: number
): { results: (string[] | null)[]; parseErrorCount: number } {
	const results: (string[] | null)[] = new Array(totalItems).fill(null);
	let parseErrorCount = 0;

	for (let i = 0; i < fittingIndices.length; i++) {
		const parsed = settled[i].value;
		if (parsed === null) {
			parseErrorCount++;
			Sentry.captureMessage('Gemini response could not be parsed for a batch item');
			continue;
		}
		results[fittingIndices[i]] = parsed;
	}

	return { results, parseErrorCount };
}

function parseGsUri(fileUri: string): { bucket: string; objectPath: string } | null {
	const match = /^gs:\/\/([^/]+)\/(.+)$/.exec(fileUri);
	if (!match) return null;
	return { bucket: match[1], objectPath: match[2] };
}

async function deleteProcessedGcsFilesBestEffort(
	items: BatchCompletionItem[],
	fittingIndices: number[],
	userId: string
): Promise<void> {
	const gcsUris = new Set<string>();
	for (const index of fittingIndices) {
		const item = items[index];
		if (item?.type !== 'file') continue;
		gcsUris.add(item.fileUri);
	}
	if (gcsUris.size === 0) return;

	let credentials: { client_email: string; private_key: string } & {
		project_id: string;
	};
	try {
		credentials = JSON.parse(GCS_SERVICE_ACCOUNT_KEY.replace(/\n/g, ''));
	} catch (e) {
		Sentry.captureException(e);
		return;
	}

	const storage = new Storage({ credentials });

	await Promise.all(
		[...gcsUris].map(async (uri) => {
			const parsed = parseGsUri(uri);
			if (!parsed) {
				Sentry.captureMessage('Invalid gs:// URI in completion request', {
					extra: { uri }
				});
				return;
			}

			// Only delete objects belonging to the current user namespace.
			if (!parsed.objectPath.startsWith(`${userId}/`)) return;

			try {
				await storage
					.bucket(parsed.bucket)
					.file(parsed.objectPath)
					.delete({ ignoreNotFound: true });
			} catch (e) {
				Sentry.captureException(e, {
					extra: { uri, objectPath: parsed.objectPath }
				});
			}
		})
	);
}
