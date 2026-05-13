/**
 * Pure business-logic handlers for wizard server operations.
 *
 * This module is intentionally side-effect-free with respect to UI — no toasts,
 * no store mutations. All presentation concerns live in the calling component.
 *
 * `wizard.remote.ts` is the thin transport shell that wires these functions
 * into SvelteKit remote functions.
 */

import db from '$lib/server/db';
import * as Sentry from '@sentry/sveltekit';
import { BerichtgenError, ECommonServerError } from '$lib/errors';
import { tryResultAsync } from '$lib/result';

/**
 * Checks whether a template with the given storage path still exists in the database.
 *
 * @param storagePath - The Supabase Storage path of the template file.
 * @returns `true` if the template record exists, `false` otherwise (including on error).
 */
export async function checkPreferredTemplateExists(
	storagePath: string
): Promise<boolean> {
	const templateResult = await tryResultAsync(
		db
			.selectFrom('template')
			.select('storage_path')
			.where('storage_path', '=', storagePath)
			.executeTakeFirst(),
		BerichtgenError,
		ECommonServerError.DATABASE_ERROR
	);
	if (!templateResult.ok) {
		Sentry.captureException(templateResult.error);
		return false;
	}
	return templateResult.data !== undefined;
}
