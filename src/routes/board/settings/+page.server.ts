import { db } from '$lib/server/db';
import { llmProviders, usersLLMProviders } from '$lib/server/db/schema';
import { message, superValidate } from 'sveltekit-superforms';
import type { PageServerLoad } from './$types';
import { providerSchema } from './schema';
import { zod } from 'sveltekit-superforms/adapters';
import { error, type Actions } from '@sveltejs/kit';
import { eq, and } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	const session = await locals.auth();

	const providers = await db
		.select({
			id: llmProviders.id,
			name: llmProviders.name,
			price: llmProviders.price,
			token: usersLLMProviders.token
		})
		.from(llmProviders)
		.leftJoin(
			usersLLMProviders,
			and(
				eq(usersLLMProviders.userId, session!.user!.id!),
				eq(usersLLMProviders.providerId, llmProviders.id)
			)
		);
	return { providers };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const session = await locals.auth();
		const form = await superValidate(request, zod(providerSchema));

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
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
		} catch (_) {
			return error(406, 'Fehler beim Speichern in die Datenbank.');
		}

		return message(form, 'Gespeichert!');
	}
};
