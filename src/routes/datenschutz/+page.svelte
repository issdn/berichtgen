<script lang="ts">
	import * as Accordion from '$lib/components/ui/accordion/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
</script>

<main class="flex flex-col gap-y-6 px-12 pb-16">
	<section class="space-y-2">
		<h1 class="text-2xl font-semibold">Datenschutzerklärung</h1>
		<p><strong>Karol Bielski Software - berichtgen.de</strong></p>
		<p>
			In dieser Datenschutzerklärung wird transparent dargestellt, welche
			personenbezogenen Daten bei der Nutzung von berichtgen.de verarbeitet
			werden, zu welchen Zwecken die Verarbeitung erfolgt und welche Rechte
			Ihnen in Bezug auf diese Daten zustehen.
		</p>
	</section>

	<Accordion.Root
		type="multiple"
		class="w-full rounded-md border px-4"
		value={['point-1']}
	>
		<Accordion.Item value="point-1">
			<Accordion.Trigger>1. Verantwortlicher</Accordion.Trigger>
			<Accordion.Content class="space-y-2">
				<p>
					Verantwortlicher im Sinne der Datenschutz-Grundverordnung (DSGVO) ist:<br
					/>
					Karol Bielski<br />
					Auf der Lieth 174<br />
					33100 Paderborn, Deutschland<br />
					E-Mail:
					<a href="mailto:contact@karolbielski.com">contact@karolbielski.com</a>
				</p>
			</Accordion.Content>
		</Accordion.Item>

		<Accordion.Item value="point-2">
			<Accordion.Trigger>2. Welche Daten verarbeitet werden</Accordion.Trigger>
			<Accordion.Content class="space-y-4">
				<p>
					Beim Besuch der Website und bei der Nutzung der Anwendung werden
					insbesondere die folgenden personenbezogenen Daten verarbeitet:
				</p>
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Datenkategorie</Table.Head>
							<Table.Head>Verarbeitete Daten</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						<Table.Row>
							<Table.Cell>Anmeldung per Magic Link</Table.Cell>
							<Table.Cell>Ihre E-Mail-Adresse</Table.Cell>
						</Table.Row>
						<Table.Row>
							<Table.Cell>Google-Login (optional)</Table.Cell>
							<Table.Cell>
								Von Google über Supabase Auth bereitgestellte Profildaten,
								insbesondere E-Mail-Adresse, Name und Profilbild
							</Table.Cell>
						</Table.Row>
						<Table.Row>
							<Table.Cell>Konten- und Sitzungsdaten</Table.Cell>
							<Table.Cell>
								Authentifizierungsdaten, Session-Informationen und
								sicherheitsrelevante Login-Informationen
							</Table.Cell>
						</Table.Row>
						<Table.Row>
							<Table.Cell>Profil- und Einstellungsdaten</Table.Cell>
							<Table.Cell>
								Profilangaben wie Name und Profilbild sowie optionale Angaben
								wie Ausbildungsberuf, Abteilung, bevorzugte Vorlage und sonstige
								von Ihnen gewählte Anwendungseinstellungen
							</Table.Cell>
						</Table.Row>
						<Table.Row>
							<Table.Cell>Zahlungsdaten</Table.Cell>
							<Table.Cell>
								Transaktions- und Zahlungsinformationen, soweit kostenpflichtige
								Funktionen genutzt werden
							</Table.Cell>
						</Table.Row>
						<Table.Row>
							<Table.Cell>Vorlagen- und Freigabedaten</Table.Cell>
							<Table.Cell>
								Hochgeladene Vorlagen, Dateinamen, Freigabestatus als
								öffentliche Vorlage sowie Meldungen zu Vorlagen einschließlich
								optionaler Nachrichten
							</Table.Cell>
						</Table.Row>
						<Table.Row>
							<Table.Cell>Feedbackdaten</Table.Cell>
							<Table.Cell>
								Freiwillig übermittelte Feedback-Nachrichten zum Angebot
							</Table.Cell>
						</Table.Row>
						<Table.Row>
							<Table.Cell>Nutzungsinhalte</Table.Cell>
							<Table.Cell>
								Texte, Dateien und sonstige Inhalte, die zur Verarbeitung,
								Speicherung oder KI-gestützten Bearbeitung hochgeladen oder
								eingegeben werden
							</Table.Cell>
						</Table.Row>
						<Table.Row>
							<Table.Cell>Technische Daten</Table.Cell>
							<Table.Cell>
								IP-Adresse, Browsertyp, Gerätedaten, Zugriffszeitpunkt sowie
								Fehler- und Performance-Daten
							</Table.Cell>
						</Table.Row>
						<Table.Row>
							<Table.Cell>Rate-Limit- und Missbrauchsschutzdaten</Table.Cell>
							<Table.Cell>
								IP-Adresse, pseudonymisierte interne Nutzerkennung bei
								angemeldeten Nutzern sowie Zähler- und Zeitstempel-Daten zur
								Durchsetzung technischer Zugriffsbeschränkungen
							</Table.Cell>
						</Table.Row>
						<Table.Row>
							<Table.Cell>Einwilligungsprotokolle</Table.Cell>
							<Table.Cell>
								Status der erteilten oder widerrufenen Einwilligung,
								Versionsstand der Datenschutzerklärung oder Einwilligung,
								E-Mail-Adresse, IP-Adresse sowie Zeitpunkt der Protokollierung
							</Table.Cell>
						</Table.Row>
					</Table.Body>
				</Table.Root>
			</Accordion.Content>
		</Accordion.Item>

		<Accordion.Item value="point-3">
			<Accordion.Trigger>3. Cookies und ähnliche Technologien</Accordion.Trigger
			>
			<Accordion.Content class="space-y-4">
				<p>
					Cookies und ähnliche Technologien werden eingesetzt, soweit dies
					technisch erforderlich ist oder eine entsprechende Funktion
					ausdrücklich genutzt wird. Rechtsgrundlage für technisch erforderliche
					Cookies ist § 25 Abs. 2 TDDDG; die anschließende Verarbeitung
					personenbezogener Daten erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b
					oder lit. f DSGVO.
				</p>
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Cookie-Name</Table.Head>
							<Table.Head>Technologie</Table.Head>
							<Table.Head>Zweck</Table.Head>
							<Table.Head>Kategorie</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						<Table.Row>
							<Table.Cell class="align-top font-mono text-xs"
								>__stripe_mid</Table.Cell
							>
							<Table.Cell>Stripe</Table.Cell>
							<Table.Cell
								>Geräteerkennung und Betrugsprävention im Zahlungsprozess.</Table.Cell
							>
							<Table.Cell>Erforderlich</Table.Cell>
						</Table.Row>
						<Table.Row>
							<Table.Cell class="align-top font-mono text-xs"
								>__stripe_sid</Table.Cell
							>
							<Table.Cell>Stripe</Table.Cell>
							<Table.Cell>
								Zuordnung zusammenhängender Zahlungsschritte innerhalb einer
								Sitzung.
							</Table.Cell>
							<Table.Cell>Erforderlich</Table.Cell>
						</Table.Row>
						<Table.Row>
							<Table.Cell class="align-top font-mono text-xs"
								>__stripe_orig_props</Table.Cell
							>
							<Table.Cell>Stripe</Table.Cell>
							<Table.Cell
								>Erkennung manipulierter Redirects im Checkout.</Table.Cell
							>
							<Table.Cell>Erforderlich</Table.Cell>
						</Table.Row>
						<Table.Row>
							<Table.Cell class="align-top font-mono text-xs"
								>machine_identifier</Table.Cell
							>
							<Table.Cell>Stripe</Table.Cell>
							<Table.Cell
								>Eindeutige Gerätezuordnung zur Abwehr von Missbrauch.</Table.Cell
							>
							<Table.Cell>Erforderlich</Table.Cell>
						</Table.Row>
						<Table.Row>
							<Table.Cell class="align-top font-mono text-xs"
								>private_machine_identifier</Table.Cell
							>
							<Table.Cell>Stripe</Table.Cell>
							<Table.Cell
								>Verschlüsselte Geräteprüfung für Sicherheitszwecke.</Table.Cell
							>
							<Table.Cell>Erforderlich</Table.Cell>
						</Table.Row>
						<Table.Row>
							<Table.Cell class="align-top font-mono text-xs">cid</Table.Cell>
							<Table.Cell>Stripe</Table.Cell>
							<Table.Cell
								>Interne Zuordnung des Zahlungsablaufs bei Stripe.</Table.Cell
							>
							<Table.Cell>Erforderlich</Table.Cell>
						</Table.Row>
						<Table.Row>
							<Table.Cell class="align-top font-mono text-xs"
								>sb-*-auth-token</Table.Cell
							>
							<Table.Cell>Supabase Auth</Table.Cell>
							<Table.Cell
								>Authentifizierte Sitzung und Login-Verwaltung.</Table.Cell
							>
							<Table.Cell>Erforderlich</Table.Cell>
						</Table.Row>
						<Table.Row>
							<Table.Cell class="align-top font-mono text-xs"
								>__Secure-has_logged_in</Table.Cell
							>
							<Table.Cell>Supabase Auth</Table.Cell>
							<Table.Cell
								>Erkennung einer aktiven geschützten Login-Sitzung.</Table.Cell
							>
							<Table.Cell>Erforderlich</Table.Cell>
						</Table.Row>
						<Table.Row>
							<Table.Cell class="align-top font-mono text-xs"
								>cookie-perms</Table.Cell
							>
							<Table.Cell>Consent Manager</Table.Cell>
							<Table.Cell
								>Speicherung Ihrer Auswahl zu Cookie-Einstellungen.</Table.Cell
							>
							<Table.Cell>Erforderlich</Table.Cell>
						</Table.Row>
						<Table.Row>
							<Table.Cell class="align-top font-mono text-xs"
								>color-scheme</Table.Cell
							>
							<Table.Cell>UI Preferences</Table.Cell>
							<Table.Cell>
								Speicherung der von Ihnen gewählten Darstellung der Oberfläche;
								das Cookie wird nur gesetzt, wenn diese Auswahl aktiv getroffen
								wird.
							</Table.Cell>
							<Table.Cell>Funktional</Table.Cell>
						</Table.Row>
						<Table.Row>
							<Table.Cell class="align-top font-mono text-xs"
								>localStorage / IndexedDB</Table.Cell
							>
							<Table.Cell>Browser-Speicher</Table.Cell>
							<Table.Cell>
								Speicherung von Anwendungseinstellungen sowie einer lokalen
								Wiederherstellung laufender Wizard-Sitzungen auf Ihrem Gerät.
							</Table.Cell>
							<Table.Cell>Funktional</Table.Cell>
						</Table.Row>
					</Table.Body>
				</Table.Root>
				<p>
					Cookies zu Werbezwecken oder für trackingbasiertes Marketing werden
					nicht eingesetzt.
				</p>
				<p>
					Zusätzlich zu Cookies werden im Browser lokale Speichertechnologien
					verwendet. Dabei werden insbesondere ausgewählte Einstellungen in
					`localStorage` und temporäre Wizard-Sitzungen in `IndexedDB`
					gespeichert, um die Nutzung der Anwendung und die Wiederherstellung
					abgebrochener Arbeitsstände zu ermöglichen.
				</p>
			</Accordion.Content>
		</Accordion.Item>

		<Accordion.Item value="point-4">
			<Accordion.Trigger>4. Empfänger und Dienstleister</Accordion.Trigger>
			<Accordion.Content class="space-y-4">
				<p>
					Zur Bereitstellung der Plattform werden die folgenden Dienstleister
					und Empfänger eingesetzt:
				</p>
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Dienstleister</Table.Head>
							<Table.Head>Standort</Table.Head>
							<Table.Head>Einsatzbereich</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						<Table.Row>
							<Table.Cell>Vercel</Table.Cell>
							<Table.Cell>Primär EU / mögliche Drittstaatenzugriffe</Table.Cell>
							<Table.Cell>Hosting und Serverless Functions</Table.Cell>
						</Table.Row>
						<Table.Row>
							<Table.Cell>Supabase</Table.Cell>
							<Table.Cell>Primär EU / mögliche Drittstaatenzugriffe</Table.Cell>
							<Table.Cell>
								Authentifizierung, Datenbank, Sessions und Speicherung von
								Dateien, insbesondere Vorlagen
							</Table.Cell>
						</Table.Row>
						<Table.Row>
							<Table.Cell>Stripe</Table.Cell>
							<Table.Cell>EU / USA</Table.Cell>
							<Table.Cell>Zahlungsabwicklung und Betrugsprävention</Table.Cell>
						</Table.Row>
						<Table.Row>
							<Table.Cell>Sentry</Table.Cell>
							<Table.Cell>Primär EU / mögliche Drittstaatenzugriffe</Table.Cell>
							<Table.Cell>Fehler- und Performance-Monitoring</Table.Cell>
						</Table.Row>
						<Table.Row>
							<Table.Cell>Upstash Redis</Table.Cell>
							<Table.Cell>EU (Frankfurt)</Table.Cell>
							<Table.Cell>
								Rate Limiting, Missbrauchsschutz sowie Sicherung von
								Verfügbarkeit und Stabilität serverseitiger Funktionen
							</Table.Cell>
						</Table.Row>
						<Table.Row>
							<Table.Cell>SMTP2GO</Table.Cell>
							<Table.Cell>
								EU-SMTP-Server / mögliche Drittstaatenzugriffe
							</Table.Cell>
							<Table.Cell>
								Versand von Authentifizierungs-E-Mails, insbesondere Magic Links
								und OTP-Codes
							</Table.Cell>
						</Table.Row>
						<Table.Row>
							<Table.Cell>Google OAuth</Table.Cell>
							<Table.Cell>EU / USA</Table.Cell>
							<Table.Cell>Optionale Anmeldung über ein Google-Konto</Table.Cell>
						</Table.Row>
						<Table.Row>
							<Table.Cell
								>Google Cloud / Gemini Enterprise Agent Platform</Table.Cell
							>
							<Table.Cell>Primär EU / mögliche Drittstaatenzugriffe</Table.Cell>
							<Table.Cell>
								Temporäre Dateispeicherung für die KI-gestützte Verarbeitung
								sowie Speicherung von Datenbanksicherungen
							</Table.Cell>
						</Table.Row>
					</Table.Body>
				</Table.Root>
				<p>
					Soweit erforderlich, werden mit den eingesetzten Dienstleistern
					Verträge zur Auftragsverarbeitung gemäß Art. 28 DSGVO abgeschlossen.
				</p>
				<p>
					Für technische Zugriffsbeschränkungen und Missbrauchsschutz wird
					Upstash Redis in der Region Frankfurt eingesetzt. Dabei werden keine
					Inhalte hochgeladener Dateien, keine Vorlageninhalte und keine
					Zahlungsdaten gespeichert, sondern lediglich für das Rate Limiting
					erforderliche Kennungen und Metadaten, insbesondere IP-Adresse,
					pseudonymisierte interne Nutzerkennung bei angemeldeten Nutzern sowie
					Zähler- und Zeitstempel-Daten.
				</p>
				<p>
					Für den Versand von Authentifizierungs-E-Mails bei der Anmeldung per
					Magic Link oder OTP wird ein externer SMTP-Dienst genutzt. Dabei wird
					insbesondere Ihre E-Mail-Adresse sowie die zur Zustellung
					erforderliche Nachrichten- und Transportmetadaten verarbeitet.
				</p>
				<p>
					Für die KI-gestützte Verarbeitung wird Google Cloud bzw. die Gemini
					Enterprise Agent Platform eingesetzt. Die Verarbeitung hochgeladener
					Dateien erfolgt erst nach ausdrücklicher Einwilligung; ohne diese
					Einwilligung wird keine entsprechende Dateianalyse durchgeführt.
					Soweit statt Dateien URLs zur Analyse übermittelt werden, können diese
					Angaben im Rahmen von Grounding- bzw. Suchfunktionen an Google
					übermittelt werden, um die angegebene Webseite für die gewünschte
					Auswertung abzurufen und zu analysieren.
				</p>
				<p>
					Nach den von Google veröffentlichten Bedingungen und Informationen zu
					Google Cloud wird Kundendaten ohne vorherige Genehmigung oder
					Anweisung nicht zum Training oder Fine-Tuning von AI/ML-Modellen
					verwendet. Bestimmte Inhalte, insbesondere Prompts, Kontextdaten und
					Ausgaben im Zusammenhang mit Grounding- bzw. Suchfunktionen, können
					nach Google-Angaben vorübergehend verarbeitet oder für bis zu 30 Tage
					gespeichert werden. Maßgeblich sind insbesondere die Informationen von
					Google zur Gemini Enterprise Agent Platform und die Google Cloud
					Service Specific Terms:
					<a
						href="https://docs.cloud.google.com/gemini-enterprise-agent-platform/resources/zero-data-retention"
						>https://docs.cloud.google.com/gemini-enterprise-agent-platform/resources/zero-data-retention</a
					>
					sowie
					<a href="https://cloud.google.com/terms/service-terms"
						>https://cloud.google.com/terms/service-terms</a
					>.
				</p>
			</Accordion.Content>
		</Accordion.Item>

		<Accordion.Item value="point-5">
			<Accordion.Trigger>5. Drittstaatentransfers</Accordion.Trigger>
			<Accordion.Content class="space-y-2">
				<p>
					Bei einzelnen Dienstleistern kann eine Verarbeitung personenbezogener
					Daten in Drittländern, insbesondere in den USA, nicht ausgeschlossen
					werden.
				</p>
				<p>
					Soweit Daten an Empfänger in den USA übermittelt werden, erfolgt dies
					je nach Anbieter entweder auf Grundlage des Angemessenheitsbeschlusses
					der EU-Kommission für das EU-U.S. Data Privacy Framework vom 10. Juli
					2023 oder auf Grundlage geeigneter Garantien, insbesondere
					Standardvertragsklauseln gemäß Art. 46 DSGVO.
				</p>
				<p>
					Soweit Übermittlungen auf geeignete Garantien, insbesondere
					Standardvertragsklauseln, gestützt werden, kann eine Kopie der
					einschlägigen Garantien unter der oben genannten Kontaktadresse
					angefordert werden.
				</p>
			</Accordion.Content>
		</Accordion.Item>

		<Accordion.Item value="point-6">
			<Accordion.Trigger>6. Zwecke der Datenverarbeitung</Accordion.Trigger>
			<Accordion.Content class="space-y-2">
				<p>Die Verarbeitung erfolgt ausschließlich zu den folgenden Zwecken:</p>
				<ul class="list-disc space-y-1 pl-5">
					<li>Anmeldung, Authentifizierung und Kontoverwaltung</li>
					<li>Bereitstellung der Webanwendung und ihrer Kernfunktionen</li>
					<li>Verarbeitung hochgeladener Dateien und eingegebener Inhalte</li>
					<li>
						Speicherung lokaler Einstellungen und Wiederherstellung von
						Wizard-Sitzungen
					</li>
					<li>
						KI-gestützte Bearbeitung der bereitgestellten Inhalte nach
						gesonderter Einwilligung, soweit eine solche erforderlich ist
					</li>
					<li>Optionale Zahlungsabwicklung</li>
					<li>
						Bereitstellung und optionale öffentliche Freigabe von Vorlagen
					</li>
					<li>
						Entgegennahme und Bearbeitung von Feedback und Vorlagenmeldungen
					</li>
					<li>
						Rate Limiting, Missbrauchsschutz sowie Sicherung der Verfügbarkeit
					</li>
					<li>Fehleranalyse, Performance-Überwachung und Systemsicherheit</li>
					<li>Weiterentwicklung und Verbesserung des Angebots</li>
				</ul>
				<p>
					Eine Nutzung personenbezogener Daten zu Werbezwecken oder eine
					Weitergabe an Werbenetzwerke erfolgt nicht.
				</p>
			</Accordion.Content>
		</Accordion.Item>

		<Accordion.Item value="point-7">
			<Accordion.Trigger>7. Rechtsgrundlagen</Accordion.Trigger>
			<Accordion.Content class="space-y-2">
				<p>
					Die Verarbeitung erfolgt auf Basis der folgenden Rechtsgrundlagen:
				</p>
				<ul class="list-disc space-y-1 pl-5">
					<li>
						Art. 6 Abs. 1 lit. b DSGVO für vertraglich erforderliche Vorgänge,
						insbesondere Login, Kontonutzung, Datei-Uploads, Vorlagenverwaltung,
						öffentliche Freigabe von Vorlagen, KI-Verarbeitung und
						Zahlungsabwicklung
					</li>
					<li>
						Art. 6 Abs. 1 lit. f DSGVO für Systemsicherheit, Missbrauchsschutz,
						Rate Limiting, Fehleranalyse, Stabilität und technische
						Weiterentwicklung
					</li>
					<li>
						Art. 6 Abs. 1 lit. a DSGVO, soweit eine Einwilligung erteilt oder
						optionale Funktionen freiwillig aktiviert werden
					</li>
				</ul>
				<p>
					Als berechtigte Interessen im Sinne von Art. 6 Abs. 1 lit. f DSGVO
					werden insbesondere der sichere, stabile und wirtschaftliche Betrieb
					des Online-Angebots verfolgt.
				</p>
			</Accordion.Content>
		</Accordion.Item>

		<Accordion.Item value="point-8">
			<Accordion.Trigger>8. Speicherdauer</Accordion.Trigger>
			<Accordion.Content class="space-y-4">
				<p>
					Personenbezogene Daten werden nur so lange gespeichert, wie dies für
					die genannten Zwecke erforderlich ist oder gesetzliche
					Aufbewahrungspflichten bestehen.
				</p>
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Datenkategorie</Table.Head>
							<Table.Head>Speicherdauer</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						<Table.Row>
							<Table.Cell>Kontodaten</Table.Cell>
							<Table.Cell>Solange das Nutzerkonto aktiv ist</Table.Cell>
						</Table.Row>
						<Table.Row>
							<Table.Cell>Vercel-Logs</Table.Cell>
							<Table.Cell>In der Regel bis zu 3 Tage</Table.Cell>
						</Table.Row>
						<Table.Row>
							<Table.Cell>Lokale Wizard-Sitzungen (IndexedDB)</Table.Cell>
							<Table.Cell>Bis zu 24 Stunden auf Ihrem Gerät</Table.Cell>
						</Table.Row>
						<Table.Row>
							<Table.Cell>Lokale Einstellungen (localStorage)</Table.Cell>
							<Table.Cell>
								Bis zur Löschung durch Sie im Browser oder bis zur Entfernung
								der jeweiligen Einstellung
							</Table.Cell>
						</Table.Row>
						<Table.Row>
							<Table.Cell>Zahlungs- und Abrechnungsdaten</Table.Cell>
							<Table.Cell>
								Nach handels- und steuerrechtlichen Vorgaben bis zu 10 Jahre
							</Table.Cell>
						</Table.Row>
						<Table.Row>
							<Table.Cell>Fehlerdaten (Sentry)</Table.Cell>
							<Table.Cell>In der Regel bis zu 30 Tage</Table.Cell>
						</Table.Row>
						<Table.Row>
							<Table.Cell>Rate-Limit-Daten (Upstash Redis)</Table.Cell>
							<Table.Cell>
								Nur für die Dauer des jeweiligen Rate-Limit-Fensters und bis zum
								automatischen Ablauf der jeweiligen Redis-Einträge
							</Table.Cell>
						</Table.Row>
						<Table.Row>
							<Table.Cell>Von Ihnen bereitgestellte Vorlagen</Table.Cell>
							<Table.Cell>
								Bis zur Löschung durch Sie oder bis zur Löschung des
								Nutzerkontos
							</Table.Cell>
						</Table.Row>
						<Table.Row>
							<Table.Cell>Feedback und Vorlagenmeldungen</Table.Cell>
							<Table.Cell>
								Bis zur Löschung des Nutzerkontos oder solange die jeweilige
								Nachricht für Bearbeitung, Missbrauchsschutz oder Nachweiszwecke
								erforderlich ist
							</Table.Cell>
						</Table.Row>
						<Table.Row>
							<Table.Cell>Dateien über 1 MB</Table.Cell>
							<Table.Cell>
								Zum Zwecke der Wiederverwendung (Caching) bis zu 1 Tag in einem
								Cloud-Bucket
							</Table.Cell>
						</Table.Row>
						<Table.Row>
							<Table.Cell>
								Prompts, Kontextdaten und Ausgaben bei Grounding mit Google
								Search
							</Table.Cell>
							<Table.Cell>Nach Google-Angaben bis zu 30 Tage</Table.Cell>
						</Table.Row>
						<Table.Row>
							<Table.Cell>Einwilligungsprotokolle</Table.Cell>
							<Table.Cell>
								Die protokollierte E-Mail-Adresse, die protokollierte IP-Adresse
								und die weiteren Einwilligungsdaten werden bis zu 3 Jahre nach
								Löschung des Nutzerkontos gespeichert und anschließend gelöscht
							</Table.Cell>
						</Table.Row>
					</Table.Body>
				</Table.Root>
				<p>
					Soweit keine gesetzlichen Aufbewahrungspflichten entgegenstehen,
					werden Daten nach Wegfall des Verarbeitungszwecks gelöscht.
				</p>
			</Accordion.Content>
		</Accordion.Item>

		<Accordion.Item value="point-9">
			<Accordion.Trigger>9. Ihre Rechte</Accordion.Trigger>
			<Accordion.Content class="space-y-2">
				<p>Ihnen stehen insbesondere die folgenden Rechte zu:</p>
				<ul class="list-disc space-y-1 pl-5">
					<li>Auskunft über gespeicherte Daten (Art. 15 DSGVO)</li>
					<li>Berichtigung unrichtiger Daten (Art. 16 DSGVO)</li>
					<li>Löschung Ihrer Daten (Art. 17 DSGVO)</li>
					<li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
					<li>Widerspruch gegen die Verarbeitung (Art. 21 DSGVO)</li>
					<li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
					<li>Widerruf erteilter Einwilligungen mit Wirkung für die Zukunft</li>
				</ul>
				<p>
					Zur Ausübung dieser Rechte kann unter der oben genannten Adresse
					Kontakt aufgenommen werden.
				</p>
				<p>
					Es besteht außerdem das Recht, eine Beschwerde bei einer
					Datenschutzaufsichtsbehörde einzureichen. Zuständige Aufsichtsbehörde
					für nicht-öffentliche Stellen am Sitz in Paderborn ist insbesondere
					die Landesbeauftragte für Datenschutz und Informationsfreiheit
					Nordrhein-Westfalen (LDI NRW), Kavalleriestraße 2-4, 40213 Düsseldorf.
				</p>
			</Accordion.Content>
		</Accordion.Item>

		<Accordion.Item value="point-10">
			<Accordion.Trigger
				>10. Pflicht zur Bereitstellung von Daten</Accordion.Trigger
			>
			<Accordion.Content class="space-y-2">
				<p>
					Eine gesetzliche Pflicht zur Bereitstellung personenbezogener Daten
					besteht grundsätzlich nicht. Bestimmte Daten sind jedoch für die
					Nutzung der Dienste erforderlich. Wenn insbesondere keine
					E-Mail-Adresse, keine Login-Daten oder keine zur Verarbeitung
					bereitgestellten Inhalte angegeben werden, können wesentliche
					Funktionen der Plattform nicht oder nicht vollständig genutzt werden.
				</p>
			</Accordion.Content>
		</Accordion.Item>

		<Accordion.Item value="point-11">
			<Accordion.Trigger
				>11. Keine automatisierte Entscheidungsfindung</Accordion.Trigger
			>
			<Accordion.Content class="space-y-2">
				<p>
					Eine automatisierte Entscheidungsfindung einschließlich Profiling im
					Sinne von Art. 22 DSGVO findet nicht statt.
				</p>
			</Accordion.Content>
		</Accordion.Item>

		<Accordion.Item value="point-12">
			<Accordion.Trigger>12. Minderjährige</Accordion.Trigger>
			<Accordion.Content class="space-y-2">
				<p>
					Die Plattform richtet sich nicht gezielt an Minderjährige. Optionale
					Käufe über Stripe sollten nur mit Zustimmung der
					Erziehungsberechtigten vorgenommen werden.
				</p>
			</Accordion.Content>
		</Accordion.Item>

		<Accordion.Item value="point-13">
			<Accordion.Trigger
				>13. Änderungen dieser Datenschutzerklärung</Accordion.Trigger
			>
			<Accordion.Content class="space-y-2">
				<p>
					Diese Datenschutzerklärung kann bei Bedarf aktualisiert werden. Die
					jeweils aktuelle Version wird auf der Website bereitgehalten.
				</p>
			</Accordion.Content>
		</Accordion.Item>
	</Accordion.Root>
</main>
