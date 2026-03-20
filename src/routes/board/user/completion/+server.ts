import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';
import { Ort } from '$lib/enums';
import {
	ECommonServerError,
	ECompletionException,
	EGenAIError,
	errorByHttpCode,
	throwSvelteError
} from '$lib/errors';
// import OpenAI from 'openai';
import * as genai from '@google/genai';
import { err, ok, ResultAsync } from 'neverthrow';
import { countTokens } from '$src/lib/utils/token_counter';
import * as Sentry from '@sentry/sveltekit';
import { json } from '@sveltejs/kit';
import { getContextPrompt } from '$src/lib/completion/prompt';
import { completionApiSchema, completionSchema } from '$src/lib/schemas';
import { db } from '$lib/server/db';
import { sql } from 'kysely';

// API key from environment
const apiKey = env.GOOGLE_AI_API_KEY;

async function deductUserTokens(userId: string, text: string) {
	const amount = countTokens(new Blob([text]));

	try {
		const success = await db.transaction().execute(async (trx) => {
			const row = await trx
				.selectFrom('user_token_count')
				.select('tokens')
				.where('user_id', '=', userId)
				.forUpdate()
				.executeTakeFirst();

			if (!row || row.tokens < amount) return false;

			await trx
				.updateTable('user_token_count')
				.set({ tokens: sql`tokens - ${amount}` })
				.where('user_id', '=', userId)
				.execute();

			return true;
		});

		if (!success) return err(ECompletionException.NOT_ENOUGH_TOKENS);
	} catch (e) {
		Sentry.captureException(e, { extra: { user_id: userId, amount } });
		return err(ECompletionException.INTERNAL);
	}

	return ok(amount);
}

export const POST: RequestHandler = async ({ request, locals: { user } }) => {
	if (!user) {
		return throwSvelteError(ECommonServerError.UNAUTHORIZED);
	}

	if (!apiKey) {
		return throwSvelteError(ECompletionException.INTERNAL);
	}

	const body = await request.json();

	const parsed = completionApiSchema.safeParse(body);

	if (!parsed.success) {
		return throwSvelteError(ECommonServerError.VALIDATION_ERROR);
	}

	const { text, ort } = parsed.data;

	const result = await ResultAsync.fromPromise(
		getGeminiCompletion(text, apiKey, ort),
		(e) =>
			e instanceof genai.ApiError
				? (errorByHttpCode(EGenAIError, e.status) ??
					ECompletionException.UNKNOWN_THIRD_PARTY_ERROR)
				: ECompletionException.UNKNOWN_THIRD_PARTY_ERROR
	);

	if (result.isErr()) {
		return throwSvelteError(result.error);
	}

	const completion = result.value;
	if (completion === undefined || completion === null) {
		return throwSvelteError(ECompletionException.UNKNOWN_THIRD_PARTY_ERROR);
	}

	const tokensDeducted = await deductUserTokens(user!.id!, text);
	if (tokensDeducted.isErr()) {
		return throwSvelteError(tokensDeducted.error);
	}

	const outputDeduction = await deductUserTokens(user!.id!, completion);
	if (outputDeduction.isErr()) {
		return throwSvelteError(outputDeduction.error);
	}

	return json({
		completion,
		tokensUsed: tokensDeducted.value + outputDeduction.value
	});
};

async function getGeminiCompletion(
	text: string,
	apiKey: string,
	ort: Ort
): Promise<string | undefined | null> {
	const ai = new genai.GoogleGenAI({ apiKey });

	const completion = await ai.models.generateContent({
		config: {
			responseMimeType: 'application/json',
			systemInstruction: getContextPrompt(ort),
			responseSchema: completionSchema.toJSONSchema()
		},
		// Using Gemini 2.0 Flash Lite - smaller, faster model
		model: 'gemini-2.0-flash-lite',
		contents: text
	});

	return completion.text;
}

/*
// OpenAI/DeepSeek completion - commented out
async function getOpenAICompletion(text: string, token: string, ort: Ort) {
	const openai = new OpenAI({
		baseURL: 'https://api.deepseek.com',
		apiKey: token
	});

	const completion = await openai.chat.completions.create({
		messages: [
			{
				role: 'system',
				content: getContextPrompt(ort)
			},
			{
				role: 'user',
				content: text
			}
		],
		model: 'deepseek-chat',
		response_format: {
			type: 'json_object'
		}
	});

	return completion.choices[0].message.content;
}
*/
