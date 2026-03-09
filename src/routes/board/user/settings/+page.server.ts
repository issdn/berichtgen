import { fail, message, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { error, redirect, type Actions } from '@sveltejs/kit';
import * as Sentry from '@sentry/sveltekit';
import { env } from '$env/dynamic/private';
import { env as pub } from '$env/dynamic/public';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '$src/lib/database.types';
import { userMetadataSchema } from '$src/lib/schemas';

export const load = async ({ parent, locals: { user, supabase } }) => {
	const { tokenCount } = await parent();
	const userMetadataForm = await superValidate(zod4(userMetadataSchema));

	// Load user metadata
	const { data: userMetadata, error: metadataError } = await supabase
		.from('userMetadata')
		.select('*')
		.eq('userId', user!.id)
		.single();

	if (metadataError && metadataError.code !== 'PGRST116') {
		Sentry.captureException(metadataError);
	}

	if (userMetadata) {
		userMetadataForm.data = {
			fullName: userMetadata.fullName ?? '',
			ausbildungsberuf: userMetadata.ausbildungsberuf ?? '',
			abteilung: userMetadata.abteilung ?? ''
		};
	}

	return {
		tokenCount,
		userMetadataForm,
		userMetadata
	};
};

export const actions: Actions = {
	removeAccount: async ({ locals: { user, supabase } }) => {
		const { error: signOutError } = await supabase.auth.signOut();
		if (signOutError) {
			return fail(406);
		}
		const {
			auth: { admin }
		} = createClient<Database>(pub.PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET);
		const { error: deleteUserError } = await admin.deleteUser(user!.id!);
		if (deleteUserError) {
			return fail(406);
		}
		throw redirect(303, '/');
	},
	updateMetadata: async ({ request, locals: { user, supabase } }) => {
		const form = await superValidate(request, zod4(userMetadataSchema));

		if (!form.valid) {
			return message(form, 'Daten sind ungültig.', { status: 400 });
		}

		const { error: upsertError } = await supabase.from('userMetadata').upsert(
			{
				userId: user!.id,
				fullName: form.data.fullName || null,
				ausbildungsberuf: form.data.ausbildungsberuf || null,
				abteilung: form.data.abteilung || null
			},
			{ onConflict: 'userId' }
		);

		if (upsertError) {
			Sentry.captureException(upsertError);
			return message(form, 'Fehler beim Speichern der Daten.', { status: 500 });
		}

		// Return the form with the saved data
		return message(form, 'Profildaten erfolgreich gespeichert!');
	}
};
