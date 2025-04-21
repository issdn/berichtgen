import { db } from '$lib/server/db';
import { usersLLMProviders } from '$lib/server/db/schema';
import { message, superValidate } from 'sveltekit-superforms';
import type { PageServerLoad } from './$types';
import { providerDeleteSchema, providerSchema, validProviderSchema } from './schema';
import { zod } from 'sveltekit-superforms/adapters';
import { error, type Actions } from '@sveltejs/kit';
import { eq, and } from 'drizzle-orm';
import { drizzleAdapter } from '$src/auth';

export const load: PageServerLoad = async () => {
	const form = await superValidate(zod(providerSchema));

	return { form };
};

export const actions: Actions = {
	add: async ({ request, locals }) => {
		const session = await locals.auth();
		const form = await superValidate(request, zod(validProviderSchema));

		if (!form.valid) {
			return message(form, 'Daten sind falsch.', { status: 400 });
		}

		try {
			await db
				.insert(usersLLMProviders)
				.values({ token: form.data.token, providerId: form.data.id, userId: session!.user!.id! })
				.onConflictDoUpdate({
					target: [usersLLMProviders.userId, usersLLMProviders.providerId],
					set: { token: form.data.token }
				})
				.returning({ id: usersLLMProviders.providerId, token: usersLLMProviders.token });
		} catch {
			return error(406, 'Fehler beim Speichern in die Datenbank.');
		}

		return message(form, `${form.data.name} Token hinzugefügt!`);
	},
	delete: async ({ request, locals }) => {
		const session = await locals.auth();
		const form = await superValidate(request, zod(providerDeleteSchema));

		if (!form.valid)
			return message(form, form.errors.id?.[0] ?? 'Daten sind falsch.', { status: 400 });

		try {
			await db
				.delete(usersLLMProviders)
				.where(
					and(
						eq(usersLLMProviders.providerId, form.data.id),
						eq(usersLLMProviders.userId, session!.user!.id!)
					)
				);
			return message(form, `${form.data.name ?? ''} Token gelöscht!`);
		} catch {
			return error(406, 'Fehler beim Speichern in die Datenbank.');
		}
	},
	removeAccount: async (event) => {
		const session = await event.locals.auth();
		try {
			await drizzleAdapter.deleteUser!(session!.user!.id!);
		} catch {
			return error(406, 'Fehler beim Löschen des Kontos.');
		}
	}
};
