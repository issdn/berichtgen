import { dev } from '$app/environment';
import { GOOGLE_AI_API_KEY } from '$env/static/private';
import { json, error } from '@sveltejs/kit';
import * as genai from '@google/genai';
import type { RequestHandler } from './$types';
import { runCompletion } from '$wizard/completion/gemini';
import {
	batchCompletionApiSchema,
	type BatchCompletionApiResponse
} from '$wizard/schemas';
import { DEFAULT_MODEL } from '$lib/constants';
import { env } from '$env/dynamic/private';

// ─── Handler ──────────────────────────────────────────────────────────────────

/**
 * `POST /board/dev/completion`
 *
 * Dev-only mirror of the production completion endpoint.
 * Skips token counting and balance deduction — useful for local testing.
 * Uses `GOOGLE_AI_API_KEY` directly (no Vertex AI service account required).
 *
 * Accepts and returns the same schema as `POST /board/user/completion`.
 */
export const POST: RequestHandler = async ({ request }) => {
	if (!dev) error(404, 'Not found');

	const body = await request.json();
	const parsed = batchCompletionApiSchema.safeParse(body);
	if (!parsed.success) error(400, 'Invalid request body');

	const ai = new genai.GoogleGenAI({ apiKey: GOOGLE_AI_API_KEY });

	const model = env.GEMINI_MODEL ?? DEFAULT_MODEL;

	const results = await Promise.allSettled(
		parsed.data.items.map((item) => runCompletion(item, ai, model))
	);

	return json({
		results: results.map((r) => (r.status === 'fulfilled' ? r.value : null)),
		insufficient_tokens: false
	} satisfies BatchCompletionApiResponse);
};
