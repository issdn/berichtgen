import { type CompletionResult } from '$lib/types';
import { ***REMOVED***Error } from '$src/lib/errors';
import { ResultAsync } from 'neverthrow';
import { type Ort } from '$src/lib/enums';
import { PUBLIC_COMPLETION_MAX_CHARACTERS } from '$env/static/public';
import { dev } from '$app/environment';

if (!PUBLIC_COMPLETION_MAX_CHARACTERS) {
	if (!dev) throw new Error('PUBLIC_COMPLETION_MAX_CHARACTERS is not set');
	console.warn(
		'[dev] PUBLIC_COMPLETION_MAX_CHARACTERS not set, defaulting to 3500000'
	);
}

const MAX_CHARACTERS = Number(PUBLIC_COMPLETION_MAX_CHARACTERS) || 3500000;

export function getCompletions(text: string, ort: Ort) {
	const messages = splitByMaxLength(text, MAX_CHARACTERS);

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
			throw new ***REMOVED***Error('INVALID_JSON_FROM_AI', data.message);

		return data as string[];
	});

	const allCompletionsResult = ResultAsync.fromPromise(
		Promise.all(completionsPromises),
		(e) =>
			***REMOVED***Error.fromUnknown(
				e,
				'Fehler beim Abrufen der Vervollständigung',
				'INVALID_JSON_FROM_AI'
			)
	);

	return allCompletionsResult.map((results) => {
		const entries = results.reduce(
			(prev, next) => [...prev, ...next.map((text) => ({ text }))],
			[] as CompletionResult
		);

		return entries;
	});
}

function splitByMaxLength(text: string, maxCharacters: number) {
	const regex = new RegExp(`.{1,${maxCharacters}}`, 'gs');
	return text.match(regex) || [];
}
