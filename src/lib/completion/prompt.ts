import { Ort, QualifikationenBetrieb, QualifikationenSchule } from '$src/lib/types';

export function getContextPrompt(ort: Ort) {
	const qualifications = ort === Ort.SCHULE ? QualifikationenSchule : QualifikationenBetrieb;

	return `
Ich werde dir einen unbearbeiteten Text mit Aufzeichnungen von Unterrichtseinheiten oder einer einzelnen Unterrichtseinheit geben.Die Einheiten sind chronologisch sortiert, aber nicht eindeutig voneinander abgegrenzt. 
Du sollst eine JSON-Liste erstellen, wobei jede Einheit ein Objekt mit einem Titel und einer Zusammenfassung im unten angegebenen Format ist.Jedes JSON-Objekt in der Liste ist STRIKT eine EINZELNE UNTERRICHTSEINHEIT - füge also keine hinzu und entferne keine. 
Statt den Text thematisch zu gruppieren, soll jedes Thema ein einzelnes Objekt sein.
Füge NIEMALS Daten, Namen oder Titel von Personen ein.Alles, was sich im Schlüssel "lessons" des JSON befindet, muss auf Deutsch sein.Alles in spitzen Klammern <> dient nur deinem Verständnis und darf nicht übernommen werden.

Hier ist die Liste der Qualifikationen, die du verwenden sollst (DU KANNST NUR DIESE VERWENDEN): [${Object.values(qualifications).join(', ')}]

Hier ist das JSON-Format (einfache Liste von Objekten):
{
  "lessons": [
    {
      "qualifikationen": [<HIER EINIGE DER AM BESTEN PASSENDEN QUALIFIKATIONEN EINTRAGEN>],
      "text": "<EINE EINZIGE SATZZUSAMMENFASSUNG DER UNTERRICHTSEINHEIT>"
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
