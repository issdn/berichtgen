import { type CompletionResult, type Entry } from '$lib/types';
import { ***REMOVED***Error } from '$src/lib/errors';
import { completionSchema } from '$src/lib/schemas';
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

		const parsed = completionSchema.safeParse(JSON.parse(data.completion));
		if (!parsed.success) {
			throw new ***REMOVED***Error(
				'INVALID_JSON_FROM_AI',
				'KI hat ungültige JSON-Antwort geliefert'
			);
		}

		return { completion: parsed.data, tokensUsed: data.tokensUsed as number };
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

	return allCompletionsResult.map((results): CompletionResult => {
		const entries = results.reduce(
			(prev, next) => [...prev, ...next.completion.map((text) => ({ text }))],
			[] as Entry[]
		);
		// Use the last token count (all should be the same after each deduction)
		const tokensUsed = results.at(-1)?.tokensUsed ?? 0;
		return { entries, tokensUsed };
	});
}

function splitByMaxLength(text: string, maxCharacters: number) {
	const regex = new RegExp(`.{1,${maxCharacters}}`, 'gs');
	return text.match(regex) || [];
}
