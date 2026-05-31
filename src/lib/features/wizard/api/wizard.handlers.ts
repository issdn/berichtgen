/**
 * Pure business-logic handlers for wizard server operations.
 *
 * This module is intentionally side-effect-free with respect to UI - no toasts,
 * no store mutations. All presentation concerns live in the calling component.
 *
 * `wizard.remote.ts` is the thin transport shell that wires these functions
 * into SvelteKit remote functions.
 */

import type { GenaiCompletionResult } from '$wizard/types';

import { env } from '$env/dynamic/private';
import { GCS_BUCKET_NAME, GCS_SERVICE_ACCOUNT_KEY } from '$env/static/private';
import { DEFAULT_MODEL, MODEL_LOCATION } from '$lib/constants';
import { BerichtgenError, ECommonServerError } from '$lib/errors';
import { tryResult, tryResultAsync } from '$lib/result';
import db from '$lib/server/db';
import { countItemTokens, runCompletion } from '$wizard/completion/gemini';
import { ECompletionException, EGCSError, EWizardError } from '$wizard/errors';
import { type BatchCompletionItem } from '$wizard/schemas';
import { Storage } from '@google-cloud/storage';
import * as genai from '@google/genai';
import * as Sentry from '@sentry/sveltekit';
import { sql } from 'kysely';
import { createHash } from 'node:crypto';

/**
 * Checks whether a template with the given storage path still exists in the database.
 *
 * @param storagePath - The Supabase Storage path of the template file.
 * @returns `true` if the template record exists, `false` otherwise (including on error).
 */
export async function checkPreferredTemplateExists(
	storagePath: string
): Promise<boolean> {
	const templateResult = await tryResultAsync({
		apiError: ECommonServerError.DATABASE_ERROR,
		promise: db
			.selectFrom('template')
			.select('storage_path')
			.where('storage_path', '=', storagePath)
			.executeTakeFirst()
	});
	if (!templateResult.ok) {
		Sentry.captureException(templateResult.error);
		return false;
	}
	return templateResult.data !== undefined;
}

export async function requestGcsUploadTarget({
	contentType,
	fullFilePath,
	userId
}: {
	contentType: string;
	fullFilePath: string;
	userId: string;
}): Promise<{ fileUri: string; signedUrl: null | string }> {
	if (!GCS_BUCKET_NAME) {
		throw new BerichtgenError(ECommonServerError.INTERNAL_ERROR);
	}

	const normalizedFullPath = fullFilePath.replace(/\\/g, '/');
	const hash = createHash('sha256').update(normalizedFullPath).digest('hex');
	const objectPath = `${userId}/${hash}`;
	const fileUri = `gs://${GCS_BUCKET_NAME}/${objectPath}`;

	const storageResult = tryResult({
		apiError: ECommonServerError.INTERNAL_ERROR,
		run: () => {
			const credentials = JSON.parse(
				GCS_SERVICE_ACCOUNT_KEY.replace(/\n/g, '')
			);
			return new Storage({ credentials });
		}
	});
	if (!storageResult.ok) throw storageResult.error;

	const signedUploadResult = await tryResultAsync({
		apiError: EGCSError.INTERNAL_SERVER_ERROR,
		promise: createSignedUploadPayload({
			contentType,
			fileUri,
			objectPath,
			storage: storageResult.data
		})
	});
	if (!signedUploadResult.ok) throw signedUploadResult.error;

	return signedUploadResult.data;
}

export async function runBatchCompletion(
	items: BatchCompletionItem[],
	userId: string
) {
	const credentialsResult = await tryResultAsync({
		apiError: ECompletionException.INTERNAL,
		promise: Promise.resolve(
			JSON.parse(GCS_SERVICE_ACCOUNT_KEY.replace(/\n/g, ''))
		)
	});
	if (!credentialsResult.ok) throw credentialsResult.error;
	const credentials = credentialsResult.data;

	const model = env.GEMINI_MODEL ?? DEFAULT_MODEL;
	const modelLocation = env.GEMINI_MODEL_LOCATION ?? MODEL_LOCATION;

	const ai = new genai.GoogleGenAI({
		googleAuthOptions: {
			credentials: {
				client_email: credentials.client_email,
				private_key: credentials.private_key
			},
			projectId: credentials.project_id
		},
		location: modelLocation,
		project: credentials.project_id,
		vertexai: true
	});

	const tokenCounts = await Promise.all(
		items.map((item) => countItemTokens(item, ai, model))
	);

	const userBalance = await readUserBalance(userId);
	if (!userBalance || userBalance <= 0) {
		throw new BerichtgenError(ECompletionException.NOT_ENOUGH_TOKENS);
	}

	const budget = selectItemsWithinBudget(tokenCounts, userBalance);
	if (budget.fittingIndices.length === 0) {
		throw new BerichtgenError(ECompletionException.NOT_ENOUGH_TOKENS);
	}

	const deductResult = await tryResultAsync({
		apiError: ECompletionException.INTERNAL,
		promise: deductUserTokens(userId, budget.totalTokens)
	});
	if (!deductResult.ok) throw deductResult.error;

	const geminiResults = await Promise.allSettled(
		budget.fittingIndices.map((i) => runCompletion(items[i], ai, model))
	);

	if (geminiResults.some((r) => r.status === 'rejected')) {
		await refundUserTokens(userId, budget.totalTokens);
		throw new BerichtgenError(ECompletionException.UNKNOWN_THIRD_PARTY_ERROR);
	}

	const { parseErrorCount, results } = parseGeminiResponses(
		geminiResults as PromiseFulfilledResult<GenaiCompletionResult>[],
		budget.fittingIndices,
		items.length
	);

	if (parseErrorCount > 0) {
		await refundUserTokens(userId, budget.totalTokens);
		throw new BerichtgenError(EWizardError.INVALID_JSON_FROM_AI);
	}

	await deleteProcessedGcsFilesBestEffort(items, budget.fittingIndices, userId);

	return {
		insufficient_tokens: budget.insufficientTokens,
		results
	};
}

