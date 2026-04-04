/**
 * Remote function transport shell for wizard operations.
 *
 * This file is intentionally thin — it only handles:
 *   1. Input schema validation (via zod)
 *   2. Delegating to the pure business-logic functions in `handlers/wizard`
 *
 * All actual logic lives in `handlers/wizard.ts` so it can be unit-tested
 * without the remote-function transport layer.
 */

import { query } from '$app/server';
import { checkPreferredTemplateExists } from '$wizard/api/handlers/wizard';
import * as z from 'zod';

/**
 * Checks whether the user's preferred template still exists in the database.
 * No authentication required — the storage path is not sensitive.
 *
 * @param storagePath - The Supabase Storage path to look up.
 * @returns `{ exists: boolean }`
 */
export const checkPreferredTemplate = query(
	z.object({ storagePath: z.string().min(1) }),
	async ({ storagePath }) => {
		const exists = await checkPreferredTemplateExists(storagePath);
		return { exists };
	}
);
