<script lang="ts">
	import Dropzone from '$lib/components/Dropzone.svelte';
	import Howto from '$lib/components/Howto.svelte';
	import Wizard from './Wizard.svelte';

	const { data } = $props();
</script>

<div class="h-main flex w-full flex-col gap-x-8 gap-y-8 px-8 pb-8 md:flex-row">
	<div class="h-full w-full">
		<Howto />
	</div>
	<div class="flex h-[calc(100%-1rem)] w-full flex-col gap-y-4">
		<div class="h-full w-full">
			<Dropzone userTokens={data.tokenCount} />
		</div>
		<div class="h-full w-full">
			<Wizard />
		</div>
	</div>
</div>
