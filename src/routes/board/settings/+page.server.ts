import { db } from '$lib/server/db';
import { llmProviders } from '$lib/server/db/schema';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	return { providers: await db.select().from(llmProviders) };
};
