<script lang="ts">
	import { Copy, ExternalLink, Pin, Settings } from 'lucide-svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$src/lib/components/ui/button';
	import { getContextPrompt } from '$src/lib/completion/prompt';
	import { Ort, type UserContext } from '$src/lib/types';
	import { getContext } from 'svelte';

	let { loggedIn } = getContext<UserContext>('user')();
</script>

<div class="h-full overflow-y-auto bg-muted">
	<div class="columns-1 gap-4 space-y-4 rounded-md p-4 xl:columns-2">
		<Card.Root class="relative inline-block w-full">
			<Pin class="absolute -right-1 -top-1 rotate-45 " />
			<Card.Header>
				<Card.Title>💵 Berichte kostenlos generieren</Card.Title>
			</Card.Header>
			<Card.Content>
				<p>
					Du kannst deine Berichte kostenlos generieren in dem du die JSON-Dateien erstmal mit einem
					LLM deiner Wahl generierst und dann hier droppst.
					<br />
					Die JSON muss eine Liste von Objekten sein. Ein Objekt muss den Bericht als text im Feld "text"
					und eine Liste von Text-Qualifikationen im feld 'qualifikationen' haben.
					<br />
					Ein Prompt das du verwenden kannst:
				</p>
				<div class="flex flex-col gap-2 py-4 md:flex-row">
					<Button
						variant="link"
						onclick={() => {
							navigator.clipboard.writeText(getContextPrompt(Ort.SCHULE));
						}}><Copy /> Schule</Button
					>
					<Button
						variant="link"
						onclick={() => {
							navigator.clipboard.writeText(getContextPrompt(Ort.BETRIEB));
						}}><Copy /> Betrieb/Unterweisung</Button
					>
				</div>
			</Card.Content>
		</Card.Root>
		<Card.Root class="relative inline-block w-full">
			<Pin class="absolute -right-1 -top-1 rotate-45 " />
			<Card.Header>
				<Card.Title>🤔 Was denn?</Card.Title>
			</Card.Header>
			<Card.Content>
				<p>
					Du kannst den Bericht entweder als fertiges DOCX oder als JSON herunterladen.
					<br />
					Falls du die Berichte auf der bildung.ihk.de Plattform ausfüllen musst, kannst du die JSON
					unserer Extension übergeben:
				</p>
				<Button
					variant="link"
					href="https://chromewebstore.google.com/detail/ihk-berichtsheft-bot/cjadnfbehnecalphcincmljbheaiokgp?hl=en-US"
					target="_blank"
					rel="noopener noreferrer"><ExternalLink />Extension</Button
				>
			</Card.Content>
		</Card.Root>
		<Card.Root class="relative inline-block w-full">
			<Pin class="absolute -right-1 -top-1 rotate-45 " />
			<Card.Header>
				<Card.Title>💳 75% Tokens sparen</Card.Title>
			</Card.Header>
			<Card.Content>
				<p>
					Wenn du deinen eigenen API-Key verwendest, beim generieren der Berichte wird 75% weniger
					Tokens genommen.
					{#if !loggedIn}
						Das kannst du aber nur angemeldet machen.
					{/if}
				</p>
				{#if loggedIn}
					<Button variant="link" href="/board/user/settings"><Settings />Zu Einstellungen</Button>
				{/if}
			</Card.Content>
		</Card.Root>
		<Card.Root class="relative inline-block w-full">
			<Pin class="absolute -right-1 -top-1 rotate-45 " />
			<Card.Header>
				<Card.Title>📄 CSV Konfig</Card.Title>
			</Card.Header>
			<Card.Content>
				<p>
					Du kannst das manuelle Datieren mit einer <i class="rounded-sm bg-muted px-2">.csv|.txt</i
					>
					Datei automatisieren. Die Datei muss
					<i class="rounded-sm bg-muted px-2">berichtgen.(csv|txt)</i> heißen und sie soll mit den restlichen
					Dateien in die Dopzone gedroppt werden.
				</p>
				<br />
				<p>Format:</p>
				<p>
					<code class="font-mono text-sm">ORT,DATEI_NAME,[START_DATUM;END_DATUM;(STUNDEN)]</code>
				</p>
				<br />
				<p>Beispiel:</p>
				<code class="font-mono text-sm">SCHULE,wit.pdf,2024-08-26;2024-10-16</code>
				<code class="font-mono text-sm"
					>SCHULE,rwc.docx,2024-08-26;2024-10-16;40,2025-01-01;2025-03-01;30</code
				>
			</Card.Content>
		</Card.Root>
	</div>
</div>
