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
import type { BatchResult } from '$wizard/types';

import { env } from '$env/dynamic/private';
import { GCS_BUCKET_NAME, GCS_SERVICE_ACCOUNT_KEY } from '$env/static/private';
import { DEFAULT_MODEL, MODEL_LOCATION } from '$lib/constants';
import {
	type AnyErrorValue,
	BerichtgenError,
	ECommonServerError
} from '$lib/errors';
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
	fullFilePath,
	userId
}: {
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
			fileUri,
			objectPath,
			storage: storageResult.data
		})
	});
	if (!signedUploadResult.ok) throw signedUploadResult.error;

	return signedUploadResult.data;
}

/**
 * Runs Gemini completion for one batch and returns one structured result per
 * requested item. Only true batch-global failures throw.
 */
export async function runBatchCompletion({
	items,
	userId
}: {
	items: BatchCompletionItem[];
	userId: string;
}): Promise<BatchResult[]> {
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
	const totalTokens = tokenCounts.reduce((sum, count) => sum + count, 0);

	const userBalance = await readUserBalance(userId);
	if (!userBalance || userBalance < totalTokens) {
		throw new BerichtgenError(ECompletionException.NOT_ENOUGH_TOKENS);
	}

	const deductResult = await tryResultAsync({
		apiError: ECompletionException.INTERNAL,
		promise: deductUserTokens(userId, totalTokens)
	});
	if (!deductResult.ok) throw deductResult.error;

	const geminiResults = await Promise.allSettled(
		items.map((item) => runCompletion(item, ai, model))
	);

	const batches = geminiResults.map((result) =>
		classifyBatchResult({ result })
	);
	const failedTokenTotal = sumFailedTokenCounts({
		batches,
		tokenCounts
	});

	if (failedTokenTotal > 0) {
		await refundUserTokens(userId, failedTokenTotal);
	}

	await deleteProcessedGcsFilesBestEffort(
		items,
		items.map((_, index) => index),
		userId
	);

	return batches;
}

async function createSignedUploadPayload({
	fileUri,
	objectPath,
	storage
}: {
	fileUri: string;
	objectPath: string;
	storage: Storage;
}): Promise<{ fileUri: string; signedUrl: null | string }> {
	const file = storage.bucket(GCS_BUCKET_NAME).file(objectPath);
	const [exists] = await file.exists();
	if (exists) return { fileUri, signedUrl: null };

	const [signedUrl] = await file.getSignedUrl({
		action: 'write',
		expires: Date.now() + 5 * 60 * 1000,
		queryParams: {
			ifGenerationMatch: '0'
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

function classifyBatchError({
	error
}: {
	error: unknown;
}): AnyErrorValue & { global: boolean } {
	if (error instanceof BerichtgenError) {
		if (error.apiError.code === EWizardError.INVALID_JSON_FROM_AI.code) {
			Sentry.captureMessage(
				'Gemini response could not be parsed for a batch item'
			);
			return { ...EWizardError.INVALID_JSON_FROM_AI, global: false };
		}
		if (error.apiError.httpCode === 429) {
			return { ...ECompletionException.TOO_MANY_REQUESTS, global: true };
		}
	}

	return { ...ECompletionException.UNKNOWN_THIRD_PARTY_ERROR, global: true };
}

function classifyBatchResult({
	result
}: {
	result: PromiseSettledResult<GenaiCompletionResult>;
}): BatchResult {
	if (result.status === 'fulfilled') {
		if (result.value === null) {
			Sentry.captureMessage(
				'Gemini response could not be parsed for a batch item'
			);
			return {
				error: { ...EWizardError.INVALID_JSON_FROM_AI, global: false },
				ok: false
			};
		}
		return { data: result.value, ok: true };
	}

	return {
		error: classifyBatchError({ error: result.reason }),
		ok: false
	};
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

function sumFailedTokenCounts({
	batches,
	tokenCounts
}: {
	batches: BatchResult[];
	tokenCounts: number[];
}): number {
	return batches.reduce((sum, batch, index) => {
		if (batch.ok) return sum;
		return sum + (tokenCounts[index] ?? 0);
	}, 0);
}
