<script lang="ts">
	import Dropzone from '$lib/components/Dropzone.svelte';
	import Howto from '$lib/components/Howto.svelte';
	import Wizard from './Wizard.svelte';

	let files = $state<FileList | null>(null);
</script>

<div class="h-main flex w-full flex-col px-8 pb-8 md:flex-row">
	<div class="h-full w-full">
		<Howto></Howto>
	</div>
	<div class="flex h-[calc(100%-1rem)] w-full flex-col gap-y-4">
		<div class="h-full w-full">
			<Dropzone bind:files></Dropzone>
		</div>
		<div class="h-full w-full">
			<Wizard {files} />
		</div>
	</div>
</div>
