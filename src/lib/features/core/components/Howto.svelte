<script lang="ts">
	import FilesToConfigDialog from '$core/config/components/FilesToConfigDialog.svelte';
	import Button from '$ui/button/button.svelte';
	import * as Card from '$ui/card';
	import { getContextPrompt } from '$wizard/completion/prompt';
	import { Ort } from '$wizard/enums';
	import { Pin } from '@lucide/svelte';

	import CopyButton from './CopyButton.svelte';
</script>

<div class="bg-muted h-full max-h-240 w-full overflow-y-hidden">
	<div class="h-full w-full overflow-y-auto">
		<div class="columns-1 gap-4 space-y-4 rounded-md p-4 xl:columns-2">
			<Card.Root class="relative inline-block w-full">
				<Pin class="absolute -top-1 -right-1 rotate-45 " />
				<Card.Header>
					<Card.Title>Berichte kostenlos generieren</Card.Title>
				</Card.Header>
				<Card.Content>
					<p>
						Du kannst deine Berichte kostenlos generieren in dem du die
						JSON-Dateien erstmal mit einem LLM deiner Wahl generierst und dann
						hier droppst.
						<br />
						Die JSON muss eine Liste von Texten sein.
						<br />
						Ein Prompt das du verwenden kannst:
					</p>
					<div class="flex flex-row flex-wrap items-start gap-2 py-4">
						<CopyButton text={getContextPrompt(Ort.SCHULE)}>Schule</CopyButton>
						<CopyButton text={getContextPrompt(Ort.BETRIEB)}
							>Betrieb/Unterweisung</CopyButton
						>
					</div>
				</Card.Content>
			</Card.Root>
			<Card.Root class="relative inline-block w-full">
				<Pin class="absolute -top-1 -right-1 rotate-45 " />
				<Card.Header>
					<Card.Title>CSV Konfig</Card.Title>
				</Card.Header>
				<Card.Content>
					<p>
						Du kannst das manuelle Datieren mit einer <i
							class="bg-muted rounded-sm px-2">.csv|.txt</i
						>
						Datei automatisieren. Die Datei muss
						<i class="bg-muted rounded-sm px-2">berichtgen.(csv|txt)</i> heißen
						und sie soll mit den restlichen Dateien in die Dopzone gedroppt
						werden. Die <b>Reihenfolge</b> der Zeilen wird beibehalten!
					</p>
					<br />
					<p>Format:</p>
					<p>
						<code class="font-mono text-sm"
							>ORT,DATEI_NAME,[START_DATUM;END_DATUM;(STUNDEN)]</code
						>
					</p>
					<br />
					<p>Beispiel:</p>
					<code class="font-mono text-sm"
						>SCHULE,wit.pdf,2024-08-26;2024-10-16</code
					>
					<code class="font-mono text-sm"
						>SCHULE,rwc.docx,2024-08-26;2024-10-16;40,2025-01-01;2025-03-01;30</code
					>
					<div class="flex flex-row pt-4">
						<FilesToConfigDialog />
					</div>
				</Card.Content>
			</Card.Root>
			<Card.Root class="relative inline-block w-full">
				<Pin class="absolute -top-1 -right-1 rotate-45 " />
				<Card.Header>
					<Card.Title>Kostenlose Version (Self-Host)</Card.Title>
				</Card.Header>
				<Card.Content class="flex flex-row flex-wrap">
					Lade die App herunter und hoste sie selbst!
					<Button
						target="_blank"
						variant="link"
						href="https://codeberg.org/isdn/Berichtgen">Codeberg</Button
					>
					<Button
						target="_blank"
						variant="link"
						href="https://github.com/issdn/Berichtgen">GitHub</Button
					>
				</Card.Content>
			</Card.Root>
			<Card.Root class="relative inline-block w-full">
				<Pin class="absolute -top-1 -right-1 rotate-45 " />
				<Card.Header>
					<Card.Title>Eigene DOCX Vorlagen</Card.Title>
				</Card.Header>
				<Card.Content>
					<p>
						<a
							href="https://www.npmjs.com/package/docx-templates"
							target="_blank"
							class="underline">docx-templates</a
						>
						ist eine Library, mit der du normale
						<i class="bg-muted rounded-sm px-2">.docx</i>
						Dateien als Vorlagen benutzen kannst. Du gestaltest das Layout in Word
						und markierst nur die Stellen, an denen später dynamische Daten eingesetzt
						werden sollen.
					</p>
					<br />
					<p>
						Wenn du eigene Vorlagen bauen willst, lies die Dokumentation dort.
						Für konkrete Beispiele kannst du dir außerdem die Vorlagenliste hier
						in der App anschauen und bestehende Vorlagen als Orientierung
						verwenden.
					</p>
				</Card.Content>
			</Card.Root>
		</div>
	</div>
</div>
