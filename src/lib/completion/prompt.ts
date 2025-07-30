import { QualifikationenBetrieb, QualifikationenSchule } from '$src/lib/constants';
import { Ort } from '$src/lib/enums';

export function getContextPrompt(ort: Ort) {
	const qualifications = ort === Ort.SCHULE ? QualifikationenSchule : QualifikationenBetrieb;

	return `
Ich werde dir einen unbearbeiteten Text mit Aufzeichnungen von Unterrichten oder einem einzelnen Unterricht geben. Die Unterrichten sind chronologisch sortiert, aber nicht eindeutig voneinander abgegrenzt.
Du sollst sie thematisch zusammenfassen und eine JSON-Liste erstellen. Das soll ein Protokoll davon sein, was in den Unterrichten behandelt wurde. 
Übernimmt also keine irrelevanten Details wie Zahlen oder Daten von imaginativen Unternehmen oder Personen aus den Aufgabenstellungen.
Es soll KEINE Füllwörter geben. Es sollen nur kurze, kompakte Sätze sein fast wie Stichpunkte, die das Thema ALLGEMEIN beschreiben.
Beispielsweise: "Buchführungspflicht beginnt im folgenden Geschäftsjahr nach Bekanntgabe der Finanzbehörde." ist schlecht, weil es beschreibt die Details dieses Themas und nicht was ich gelernt habe. 
Besser wäre: "Buchführungspflicht: Wann beginnt sie und unter welchen Voraussetzungen".
Der Text soll also die Frage "Was habe ich in diesem Unterricht gelernt?" beantworten und nicht "Was genau steht in den Unterlagen?".
Nur wenn sich was wortwortlich wiederholt, sollst du bisschen mehr umformulieren.
Nutze immer Schlüsselwörter/Fachbegriffe sodass man implizit verstehen kann um welches Fach es geht.
Schlechtes Beispiel: "Beispiel: Eine Abteilung kann von wie vielen Personen geleitet werden?" - Was von Abteilung und worüber geht es hier? Maximal gesetzlich oder wirtschaftlich? Weiß man nicht um welches Fach geht es.

Zum Format:
Jedes JSON-Objekt in der Liste soll STRIKT eine EINZELNE UNTERRICHTSEINHEIT.
Jedes Thema ein einzelnes Objekt sein. Wenn es Aufgaben gibt, übernehme nur die Aufgabenstellung, nicht die Lösungen. 
Alles, was sich im Schlüssel "lessons" des JSON befindet, muss auf Deutsch sein. Alles in spitzen Klammern <> dient nur deinem Verständnis und darf nicht übernommen werden.


Hier ist die Liste der Qualifikationen, die du verwenden sollst (DU KANNST NUR DIESE VERWENDEN): [${Object.values(qualifications).join(', ')}]

Hier ist das JSON-Format (einfache Liste von Objekten):
{
  "lessons": [
    {
      "qualifikationen": [<HIER EINIGE DER AM BESTEN PASSENDEN QUALIFIKATIONEN EINTRAGEN>],
      "text": "<EINE EINZIGE KURZE SATZZUSAMMENFASSUNG DER UNTERRICHTSEINHEIT>"
    },
    ...
  ]
}

Hier ist ein Beispiel für das gewünschte Format:

BEISPIEL-EINGABETEXT:
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

BEISPIEL AUSGABE-JSON VON DIR:
  {
"lessons": [
  {
    "qualifikationen": ["Allgemeinbildende Fächer"],
    "text": "Was ein Unternehmen braucht (Arbeitskräfte, Betriebsmittel, Werkstoffe und Kapital) und wie wird das beschaffen"
  },
  {
    "qualifikationen": ["Allgemeinbildende Fächer"],
    "text": "Aufgaben des Einkaufs: Marktanalyse, Lieferantenauswahl, Festlegung der Einkaufsstrategie"
  },
  ...]
  }`;
}
