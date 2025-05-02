import { db } from '$lib/server/db';
import { usersLLMProviders } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';
import { CommonServerErrorTypes, CompletionExceptionType } from '$lib/types';
import OpenAI from 'openai';
import * as z from 'zod';
import * as genai from '@google/genai';
import { err, ok, ResultAsync } from 'neverthrow';
import { CompletionException } from '$src/lib/errors';
import { countTokens } from '$src/lib/utils/token_counter';
import * as Sentry from '@sentry/node';
import { error as errorJson } from '@sveltejs/kit';

function getTokenByOwner(owner: string) {
	switch (owner) {
		case 'deepseek':
			return ok(env.DEEPSEEK);
		case 'google':
			return ok(env.GEMINI);
		default:
			return err(
				new CompletionException(
					'Dieses Modell ist nicht verfügbar',
					CompletionExceptionType.INVALID_TOKEN
				)
			);
	}
}

export const POST: RequestHandler = async ({ request, locals: { user, supabase } }) => {
	if (!user) {
		return errorJson(401, {
			type: CommonServerErrorTypes.UNAUTHORIZED,
			message: 'Nicht autorisiert'
		});
	}

	const body = await request.json();

	const schema = z.object({
		text: z.string().nonempty(),
		provider: z.string().nonempty(),
		owner: z.string().nonempty()
	});

	const parsed = schema.safeParse(body);

	if (!parsed.success) {
		return errorJson(400, {
			type: CommonServerErrorTypes.VALIDATION_ERROR,
			message: parsed.error.message
		});
	}

	const { text, provider, owner } = parsed.data;

	const { data, error } = await supabase.rpc('deduct_user_tokens', {
		user_id: user!.id,
		amount: countTokens(new Blob([text]))
	});

	if (error) {
		Sentry.captureException(error);
		return errorJson(500, {
			type: CommonServerErrorTypes.DATABASE_ERROR,
			message: 'Internet fehler.'
		});
	}

	if (!data) {
		errorJson(500, {
			type: CompletionExceptionType.NOT_ENOUGH_TOKENS,
			message: 'Nicht genug Tokens'
		});
	}

	const incuriaToken = getTokenByOwner(owner).mapErr((e) => e.toResponse());

	if (incuriaToken.isErr()) {
		return incuriaToken.error;
	}

	const query = await db
		.select()
		.from(usersLLMProviders)
		.where(and(eq(usersLLMProviders.userId, user!.id!), eq(usersLLMProviders.providerId, provider)))
		.limit(1);

	const token = query[0]?.token ?? incuriaToken.value;

	if (owner === 'deepseek') {
		const result = await ResultAsync.fromPromise(getOpenAICompletion(text, token), (e) =>
			CompletionException.fromUnknown(e)
		).mapErr((e) => e.toResponse());
		if (result.isErr()) {
			return result.error;
		}
		const completion = result.value;
		if (completion === undefined || completion === null) {
			return errorJson(500, {
				type: CompletionExceptionType.UNKNOWN_THIRD_PARTY_ERROR,
				message: 'Die API hat nichts zurückgegeben.'
			});
		}
		return new Response(completion);
		// owner === 'google'
	} else {
		const result = await ResultAsync.fromPromise(getGeminiCompletion(text, token), (e) =>
			CompletionException.fromUnknown(e)
		).mapErr((e) => e.toResponse());
		if (result.isErr()) {
			return result.error;
		}
		const completion = result.value;
		if (completion === undefined || completion === null) {
			return errorJson(500, {
				type: CompletionExceptionType.UNKNOWN_THIRD_PARTY_ERROR,
				message: 'Die API hat nichts zurückgegeben.'
			});
		}
		return new Response(completion);
	}
};

async function getOpenAICompletion(text: string, token: string) {
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
		response_format: {
			type: 'json_schema',
			json_schema: {
				name: 'incuria schema',
				schema: {
					lessons: {
						type: 'array',
						items: {
							type: 'object',
							properties: {
								qualifikationen: {
									type: 'array',
									items: { type: 'string' }
								},
								text: { type: 'string' }
							}
						}
					}
				}
			}
		}
	});

	return completion.choices[0].message.content;
}

async function getGeminiCompletion(
	text: string,
	token: string
): Promise<string | undefined | null> {
	const ai = new genai.GoogleGenAI({ apiKey: token ?? env.GEMINI });

	const completion = await ai.models.generateContent({
		config: {
			responseMimeType: 'application/json',
			systemInstruction: context_prompt,
			responseSchema: {
				type: genai.Type.OBJECT,
				properties: {
					lessons: {
						type: genai.Type.ARRAY,
						items: {
							type: genai.Type.OBJECT,
							properties: {
								text: {
									type: genai.Type.STRING
								},
								qualifikationen: {
									type: genai.Type.ARRAY,
									items: {
										type: genai.Type.STRING
									}
								}
							}
						}
					}
				}
			}
		},
		model: 'gemini-1.5-flash',
		contents: text
	});

	return completion.text;
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
