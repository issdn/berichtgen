import { IncuriaError, IncuriaErrorType, type Entry } from '$lib/types';
import OpenAI from 'openai';

export async function getCompletions({
	text,
	apiKey,
	systemPrompt = context_prompt,
	maxChunkSize = 15000
}: {
	text: string;
	apiKey: string;
	systemPrompt?: string;
	maxChunkSize?: number;
}) {
	return [
		{
			qualifikationen: ['Eine Qualifikation'],
			text: 'Mein Tag als Abababa',
			datum: '2025-3-24'
		}
	];

	const openai = new OpenAI({
		baseURL: 'https://api.deepseek.com',
		apiKey
	});

	const messages = splitByMaxLength(text, maxChunkSize);

	const completionsPromises = messages.map(async (t) => {
		const completion = await openai.chat.completions.create({
			messages: [
				{
					role: 'system',
					content: systemPrompt
				},
				{
					role: 'user',
					content: t
				}
			],
			model: 'deepseek-chat',
			response_format: { type: 'json_object' }
		});
		return completion.choices[0].message.content;
	});

	const completions = await Promise.allSettled(completionsPromises);

	const entries: Entry[] = [];

	completions.forEach((completion) => {
		if (completion.status === 'rejected') {
			throw new IncuriaError(IncuriaErrorType.INVALID_JSON_FROM_AI, completion.reason);
		}
		const completionValue = completion.value;
		if (completionValue == null) return;
		try {
			entries.push(...JSON.parse(completionValue).lessons);
		} catch {
			throw new IncuriaError(IncuriaErrorType.INVALID_JSON_FROM_AI, completionValue);
		}
	});

	return entries;
}

function splitByMaxLength(text: string, maxLength: number) {
	const regex = new RegExp(`.{1,${maxLength}}`, 'gs');
	return text.match(regex) || [];
}

const context_prompt = `
I will give you a raw text of records of lessons or a single lesson.
Lessons are chronologically sorted but they are not distinctively marked. You have to create a JSON list with each lesson as an object with a title and a summary in format that I'll specify below.
Each JSON Object in the array is STRICTLY a single LESSON so don't add or remove lessons. You can however group the text based on topic if you're sure that it fits.
NEVER include any dates or names or titles of people.
Everything the "lessons" key inside the JSON has to be in German language.
Anything inside <> is just a context for you.

Here's the list of qualifications that you'll need to use: [
    'Allgemeinbildende Fächer',
    'Arbeitsplätze nach Kundenwunsch ausstatten',
    'Benutzerschnittstellen gestalten und entwickeln',
    'Clients in Netzwerke einbinden',
    'Cyber-physische Systeme ergänzen',
    'Das Unternehmen und die eigene Rolle im Betrieb beschreiben',
    'Daten systemübergreifend bereitstellen',
    'Funktionalität in Anwendungen realisieren',
    'Kundenspezifische Anwendungsentwicklung durchführen',
    'Netzwerke und Dienste bereitstellen',
    'Schutzbedarfsanalyse im eigenen Arbeitsbereich durchführen',
    'Serviceanfragen bearbeiten',
    'Software zur Verwaltung von Daten anpassen,
]

Here's the json format (simple list of objects):
{
"lessons":[{
    "qualifikationen": [<INSIDE THIS LIST PUT FEW OF THE QUALIFICATIONS THAT BEST FIT THE TITLE >],
    "text": "<A ONE SENTENCE SUMMARY OF THE LESSON>"
}, ...]
}

Here's one example of what I want:
EXAMPLE INPUT TEXT:
LESSON 2
Unternehmen benötigen Arbeitskräfte, Betriebsmittel, Werkstoffe und Kapital.
Man unterscheidet drei Beschaffungsbereiche
Personalabteilung: Beschaffung von Arbeitskräften
Finanzabteilung: Beschaffung von finanziellen Mitteln
Einkaufsabteilung: Beschaffung von
•
•
•
•
•
•
•
Gütern der aperiodischen und einmaligen Bedarfs
Betriebsmittel (Maschinen, Anlage, Werkzeuge)
Dienstleistungen (Beratung, Outsourcing)
Gütern des periodischen und laufenden Bedarfs
Werkstoffen (Roh-, Hilfs- und Betriebsstoffe)
Einzelteile
Handelswaren
Dem Einkauf kommt im Unternehmen eine strategische Bedeutung zu.
Aufgaben des Einkaufs sind:
Marktanalyse
Lieferantenauswahl
Festlegung der Einkaufsstrategie wie z.B. Konsignationslager, Rahmenaufträge,
Just in time usw.
Dipl.-Kfm. Carsten Pohlmann - Wirtschaftstheorie
Folie 3

EXAMPLE JSON FROM YOU:
  {
"lessons": [
  {
    "qualifikationen": ["Allgemeinbildende Fächer"],
    "text": "Was ein Unternehmen braucht (Arbeitskräfte, Betriebsmittel, Werkstoffe und Kapital) und wie wird das beschaffen"
  },
  ...]
  }`;