async function createSignedUploadPayload({
	contentType,
	fileUri,
	objectPath,
	storage
}: {
	contentType: string;
	fileUri: string;
	objectPath: string;
	storage: Storage;
}): Promise<{ fileUri: string; signedUrl: null | string }> {
	const file = storage.bucket(GCS_BUCKET_NAME).file(objectPath);
	const [exists] = await file.exists();
	if (exists) return { fileUri, signedUrl: null };

	const [signedUrl] = await file.getSignedUrl({
		action: 'write',
		contentType,
		expires: Date.now() + 5 * 60 * 1000,
		extensionHeaders: {
			'x-goog-if-generation-match': '0'
		},
		version: 'v4'
	});

	return { fileUri, signedUrl };
}

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

async function deleteProcessedGcsFilesBestEffort(
	items: BatchCompletionItem[],
	fittingIndices: number[],
	userId: string
): Promise<void> {
	const gcsUris = new Set<string>();
	for (const index of fittingIndices) {
		const item = items[index];
		if (item?.type !== 'gcs') continue;
		gcsUris.add(item.fileUri);
	}
	if (gcsUris.size === 0) return;

	const credentialsResult = tryResult({
		apiError: ECompletionException.INTERNAL,
		run: () => JSON.parse(GCS_SERVICE_ACCOUNT_KEY.replace(/\n/g, ''))
	});
	if (!credentialsResult.ok) {
		Sentry.captureException(credentialsResult.error);
		return;
	}
	const credentials = credentialsResult.data;

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

			if (!parsed.objectPath.startsWith(`${userId}/`)) return;

			const deleteResult = await tryResultAsync({
				apiError: ECompletionException.INTERNAL,
				promise: storage
					.bucket(parsed.bucket)
					.file(parsed.objectPath)
					.delete({ ignoreNotFound: true })
			});
			if (!deleteResult.ok) {
				Sentry.captureException(deleteResult.error, {
					extra: { objectPath: parsed.objectPath, uri }
				});
			}
		})
	);
}

function parseGeminiResponses(
	settled: PromiseFulfilledResult<GenaiCompletionResult>[],
	fittingIndices: number[],
	totalItems: number
) {
	const results: GenaiCompletionResult[] = new Array(totalItems).fill(null);
	let parseErrorCount = 0;

	for (let i = 0; i < fittingIndices.length; i++) {
		const parsed = settled[i].value;
		if (parsed === null) {
			parseErrorCount++;
			Sentry.captureMessage(
				'Gemini response could not be parsed for a batch item'
			);
			continue;
		}
		results[fittingIndices[i]] = parsed;
	}

	return { parseErrorCount, results };
}

function parseGsUri(
	fileUri: string
): null | { bucket: string; objectPath: string } {
	const match = /^gs:\/\/([^/]+)\/(.+)$/.exec(fileUri);
	if (!match) return null;
	return { bucket: match[1], objectPath: match[2] };
}

async function readUserBalance(userId: string): Promise<number | undefined> {
	const row = await db
		.selectFrom('user_token_count')
		.select('tokens')
		.where('user_id', '=', userId)
		.executeTakeFirst();
	return row?.tokens;
}

async function refundUserTokens(userId: string, amount: number): Promise<void> {
	if (amount <= 0) return;
	await db
		.updateTable('user_token_count')
		.set({ tokens: sql`tokens + ${amount}` })
		.where('user_id', '=', userId)
		.execute();
}

function selectItemsWithinBudget(
	tokenCounts: number[],
	availableTokens: number
): {
	fittingIndices: number[];
	insufficientTokens: boolean;
	totalTokens: number;
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
		insufficientTokens: fittingIndices.length < tokenCounts.length,
		totalTokens
	};
}
