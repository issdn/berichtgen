import { profileNameSchema, userMetadataSchema } from '$core/settings/schemas';
import { ECommonServerError } from '$lib/errors';
import { tryResultAsync } from '$lib/result';
import { supabaseAdmin } from '$lib/server/admin';
import db from '$lib/server/db';
import * as Sentry from '@sentry/sveltekit';
import { type Actions, redirect } from '@sveltejs/kit';
import { fail, message, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';

export const load = async ({ locals: { user }, parent }) => {
	const { tokenCount } = await parent();

	const [userMetadataForm, profileNameForm, row] = await Promise.all([
		superValidate(zod4(userMetadataSchema)),
		superValidate(zod4(profileNameSchema)),
		db
			.selectFrom('profile')
			.leftJoin('user_metadata', 'user_metadata.user_id', 'profile.id')
			.select([
				'profile.full_name',
				'user_metadata.abteilung',
				'user_metadata.ausbildungsberuf',
				'user_metadata.full_name as user_metadata_full_name',
				'user_metadata.user_id'
			])
			.where('profile.id', '=', user!.id)
			.executeTakeFirst()
	]);

	const userMetadata = row?.user_id
		? {
				abteilung: row.abteilung,
				ausbildungsberuf: row.ausbildungsberuf,
				full_name: row.user_metadata_full_name,
				user_id: row.user_id
			}
		: null;

	if (userMetadata) {
		userMetadataForm.data = {
			abteilung: userMetadata.abteilung ?? '',
			ausbildungsberuf: userMetadata.ausbildungsberuf ?? '',
			fullName: userMetadata.full_name ?? ''
		};
	}

	if (row) {
		profileNameForm.data = {
			fullName: row.full_name ?? ''
		};
	}

	return { profileNameForm, tokenCount, userMetadata, userMetadataForm };
};

export const actions: Actions = {
	removeAccount: async ({ locals: { supabase, user } }) => {
		const templatePathsResult = await tryResultAsync({
			apiError: ECommonServerError.DATABASE_ERROR,
			promise: db
				.selectFrom('template')
				.select('storage_path')
				.where('user_id', '=', user!.id)
				.execute()
		});
		if (!templatePathsResult.ok) {
			Sentry.captureException(templatePathsResult.error);
			return fail(500);
		}

		const templatePaths = templatePathsResult.data.map(
			(template) => template.storage_path
		);
		if (templatePaths.length > 0) {
			const { error: removeTemplatesError } = await supabaseAdmin.storage
				.from('templates')
				.remove(templatePaths);
			if (removeTemplatesError) {
				Sentry.captureException(removeTemplatesError);
				return fail(500);
			}
		}

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

		const updateMetadataResult = await tryResultAsync({
			apiError: ECommonServerError.DATABASE_ERROR,
			promise: db
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
				.execute()
		});
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

		const updateProfileResult = await tryResultAsync({
			apiError: ECommonServerError.DATABASE_ERROR,
			promise: db
				.updateTable('profile')
				.set({ full_name: form.data.fullName || null })
				.where('id', '=', user!.id)
				.execute()
		});
		if (!updateProfileResult.ok) {
			Sentry.captureException(updateProfileResult.error);
			return message(form, 'Fehler beim Speichern.', { status: 500 });
		}

		return message(form, 'Profildaten erfolgreich gespeichert!');
	}
};
