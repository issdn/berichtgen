import { BerichtgenError, errorByHttpCode, toErrorBody } from '$lib/errors';
import { tryResult, tryResultAsync } from '$lib/result';
import { svelteApiError } from '$server/errors';
import { EGenAIError, EWizardError } from '$wizard/errors';
import {
	type BatchCompletionItem,
	genaiCompletionSchema
} from '$wizard/schemas';
import { ApiError as GcsApiError } from '@google-cloud/storage';
import * as genai from '@google/genai';
import { ApiError as GenaiApiError } from '@google/genai';

import { getContextPrompt } from './prompt';

export async function countItemTokens(
	item: BatchCompletionItem,
	ai: genai.GoogleGenAI,
	model: string
): Promise<number> {
	const part = itemToContentPart(item);
	const result = await tryResultAsync({
		convertError: geminiApiErrorToApiError,
		promise: ai.models.countTokens({
			contents: [{ parts: [part] }],
			model
		})
	});

	if (!result.ok) throw svelteApiError(result.error.apiError);

	return result.data.totalTokens ?? 0;
}

function geminiApiErrorToApiError(e: unknown) {
	if (e instanceof GcsApiError) {
		const httpCode = e.code ?? 500;
		return new BerichtgenError({
			...(errorByHttpCode(EGenAIError, httpCode) ?? EGenAIError.INTERNAL),
			cause: JSON.parse(e.message).error.message
		});
	} else if (e instanceof GenaiApiError) {
		const httpCode = e.status ?? 500;
		return new BerichtgenError({
			...(errorByHttpCode(EGenAIError, httpCode) ?? EGenAIError.INTERNAL),
			cause: JSON.parse(e.message).error.message
		});
	}

	return new BerichtgenError({ ...toErrorBody(e), httpCode: 500 });
}

/** Maps a `BatchCompletionItem` to its Gemini content part. */
function itemToContentPart(item: BatchCompletionItem): genai.Part {
	if (item.type === 'inline')
		return { inlineData: { data: item.data, mimeType: item.mimeType } };
	if (item.type === 'url') return { text: `URL zu dem Text: ${item.url}` };
	return { fileData: { fileUri: item.fileUri, mimeType: item.mimeType } };
}

/**
 * Calls the Gemini API for a single completion item and parses the response.
 * URL items enable Google Search grounding so Gemini can fetch the page.
 * Returns `null` when the response cannot be parsed as a valid completion.
 */
export async function runCompletion(
	item: BatchCompletionItem,
	ai: genai.GoogleGenAI,
	model: string
) {
	const response = await ai.models.generateContent({
		config: {
			responseMimeType: 'application/json',
			responseSchema: genaiCompletionSchema.toJSONSchema(),
			systemInstruction: getContextPrompt(item.ort),
			...(item.type === 'url' ? { tools: [{ googleSearch: {} }] } : {})
		},
		contents: [{ parts: [itemToContentPart(item)], role: 'user' }],
		model
	});

	const parsed = tryResult({
		apiError: EWizardError.INVALID_JSON_FROM_AI,
		run: () => genaiCompletionSchema.parse(JSON.parse(response.text!))
	});

	if (!parsed.ok) throw parsed.error;

	return parsed.data;
}
