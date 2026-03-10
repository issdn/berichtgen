import { toast } from 'svelte-sonner';
import * as Sentry from '@sentry/sveltekit';
import { berichtgenStore } from '$src/lib/stores/berichtgen.svelte';

export async function checkPreferredTemplate(supabase: App.Locals['supabase']) {
	const preferredPath = berichtgenStore.preferedTemplatePath;
	if (!preferredPath) return false;

	const { data: template, error } = await supabase
		.from('template')
		.select('storage_path')
		.eq('storage_path', preferredPath)
		.maybeSingle();

	if (error) {
		Sentry.captureException(error);
		return false;
	}

	// Template was deleted
	if (!template) {
		berichtgenStore.preferedTemplatePath = null;
		toast.info('Deine bevorzugte Vorlage wurde gelöscht. Bitte wähle eine neue Vorlage aus.', {
			duration: Infinity,
			closeButton: true,
			dismissable: true
		});
		return false;
	}

	return true;
}
