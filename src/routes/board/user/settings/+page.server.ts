import { profileNameSchema, userMetadataSchema } from '$core/settings/schemas';
import { BerichtgenError, ECommonServerError } from '$lib/errors';
import { tryResultAsync } from '$lib/result';
import { supabaseAdmin } from '$lib/server/admin';
import db from '$lib/server/db';
import * as Sentry from '@sentry/sveltekit';
import { type Actions, redirect } from '@sveltejs/kit';
import { fail, message, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';

export const load = async ({ locals: { user }, parent }) => {
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
			abteilung: userMetadata.abteilung ?? '',
			ausbildungsberuf: userMetadata.ausbildungsberuf ?? '',
			fullName: userMetadata.full_name ?? ''
		};
	}

	if (profile) {
		profileNameForm.data = { fullName: profile.full_name ?? '' };
	}

	return { profileNameForm, tokenCount, userMetadata, userMetadataForm };
};

export const actions: Actions = {
	removeAccount: async ({ locals: { supabase, user } }) => {
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
	updateMetadata: async ({ locals: { user }, request }) => {
		const form = await superValidate(request, zod4(userMetadataSchema));

		if (!form.valid) {
			return message(form, 'Daten sind ungültig.', { status: 400 });
		}

		const updateMetadataResult = await tryResultAsync(
			db
				.insertInto('user_metadata')
				.values({
					abteilung: form.data.abteilung || null,
					ausbildungsberuf: form.data.ausbildungsberuf || null,
					full_name: form.data.fullName || null,
					user_id: user!.id
				})
				.onConflict((oc) =>
					oc.column('user_id').doUpdateSet({
						abteilung: form.data.abteilung || null,
						ausbildungsberuf: form.data.ausbildungsberuf || null,
						full_name: form.data.fullName || null
					})
				)
				.execute(),
			BerichtgenError,
			ECommonServerError.DATABASE_ERROR
		);
		if (!updateMetadataResult.ok) {
			Sentry.captureException(updateMetadataResult.error);
			return message(form, 'Fehler beim Speichern der Daten.', { status: 500 });
		}

		return message(form, 'Profildaten erfolgreich gespeichert!');
	},
	updateProfile: async ({ locals: { user }, request }) => {
		const form = await superValidate(request, zod4(profileNameSchema));

		if (!form.valid) {
			return message(form, 'Daten sind ungültig.', { status: 400 });
		}

		const updateProfileResult = await tryResultAsync(
			db
				.updateTable('profile')
				.set({ full_name: form.data.fullName || null })
				.where('id', '=', user!.id)
				.execute(),
			BerichtgenError,
			ECommonServerError.DATABASE_ERROR
		);
		if (!updateProfileResult.ok) {
			Sentry.captureException(updateProfileResult.error);
			return message(form, 'Fehler beim Speichern.', { status: 500 });
		}

		return message(form, 'Profildaten erfolgreich gespeichert!');
	}
};
