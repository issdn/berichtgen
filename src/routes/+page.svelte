<script lang="ts">
	import Dropzone from '$lib/components/Dropzone.svelte';
	import Howto from '$lib/components/Howto.svelte';

	let files = $state<FileList | null>(null);
	$inspect(files);
</script>

<div class="flex h-full w-full flex-row p-8">
	<div class="h-full w-full">
		<Howto></Howto>
	</div>
	<div class="h-full w-full">
		<Dropzone bind:files></Dropzone>
	</div>
</div>
