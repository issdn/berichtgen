import { fail, message, superValidate } from 'sveltekit-superforms';
import type { PageServerLoad } from './$types';
import { providerDeleteSchema, providerSchema, validProviderSchema } from './schema';
import { zod } from 'sveltekit-superforms/adapters';
import { error, redirect, type Actions } from '@sveltejs/kit';
import * as Sentry from '@sentry/node';
import { env } from '$env/dynamic/private';
import { env as pub } from '$env/dynamic/public';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '$src/lib/database.types';

export const load: PageServerLoad = async () => {
	const form = await superValidate(zod(providerSchema));

	return { form };
};

export const actions: Actions = {
	add: async ({ request, locals: { user, supabase } }) => {
		const form = await superValidate(request, zod(validProviderSchema));

		if (!form.valid) {
			return message(form, 'Daten sind falsch.', { status: 400 });
		}

		const { error: upsertError } = await supabase
			.from('userLLMProvider')
			.upsert(
				{
					token: form.data.token,
					providerId: form.data.id,
					userId: user!.id!
				},
				{ onConflict: 'userId, providerId' }
			)
			.select('providerId, token')
			.single();

		if (upsertError) {
			Sentry.captureException(upsertError);
			return error(406, 'Fehler beim Speichern in die Datenbank.');
		}

		return message(form, `${form.data.name} Token hinzugefügt!`);
	},
	delete: async ({ request, locals: { user, supabase } }) => {
		const form = await superValidate(request, zod(providerDeleteSchema));

		if (!form.valid)
			return message(form, form.errors.id?.[0] ?? 'Daten sind falsch.', { status: 400 });

		const { error: deleteError } = await supabase
			.from('userLLMProvider')
			.delete()
			.eq('providerId', form.data.id)
			.eq('userId', user!.id!);

		if (deleteError) {
			Sentry.captureException(deleteError);
			return error(406, 'Fehler beim Speichern in die Datenbank.');
		}

		return message(form, `${form.data.name ?? ''} Token gelöscht!`);
	},
	removeAccount: async ({ locals: { user, supabase } }) => {
		const { error: signOutError } = await supabase.auth.signOut();
		if (signOutError) {
			return fail(406);
		}
		const {
			auth: { admin }
		} = createClient<Database>(pub.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
		const { error: deleteUserError } = await admin.deleteUser(user!.id!);
		if (deleteUserError) {
			return fail(406);
		}
		throw redirect(303, '/');
	}
};
