import { type BatchCompletionItem, completionSchema } from '$wizard/schemas';
import * as genai from '@google/genai';

import { getContextPrompt } from './prompt';

/** Maps a `BatchCompletionItem` to its Gemini content part. */
export function itemToContentPart(item: BatchCompletionItem): genai.Part {
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
): Promise<null | string[]> {
	const response = await ai.models.generateContent({
		config: {
			responseMimeType: 'application/json',
			responseSchema: completionSchema.toJSONSchema(),
			systemInstruction: getContextPrompt(item.ort),
			...(item.type === 'url' ? { tools: [{ googleSearch: {} }] } : {})
		},
		contents: [{ parts: [itemToContentPart(item)], role: 'user' }],
		model
	});
	const parsed = completionSchema.safeParse(response.text);
	return parsed.success ? parsed.data : null;
}
