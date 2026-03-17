import { query } from '$app/server';
import { getRequestEvent } from '$app/server';
import { z } from 'zod';
import { ECommonServerError, throwSvelteError } from '../errors';

const argsSchema = z.object({
	limit: z.number().int().min(1).max(100),
	search: z.string()
});

export const getTemplates = query(argsSchema, async ({ limit, search }) => {
	const {
		locals: { supabase }
	} = getRequestEvent();

	let q = supabase
		.from('template')
		.select('*, template_report(id, status), profile(*)', {
			count: 'estimated'
		})
		.order('created_at', { ascending: false })
		.order('updated_at', { ascending: false })
		.limit(limit);

	if (search) {
		q = q.ilike('storage_path', `%/%${search}%.docx`);
	}

	const { data, error, count } = await q;
	if (error)
		return throwSvelteError(ECommonServerError.INTERNAL_ERROR, error.message);

	const hasMore = data.length < (count ?? 0);

	return { templates: data, hasMore };
});
