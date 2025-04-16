<script lang="ts">
	import DOCX from '$lib/svg/DOCX.svelte';
	import PDF from '$lib/svg/PDF.svelte';
	import PNG from '$lib/svg/PNG.svelte';
</script>

<div class="h-main flex flex-row items-center justify-center px-16">
	<div class="flex h-full flex-col justify-center">
		<h1 class="text-5xl font-bold">Zu faul für Berichte? Fühl ich.</h1>
		<p class="text-xl opacity-70">Automagisch generierte Berichte aus deinen Unterlagen.</p>
	</div>
	<div class="relative h-full w-full">
		<DOCX />
		<PDF />
		<PNG />
	</div>
</div>
