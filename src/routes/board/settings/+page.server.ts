import { db } from '$lib/server/db';
import { llmProviders, usersLLMProviders } from '$lib/server/db/schema';
import { message, superValidate } from 'sveltekit-superforms';
import type { PageServerLoad } from './$types';
import { providerDeleteSchema, providerSchema } from './schema';
import { zod } from 'sveltekit-superforms/adapters';
import { error, type Actions } from '@sveltejs/kit';
import { eq, and } from 'drizzle-orm';

function hideToken(
	str: string,
	visibleStart: number = 4,
	visibleEnd: number = 2,
	maskChar: string = '*'
): string {
	if (str.length <= visibleStart + visibleEnd) {
		return str;
	}

	const maskedLength = str.length - visibleStart - visibleEnd;
	const maskedPart = maskChar.repeat(maskedLength);

	return str.slice(0, visibleStart) + maskedPart + str.slice(str.length - visibleEnd);
}

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

	const providersHiddenTokens = providers.map((provider) => {
		if (provider.token != null) {
			provider.token = hideToken(provider.token);
		}
		return provider;
	});

	const form = await superValidate(zod(providerSchema));

	return { form, providers: providersHiddenTokens };
};

export const actions: Actions = {
	add: async ({ request, locals }) => {
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
		} catch {
			return error(406, 'Fehler beim Speichern in die Datenbank.');
		}

		return message(form, `${form.data.name ?? ''} Token gelöscht!`);
	}
};
