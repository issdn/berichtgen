import { type Entry } from '$lib/types';
import { ***REMOVED***Error } from '$src/lib/errors';
import { completionSchema } from '$src/lib/schemas';
import { ResultAsync } from 'neverthrow';
import { ***REMOVED***ErrorType, type Ort } from '$src/lib/enums';

// Hardcoded max tokens - should match the server's configuration
const MAX_TOKENS = 60000;

export function getCompletions(text: string, ort: Ort) {
	const messages = splitByMaxLength(text, MAX_TOKENS);
	const completionsPromises = messages.map(async (t) => {
		const result = await fetch('/board/user/completion', {
			body: JSON.stringify({
				text: t,
				ort
			}),
			method: 'POST'
		});

		const data = await result.json();

		if (result.status >= 400)
			throw new ***REMOVED***Error(***REMOVED***ErrorType.INVALID_JSON_FROM_AI, data.message);
		const parsed = completionSchema.safeParse(data);
		if (!parsed.success) {
			throw new ***REMOVED***Error(
				***REMOVED***ErrorType.INVALID_JSON_FROM_AI,
				'KI hat unguiltige JSON-Antwort geliefert'
			);
		}
		return parsed.data;
	});

	const allCompletionsResult = ResultAsync.fromPromise(Promise.all(completionsPromises), (e) =>
		***REMOVED***Error.fromUnknown(
			e,
			'Fehler beim Abrufen der Vervollständigung',
			***REMOVED***ErrorType.INVALID_JSON_FROM_AI
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
