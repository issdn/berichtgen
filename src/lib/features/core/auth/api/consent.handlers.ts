import type { Result } from '$lib/result';

import {
	PRIVACY_POLICY_CONSENT_SOURCE_LOGIN_GATE,
	PRIVACY_POLICY_CONSENT_TYPE,
	VERTEX_AI_CONSENT_SOURCE_SETTINGS,
	VERTEX_AI_CONSENT_SOURCE_WIZARD,
	VERTEX_AI_CONSENT_TYPE
} from '$lib/constants';
import { ECommonServerError } from '$lib/errors';
import { okResult, tryResultAsync } from '$lib/result';
import db from '$lib/server/db';

export type ConsentLogStatus = 'granted' | 'withdrawn';

export type ConsentLogType =
	| typeof PRIVACY_POLICY_CONSENT_TYPE
	| typeof VERTEX_AI_CONSENT_TYPE;

export type ConsentLogSource =
	| typeof PRIVACY_POLICY_CONSENT_SOURCE_LOGIN_GATE
	| typeof VERTEX_AI_CONSENT_SOURCE_SETTINGS
	| typeof VERTEX_AI_CONSENT_SOURCE_WIZARD;

/**
 * Reads the user's current Vertex AI consent state from the newest audit-log row.
 */
export async function readVertexAiConsentGranted({
	userId
}: {
	userId: string;
}): Promise<Result<boolean>> {
	const latestStatusResult = await tryResultAsync({
		apiError: ECommonServerError.DATABASE_ERROR,
		promise: db
			.selectFrom('consent')
			.select('status')
			.where('user_id', '=', userId)
			.where('consent_type', '=', VERTEX_AI_CONSENT_TYPE)
			.orderBy('created_at', 'desc')
			.orderBy('id', 'desc')
			.executeTakeFirst()
	});
	if (!latestStatusResult.ok) {
		return latestStatusResult;
	}

	return okResult(latestStatusResult.data?.status === 'granted');
}

/**
 * Appends a new immutable audit-log row for any consent decision.
 */
export async function appendConsentLog({
	appVersion,
	consentType,
	source,
	status,
	userEmail,
	userId = null
}: {
	appVersion: string;
	consentType: ConsentLogType;
	source: ConsentLogSource;
	status: ConsentLogStatus;
	userEmail: string;
	userId?: null | string;
}): Promise<Result<void>> {
	const insertResult = await tryResultAsync({
		apiError: ECommonServerError.DATABASE_ERROR,
		promise: db
			.insertInto('consent')
			.values({
				app_version: appVersion,
				consent_type: consentType,
				source,
				status,
				user_email: userEmail,
				user_id: userId
			})
			.execute()
	});
	if (!insertResult.ok) {
		return insertResult;
	}

	return okResult(undefined);
}
