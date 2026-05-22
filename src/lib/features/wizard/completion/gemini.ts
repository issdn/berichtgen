import * as genai from '@google/genai';
import { getContextPrompt } from './prompt';
import { completionSchema, type BatchCompletionItem } from '$wizard/schemas';

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
): Promise<string[] | null> {
	const response = await ai.models.generateContent({
		model,
		config: {
			responseMimeType: 'application/json',
			systemInstruction: getContextPrompt(item.ort),
			responseSchema: completionSchema.toJSONSchema(),
			...(item.type === 'url' ? { tools: [{ googleSearch: {} }] } : {})
		},
		contents: [{ role: 'user', parts: [itemToContentPart(item)] }]
	});
	const parsed = completionSchema.safeParse(response.text);
	return parsed.success ? parsed.data : null;
}
