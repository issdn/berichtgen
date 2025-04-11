import { db } from '$lib/server/db';
import { usersLLMProviders } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import OpenAI from 'openai';
import * as z from 'zod';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	const { user } = (await locals.auth())!;
	const body = await request.json();

	const schema = z.object({ text: z.string().nonempty(), provider: z.string().nonempty() });

	try {
		const { text, provider } = schema.parse(body);

		const query = await db
			.select()
			.from(usersLLMProviders)
			.where(
				and(eq(usersLLMProviders.userId, user!.id!), eq(usersLLMProviders.providerId, provider))
			)
			.limit(1);

		const token = query[0]?.token ?? 'sum token';

		return new Response(
			JSON.stringify({
				lessons: [
					{
						qualifikationen: ['Eine Qualifikation'],
						text: 'Mein Tag als Abababa',
						datum: '2025-3-24'
					}
				]
			})
		);

		const openai = new OpenAI({
			baseURL: 'https://api.deepseek.com',
			apiKey: token ?? env.DEEPSEEK
		});

		const completion = await openai.chat.completions.create({
			messages: [
				{
					role: 'system',
					content: context_prompt
				},
				{
					role: 'user',
					content: text
				}
			],
			model: 'deepseek-chat',
			response_format: { type: 'json_object' }
		});

		return new Response(completion.choices[0].message.content);
	} catch (e) {
		let message = '';
		if (e instanceof Error) {
			message = e.message;
		} else {
			message = 'Unbekannter Server-Fehler bei Umformulierung.';
		}
		return new Response(JSON.stringify({ message }), { status: 400 });
	}
};

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
