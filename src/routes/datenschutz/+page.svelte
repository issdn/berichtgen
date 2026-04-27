<script lang="ts">
	import * as Accordion from '$lib/components/ui/accordion/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
</script>

<main class="flex flex-col gap-y-6 px-12 pb-16">
	<section class="space-y-2">
		<h1 class="text-2xl font-semibold">Datenschutzerklärung</h1>
		<p><strong>Karol Bielski Software - berichtgen.de</strong></p>
		<p>
			Diese Datenschutzerklärung erläutert, welche personenbezogenen Daten wir
			verarbeiten, zu welchen Zwecken dies erfolgt und welche Rechte Sie in
			Bezug auf Ihre Daten haben.
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
					<a href="mailto:karol.bielski.contact@proton.me"
						>karol.bielski.contact@proton.me</a
					>
				</p>
			</Accordion.Content>
		</Accordion.Item>

		<Accordion.Item value="point-2">
			<Accordion.Trigger>2. Welche Daten wir verarbeiten</Accordion.Trigger>
			<Accordion.Content class="space-y-2">
				<p>
					Beim Besuch unserer Website und bei der Nutzung unserer Anwendung
					verarbeiten wir insbesondere folgende personenbezogene Daten:
				</p>
				<ul class="list-disc space-y-1 pl-5">
					<li>
						<strong>Anmeldung per Magic Link:</strong> Ihre E-Mail-Adresse
					</li>
					<li>
						<strong>Google-Login (optional):</strong> Von Google bzw. Supabase bereitgestellte
						Profildaten, insbesondere E-Mail-Adresse, Name und Profilbild
					</li>
					<li>
						<strong>Konten- und Sitzungsdaten:</strong> Authentifizierungsdaten, Session-Informationen
						und sicherheitsrelevante Login-Informationen
					</li>
					<li>
						<strong>Zahlungsdaten:</strong> Transaktions- und Zahlungsinformationen,
						soweit Sie freiwillig kostenpflichtige Funktionen nutzen
					</li>
					<li>
						<strong>Nutzungsinhalte:</strong> Texte, Dateien und sonstige Inhalte,
						die Sie zur Verarbeitung, Speicherung oder KI-gestützten Bearbeitung hochladen
						oder eingeben
					</li>
					<li>
						<strong>Technische Daten:</strong> IP-Adresse, Browsertyp, Gerätedaten,
						Zugriffszeitpunkt sowie Fehler- und Performance-Daten
					</li>
				</ul>
			</Accordion.Content>
		</Accordion.Item>

		<Accordion.Item value="point-3">
			<Accordion.Trigger>3. Cookies und ähnliche Technologien</Accordion.Trigger
			>
			<Accordion.Content class="space-y-4">
				<p>
					Unsere Website verwendet Cookies und ähnliche Technologien, soweit
					dies technisch erforderlich ist oder Sie eine entsprechende Funktion
					ausdrücklich nutzen. Rechtsgrundlage für technisch erforderliche
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
							<Table.Cell
								>Zuordnung zusammenhängender Zahlungsschritte innerhalb einer
								Sitzung.</Table.Cell
							>
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
								>Speichert Ihre Auswahl zu Cookie-Einstellungen.</Table.Cell
							>
							<Table.Cell>Erforderlich</Table.Cell>
						</Table.Row>
						<Table.Row>
							<Table.Cell class="align-top font-mono text-xs"
								>color-scheme</Table.Cell
							>
							<Table.Cell>UI Preferences</Table.Cell>
							<Table.Cell>
								Speichert die von Ihnen gewählte Darstellung der Oberfläche und
								wird nur gesetzt, wenn Sie diese Auswahl aktiv treffen.
							</Table.Cell>
							<Table.Cell>Funktional</Table.Cell>
						</Table.Row>
					</Table.Body>
				</Table.Root>
				<p>
					Wir verwenden keine Cookies zu Werbezwecken oder für trackingbasiertes
					Marketing.
				</p>
			</Accordion.Content>
		</Accordion.Item>

		<Accordion.Item value="point-4">
			<Accordion.Trigger>4. Empfänger und Dienstleister</Accordion.Trigger>
			<Accordion.Content class="space-y-4">
				<p>
					Zur Bereitstellung unserer Plattform setzen wir folgende Dienstleister
					und Empfänger ein:
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
							<Table.Cell>EU / ggf. Drittland</Table.Cell>
							<Table.Cell>Hosting und Serverless Functions</Table.Cell>
						</Table.Row>
						<Table.Row>
							<Table.Cell>Supabase</Table.Cell>
							<Table.Cell>EU / ggf. Drittland</Table.Cell>
							<Table.Cell>Authentifizierung, Datenbank und Sessions</Table.Cell>
						</Table.Row>
						<Table.Row>
							<Table.Cell>Stripe</Table.Cell>
							<Table.Cell>EU / USA</Table.Cell>
							<Table.Cell>Zahlungsabwicklung und Betrugsprävention</Table.Cell>
						</Table.Row>
						<Table.Row>
							<Table.Cell>Sentry</Table.Cell>
							<Table.Cell>EU / USA</Table.Cell>
							<Table.Cell>Fehler- und Performance-Monitoring</Table.Cell>
						</Table.Row>
						<Table.Row>
							<Table.Cell>Google OAuth</Table.Cell>
							<Table.Cell>EU / USA</Table.Cell>
							<Table.Cell>Optionale Anmeldung über ein Google-Konto</Table.Cell>
						</Table.Row>
						<Table.Row>
							<Table.Cell>Google Cloud / Vertex AI</Table.Cell>
							<Table.Cell>EU / USA</Table.Cell>
							<Table.Cell>
								Datei-Uploads, Dateispeicherung und KI-gestützte Verarbeitung
								von Nutzungsinhalten
							</Table.Cell>
						</Table.Row>
						<Table.Row>
							<Table.Cell>Google Fonts</Table.Cell>
							<Table.Cell>USA</Table.Cell>
							<Table.Cell>Einbindung externer Schriftarten</Table.Cell>
						</Table.Row>
					</Table.Body>
				</Table.Root>
				<p>
					Soweit erforderlich, bestehen mit den eingesetzten Dienstleistern
					Verträge zur Auftragsverarbeitung gemäß Art. 28 DSGVO.
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
			</Accordion.Content>
		</Accordion.Item>

		<Accordion.Item value="point-6">
			<Accordion.Trigger>6. Zwecke der Datenverarbeitung</Accordion.Trigger>
			<Accordion.Content class="space-y-2">
				<p>Die Verarbeitung erfolgt ausschließlich zu folgenden Zwecken:</p>
				<ul class="list-disc space-y-1 pl-5">
					<li>Anmeldung, Authentifizierung und Kontoverwaltung</li>
					<li>Bereitstellung der Webanwendung und ihrer Kernfunktionen</li>
					<li>Verarbeitung hochgeladener Dateien und eingegebener Inhalte</li>
					<li>
						KI-gestützte Bearbeitung der von Ihnen bereitgestellten Inhalte
					</li>
					<li>Optionale Zahlungsabwicklung</li>
					<li>Fehleranalyse, Performance-Überwachung und Systemsicherheit</li>
					<li>Weiterentwicklung und Verbesserung unseres Angebots</li>
				</ul>
				<p>
					Eine Nutzung Ihrer Daten zu Werbezwecken oder eine Weitergabe an
					Werbenetzwerke erfolgt nicht.
				</p>
			</Accordion.Content>
		</Accordion.Item>

		<Accordion.Item value="point-7">
			<Accordion.Trigger>7. Rechtsgrundlagen</Accordion.Trigger>
			<Accordion.Content class="space-y-2">
				<p>Die Verarbeitung erfolgt auf Basis folgender Rechtsgrundlagen:</p>
				<ul class="list-disc space-y-1 pl-5">
					<li>
						Art. 6 Abs. 1 lit. b DSGVO für vertraglich erforderliche Vorgänge,
						insbesondere Login, Kontonutzung, Datei-Uploads, KI-Verarbeitung und
						Zahlungsabwicklung
					</li>
					<li>
						Art. 6 Abs. 1 lit. f DSGVO für Systemsicherheit, Missbrauchsschutz,
						Fehleranalyse, Stabilität und technische Weiterentwicklung
					</li>
					<li>
						Art. 6 Abs. 1 lit. a DSGVO, soweit Sie uns eine Einwilligung
						erteilen oder optionale Funktionen freiwillig aktivieren
					</li>
				</ul>
				<p>
					Unsere berechtigten Interessen im Sinne von Art. 6 Abs. 1 lit. f DSGVO
					bestehen insbesondere in einem sicheren, stabilen und wirtschaftlich
					betriebenen Online-Angebot.
				</p>
			</Accordion.Content>
		</Accordion.Item>

		<Accordion.Item value="point-8">
			<Accordion.Trigger>8. Speicherdauer</Accordion.Trigger>
			<Accordion.Content class="space-y-2">
				<p>
					Wir speichern personenbezogene Daten nur so lange, wie dies für die
					genannten Zwecke erforderlich ist oder gesetzliche
					Aufbewahrungspflichten bestehen:
				</p>
				<ul class="list-disc space-y-1 pl-5">
					<li>
						<strong>Kontodaten:</strong> solange Ihr Nutzerkonto aktiv ist
					</li>
					<li><strong>Vercel-Logs:</strong> in der Regel bis zu 3 Tage</li>
					<li>
						<strong>Zahlungs- und Abrechnungsdaten:</strong> nach handels- und steuerrechtlichen
						Vorgaben bis zu 10 Jahre
					</li>
					<li>
						<strong>Fehlerdaten (Sentry):</strong> in der Regel bis zu 30 Tage
					</li>
					<li>
						<strong>Von Ihnen bereitgestellte Templates:</strong>
						solange dies für die Bereitstellung der Funktion oder bis zur Löschung
						durch Sie bzw. uns erforderlich ist
					</li>
					<li>
						<strong>Dateien über 1 MB:</strong> können zum Zwecke der Wiederverwendung
						(Caching) bis zu 1 Tag in einem Cloud-Bucket gespeichert werden
					</li>
				</ul>
				<p>
					Soweit keine gesetzlichen Aufbewahrungspflichten entgegenstehen,
					löschen wir Daten nach Wegfall des Verarbeitungszwecks.
				</p>
			</Accordion.Content>
		</Accordion.Item>

		<Accordion.Item value="point-9">
			<Accordion.Trigger>9. Ihre Rechte</Accordion.Trigger>
			<Accordion.Content class="space-y-2">
				<p>Sie haben insbesondere das Recht auf:</p>
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
					Zur Ausübung Ihrer Rechte kontaktieren Sie uns unter der oben
					genannten Adresse.
				</p>
				<p>
					Sie haben außerdem das Recht, sich bei einer
					Datenschutzaufsichtsbehörde zu beschweren. Zuständig für
					nicht-öffentliche Stellen in Nordrhein-Westfalen ist insbesondere die
					Landesbeauftragte für Datenschutz und Informationsfreiheit
					Nordrhein-Westfalen (LDI NRW).
				</p>
			</Accordion.Content>
		</Accordion.Item>

		<Accordion.Item value="point-10">
			<Accordion.Trigger
				>10. Pflicht zur Bereitstellung von Daten</Accordion.Trigger
			>
			<Accordion.Content class="space-y-2">
				<p>
					Die Bereitstellung Ihrer Daten ist teilweise für die Nutzung unserer
					Dienste erforderlich. Ohne E-Mail-Adresse, Login-Daten oder die von
					Ihnen zur Verarbeitung bereitgestellten Inhalte können wesentliche
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
					Eine automatisierte Entscheidungsfindung oder ein Profiling im Sinne
					von Art. 22 DSGVO findet nicht statt.
				</p>
			</Accordion.Content>
		</Accordion.Item>

		<Accordion.Item value="point-12">
			<Accordion.Trigger>12. Minderjährige</Accordion.Trigger>
			<Accordion.Content class="space-y-2">
				<p>
					Unsere Plattform richtet sich nicht gezielt an Minderjährige.
					Optionale Käufe über Stripe sollten nur mit Zustimmung der
					Erziehungsberechtigten erfolgen.
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
					jeweils aktuelle Version ist jederzeit auf unserer Website einsehbar.
				</p>
			</Accordion.Content>
		</Accordion.Item>
	</Accordion.Root>
</main>
