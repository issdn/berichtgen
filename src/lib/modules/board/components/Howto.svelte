<script lang="ts">
	import { Button } from '$ui/button';
	import * as Card from '$ui/card';
	import { getContextPrompt } from '$wizard/completion/prompt';
	import { Ort } from '$wizard/enums';
	import { Copy, Pin } from '@lucide/svelte';
	import FilesToConfigModal from './FilesToConfigModal.svelte';
</script>

<div class="bg-muted h-full w-full overflow-y-hidden">
	<div class="h-full w-full overflow-y-auto">
		<div class="columns-1 gap-4 space-y-4 rounded-md p-4 xl:columns-2">
			<Card.Root class="relative inline-block w-full">
				<Pin class="absolute -top-1 -right-1 rotate-45 " />
				<Card.Header>
					<Card.Title>💵 Berichte kostenlos generieren</Card.Title>
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
						<Button
							variant="ghost"
							onclick={() => {
								navigator.clipboard.writeText(getContextPrompt(Ort.SCHULE));
							}}><Copy /> Schule</Button
						>
						<Button
							variant="ghost"
							onclick={() => {
								navigator.clipboard.writeText(getContextPrompt(Ort.BETRIEB));
							}}><Copy /> Betrieb/Unterweisung</Button
						>
					</div>
				</Card.Content>
			</Card.Root>
			<Card.Root class="relative inline-block w-full">
				<Pin class="absolute -top-1 -right-1 rotate-45 " />
				<Card.Header>
					<Card.Title>📄 CSV Konfig</Card.Title>
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
						<FilesToConfigModal />
					</div>
				</Card.Content>
			</Card.Root>
		</div>
	</div>
</div>
