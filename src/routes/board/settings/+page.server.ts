import { db } from '$lib/server/db';
import { llmProviders, usersLLMProviders } from '$lib/server/db/schema';
import { message, superValidate } from 'sveltekit-superforms';
import type { PageServerLoad } from './$types';
import { providersSchema } from './schema';
import { zod } from 'sveltekit-superforms/adapters';
import { redirect, type Actions } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	const session = await locals.auth();

	if (session?.user?.id === null) redirect(307, '/');

	const providers = await db
		.select({
			id: llmProviders.id,
			name: llmProviders.name,
			price: llmProviders.price,
			token: usersLLMProviders.token
		})
		.from(llmProviders)
		.leftJoin(usersLLMProviders, eq(usersLLMProviders.providerId, session!.user!.id!));

	const form = await superValidate({ providers }, zod(providersSchema));

	return { form };
};

export const actions: Actions = {
	set: async ({ request }) => {
		const form = await superValidate(request, zod(providersSchema));

		if (!form.valid) {
			return message(form, 'Invalid ID for constellation.');
		}
	}
};
