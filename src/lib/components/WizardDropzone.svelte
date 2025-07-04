<script lang="ts">
	import Dropzone from '$src/lib/components/Dropzone.svelte';
	import { wizardScheduler } from '$lib/wizard_scheduler.svelte';
	import { countUserTokens } from '$src/lib/utils/token_counter';
	import { FileTypes, type UserContext } from '$src/lib/types';
	import { berichtgenStore } from '$src/lib/stores/berichtgen.svelte';
	import { toast } from 'svelte-sonner';
	import { getContext } from 'svelte';
	import { CONFIG_FILENAME } from '$src/lib/constants';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import Button from '$src/lib/components/ui/button/button.svelte';
	import { goto } from '$app/navigation';

	let { loggedIn } = getContext<UserContext>('user')();

	let error: string | null = $state(null);
	let dialogOpen = $derived(error !== null);

	function init(files: File[]) {
		const { files: otherFiles, configFile } = extractConfigFile(files);
		wizardScheduler.files = otherFiles;
		wizardScheduler.configFile = configFile;
		wizardScheduler.processInit = wizardScheduler.init();
	}

	function extractConfigFile(files: File[]): { files: File[]; configFile: File | null } {
		const configFile = files.find((file) => file.name === CONFIG_FILENAME) || null;
		const otherFiles = files.filter((file) => file.name !== CONFIG_FILENAME);
		return { files: otherFiles, configFile };
	}

	function handleFiles(files: File[]) {
		error = null;
		const filesArray = Array.from(files);
		const anyNonJsonFiles = filesArray.find((f) => f.type !== FileTypes.JSON);
		if (loggedIn) {
			const hasDiscount = berichtgenStore.currentProvider?.token != null;
			const { totalTokens } = countUserTokens(
				hasDiscount ? berichtgenStore.userTokens! / 4 : berichtgenStore.userTokens!,
				filesArray
			);
			if (totalTokens > berichtgenStore.userTokens!) {
				if (!anyNonJsonFiles) {
					if (berichtgenStore.rewordJSON === true) {
						berichtgenStore.rewordJSON = false;
						toast.info('JSON-Dateien Umformulierung wurde automatisch deaktiviert.');
					}
					init(files);
				} else {
					error = `Du hast ${berichtgenStore.userTokens} Tokens. Die Dateien, die du hochgeladen hast, benötigen ${totalTokens} Tokens.`;
					wizardScheduler.files = null;
				}
			} else {
				init(files);
			}
		} else {
			if (anyNonJsonFiles) {
				error =
					'Du musst angemeldet sein um andere Dateien parsen und umformulieren zu können! Bitte lade nur JSON-Dateien hoch.';
				wizardScheduler.files = null;
			} else {
				if (berichtgenStore.rewordJSON === true) {
					berichtgenStore.rewordJSON = false;
					toast.info('JSON-Dateien Umformulierung wurde automatisch deaktiviert.');
				}
				init(files);
			}
		}
	}
</script>

<Dropzone {handleFiles} />

<Dialog.Root bind:open={dialogOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Nicht genüg Tokens 🥲</Dialog.Title>
		</Dialog.Header>
		<div class="flex flex-col gap-y-2 pt-4">
			<p>{error}</p>
			<div class="flex w-full flex-row justify-end">
				<Button onclick={() => goto('/board/user/kauf')}>Tokens kaufen</Button>
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root>
