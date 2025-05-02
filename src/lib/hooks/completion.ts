import { incuriaStore } from '$lib/stores/board.svelte';
import { IncuriaErrorType, type Entry } from '$lib/types';
import { IncuriaError } from '$src/lib/errors';
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
			body: JSON.stringify({
				text: t,
				provider: incuriaStore.currentProvider.id,
				owner: incuriaStore.currentProvider.owner
			}),
			method: 'POST'
		});

		const data = await result.json();

		if (result.status >= 400)
			throw new IncuriaError(IncuriaErrorType.INVALID_JSON_FROM_AI, data.message);
		const parsed = completionSchema.safeParse(data);
		if (!parsed.success) {
			throw new IncuriaError(IncuriaErrorType.INVALID_JSON_FROM_AI, parsed.error.message);
		}
		return parsed.data;
	});

	const allCompletionsResult = ResultAsync.fromPromise(Promise.all(completionsPromises), (e) =>
		IncuriaError.fromUnknown(
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
