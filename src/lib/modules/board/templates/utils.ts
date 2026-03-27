import type { KyselyDatabase } from '$lib/schema';
import { berichtgenStore } from '$lib/stores/berichtgen.svelte';
import * as Sentry from '@sentry/sveltekit';
import type { Kysely } from 'kysely';
import { toast } from 'svelte-sonner';

export async function checkPreferredTemplate(db: Kysely<KyselyDatabase>) {
	const preferredPath = berichtgenStore.preferedTemplatePath;
	if (!preferredPath) return false;

	try {
		const template = await db
			.selectFrom('template')
			.selectAll()
			.where('storage_path', '=', preferredPath)
			.executeTakeFirst();

		// Template was deleted
		if (!template) {
			berichtgenStore.preferedTemplatePath = null;
			toast.info(
				'Deine bevorzugte Vorlage wurde gelöscht. Bitte wähle eine neue Vorlage aus.',
				{
					duration: Infinity,
					closeButton: true,
					dismissable: true
				}
			);
			return false;
		}
	} catch (error) {
		Sentry.captureException(error);
		return false;
	}

	return true;
}
