import { fail, message, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { redirect, type Actions } from '@sveltejs/kit';
import * as Sentry from '@sentry/sveltekit';
import { supabaseAdmin } from '$lib/server/admin';
import db from '$lib/server/db';
import { profileNameSchema, userMetadataSchema } from '$settings/schemas';

export const load = async ({ parent, locals: { user } }) => {
	const { tokenCount } = await parent();

	const [userMetadataForm, profileNameForm, userMetadata, profile] =
		await Promise.all([
			superValidate(zod4(userMetadataSchema)),
			superValidate(zod4(profileNameSchema)),
			db
				.selectFrom('user_metadata')
				.selectAll()
				.where('user_id', '=', user!.id)
				.executeTakeFirst() ?? null,
			db
				.selectFrom('profile')
				.select('full_name')
				.where('id', '=', user!.id)
				.executeTakeFirst() ?? null
		]);

	if (userMetadata) {
		userMetadataForm.data = {
			fullName: userMetadata.full_name ?? '',
			ausbildungsberuf: userMetadata.ausbildungsberuf ?? '',
			abteilung: userMetadata.abteilung ?? ''
		};
	}

	if (profile) {
		profileNameForm.data = { fullName: profile.full_name ?? '' };
	}

	return { tokenCount, userMetadataForm, profileNameForm, userMetadata };
};

export const actions: Actions = {
	removeAccount: async ({ locals: { user, supabase } }) => {
		const { error: signOutError } = await supabase.auth.signOut();
		if (signOutError) {
			return fail(406);
		}
		const { error: deleteUserError } =
			await supabaseAdmin.auth.admin.deleteUser(user!.id!);
		if (deleteUserError) {
			return fail(406);
		}
		throw redirect(303, '/');
	},
	updateProfile: async ({ request, locals: { user } }) => {
		const form = await superValidate(request, zod4(profileNameSchema));

		if (!form.valid) {
			return message(form, 'Daten sind ungültig.', { status: 400 });
		}

		try {
			await db
				.updateTable('profile')
				.set({ full_name: form.data.fullName || null })
				.where('id', '=', user!.id)
				.execute();
		} catch (e) {
			Sentry.captureException(e);
			return message(form, 'Fehler beim Speichern.', { status: 500 });
		}

		return message(form, 'Profildaten erfolgreich gespeichert!');
	},
	updateMetadata: async ({ request, locals: { user } }) => {
		const form = await superValidate(request, zod4(userMetadataSchema));

		if (!form.valid) {
			return message(form, 'Daten sind ungültig.', { status: 400 });
		}

		try {
			await db
				.insertInto('user_metadata')
				.values({
					user_id: user!.id,
					full_name: form.data.fullName || null,
					ausbildungsberuf: form.data.ausbildungsberuf || null,
					abteilung: form.data.abteilung || null
				})
				.onConflict((oc) =>
					oc.column('user_id').doUpdateSet({
						full_name: form.data.fullName || null,
						ausbildungsberuf: form.data.ausbildungsberuf || null,
						abteilung: form.data.abteilung || null
					})
				)
				.execute();
		} catch (e) {
			Sentry.captureException(e);
			return message(form, 'Fehler beim Speichern der Daten.', { status: 500 });
		}

		return message(form, 'Profildaten erfolgreich gespeichert!');
	}
};
