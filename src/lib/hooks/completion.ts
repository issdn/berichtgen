import { parseUnknownError } from '$lib/hooks/utils';
import { incuriaStore } from '$lib/stores/board.svelte';
import { IncuriaError, IncuriaErrorType, type Entry } from '$lib/types';
import { ResultAsync } from 'neverthrow';
import * as z from 'zod';

const completionSchema = z.object({
	lessons: z
		.object({
			qualifikationen: z.string().array(),
			text: z.string()
		})
		.array()
});

export function getCompletions(text: string) {
	const messages = splitByMaxLength(text, 15000);

	const completionsPromises = messages.map(async (t) => {
		const result = await fetch('/board/completion', {
			body: JSON.stringify({ text: t, provider: incuriaStore.currentProvider.id }),
			method: 'POST'
		});

		const data = await result.json();

		if (result.status >= 400)
			throw new IncuriaError(IncuriaErrorType.INVALID_JSON_FROM_AI, data.message);
		return completionSchema.parse(data);
	});

	const allCompletionsResult = ResultAsync.fromPromise(Promise.all(completionsPromises), (e) =>
		parseUnknownError(
			e,
			'Fehler beim Abrufen der Vervollständigung',
			IncuriaErrorType.INVALID_JSON_FROM_AI
		)
	);

	return allCompletionsResult.map((completions) =>
		completions.reduce((prev, next) => [...prev, ...next.lessons], [] as Entry[])
	);
}

function splitByMaxLength(text: string, maxLength: number) {
	const regex = new RegExp(`.{1,${maxLength}}`, 'gs');
	return text.match(regex) || [];
}
