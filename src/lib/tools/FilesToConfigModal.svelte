<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import Dropzone from '$src/lib/components/Dropzone.svelte';
	import { buttonVariants } from '$src/lib/components/ui/button';
	import Button from '$src/lib/components/ui/button/button.svelte';
	import { Download, FileType } from '@lucide/svelte';

	let resultFile = $state<string | null>(null);

	function handleFiles(files: File[]) {
		let text = '';
		for (const file of files) {
			text += `\nSCHULE,"${file.name}",YYYY-MM-DD;YYYY-MM-DD;40`;
		}
		resultFile = text;
	}
</script>

<Dialog.Root>
	<Dialog.Trigger class={buttonVariants({ variant: 'outline' })}
		><FileType />Config Erstellen</Dialog.Trigger
	>
	<Dialog.Content class="min-h-72">
		<Dialog.Header>
			<Dialog.Title>Config-Template generieren</Dialog.Title>
		</Dialog.Header>
		<div class="pt-8 pb-4">
			<Dropzone {handleFiles} />
		</div>
		<Button
			disabled={!resultFile}
			onclick={() => {
				const blob = new Blob([resultFile!], { type: 'text/plain' });
				const url = URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = url;
				a.download = 'berichtgen.txt';
				a.click();
				URL.revokeObjectURL(url);
			}}
		>
			<Download />Herunterladen
		</Button>
	</Dialog.Content>
</Dialog.Root>
