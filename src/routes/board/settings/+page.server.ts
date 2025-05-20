import { db } from '$lib/server/db';
import { usersLLMProviders } from '$lib/server/db/schema';
import { fail, message, superValidate } from 'sveltekit-superforms';
import type { PageServerLoad } from './$types';
import { providerDeleteSchema, providerSchema, validProviderSchema } from './schema';
import { zod } from 'sveltekit-superforms/adapters';
import { error, redirect, type Actions } from '@sveltejs/kit';
import { eq, and } from 'drizzle-orm';
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
	add: async ({ request, locals: { user } }) => {
		const form = await superValidate(request, zod(validProviderSchema));

		if (!form.valid) {
			return message(form, 'Daten sind falsch.', { status: 400 });
		}

		try {
			await db
				.insert(usersLLMProviders)
				.values({ token: form.data.token, providerId: form.data.id, userId: user!.id! })
				.onConflictDoUpdate({
					target: [usersLLMProviders.userId, usersLLMProviders.providerId],
					set: { token: form.data.token }
				})
				.returning({ id: usersLLMProviders.providerId, token: usersLLMProviders.token });
		} catch (e) {
			Sentry.captureException(e);
			return error(406, 'Fehler beim Speichern in die Datenbank.');
		}

		return message(form, `${form.data.name} Token hinzugefügt!`);
	},
	delete: async ({ request, locals: { user } }) => {
		const form = await superValidate(request, zod(providerDeleteSchema));

		if (!form.valid)
			return message(form, form.errors.id?.[0] ?? 'Daten sind falsch.', { status: 400 });

		try {
			await db
				.delete(usersLLMProviders)
				.where(
					and(
						eq(usersLLMProviders.providerId, form.data.id),
						eq(usersLLMProviders.userId, user!.id!)
					)
				);
			return message(form, `${form.data.name ?? ''} Token gelöscht!`);
		} catch (e) {
			Sentry.captureException(e);
			return error(406, 'Fehler beim Speichern in die Datenbank.');
		}
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
