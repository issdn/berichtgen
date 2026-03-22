import { Ort } from '$src/lib/enums';

// Maybe will do something with it
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getContextPrompt(ort: Ort) {
	const location = ort === Ort.SCHULE ? 'Unterrichten' : 'Arbeitstagen';

	return `
Ich werde dir einen unbearbeiteten Text mit Aufzeichnungen von ${location} oder einem einzelnen Unterricht geben. Die ${location} sind chronologisch sortiert, aber nicht eindeutig voneinander abgegrenzt.
Du sollst sie thematisch zusammenfassen und eine JSON-Liste erstellen. Das soll ein Protokoll davon sein, was in den ${location} behandelt wurde. 
Übernimmt also keine irrelevanten Details wie Zahlen oder Daten von imaginativen Unternehmen oder Personen aus den Aufgabenstellungen.
Es soll KEINE Füllwörter geben. Es sollen nur kurze, kompakte Sätze sein fast wie Stichpunkte, die das Thema ALLGEMEIN beschreiben.
Beispielsweise: "Buchführungspflicht beginnt im folgenden Geschäftsjahr nach Bekanntgabe der Finanzbehörde." ist schlecht, weil es beschreibt die Details dieses Themas und nicht was ich gelernt habe. 
Besser wäre: "Buchführungspflicht: Wann beginnt sie und unter welchen Voraussetzungen".
Der Text soll also die Frage "Was habe ich in diesem Unterricht/meinem Betrieb gelernt?" beantworten und nicht "Was genau steht in den Unterlagen?".
Nur wenn sich was wortwortlich wiederholt, sollst du bisschen mehr umformulieren.
Nutze immer Schlüsselwörter/Fachbegriffe sodass man implizit verstehen kann um welches Fach es geht.
Schlechtes Beispiel: "Beispiel: Eine Abteilung kann von wie vielen Personen geleitet werden?" - Was von Abteilung und worüber geht es hier? Maximal gesetzlich oder wirtschaftlich? Weiß man nicht um welches Fach geht es.
Jedes Thema ein einzelnes String der Array sein. Wenn es Aufgaben gibt, übernehme nur die Aufgabenstellung, nicht die Lösungen. 
Alles muss auf Deutsch sein.

Zum Format:
Jedes String in der Liste soll STRIKT eine EINZELNE UNTERRICHTSEINHEIT.
Alles in spitzen Klammern <> dient nur deinem Verständnis und darf nicht übernommen werden.

Hier ist das JSON-Format (einfache Liste von Strings):
  [
      "<EINE EINZIGE KURZE SATZZUSAMMENFASSUNG DER UNTERRICHTSEINHEIT>",
    ...
  ]

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

[
  "Was ein Unternehmen braucht (Arbeitskräfte, Betriebsmittel, Werkstoffe und Kapital) und wie wird das beschaffen",
  "Aufgaben des Einkaufs: Marktanalyse, Lieferantenauswahl, Festlegung der Einkaufsstrategie", ...
]
`;
}
