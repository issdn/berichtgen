<script lang="ts">
	import DOCX from '$lib/svg/DOCX.svelte';
	import PDF from '$lib/svg/PDF.svelte';
	import PNG from '$lib/svg/PNG.svelte';
	import { FileUp } from 'lucide-svelte';
</script>

<div class="h-main flex flex-row items-center justify-center px-16">
	<div class="flex h-full flex-col justify-center">
		<h1 class="text-5xl font-bold">Zu faul für Berichte? Fühl ich.</h1>
		<p class="text-xl opacity-70">Automagisch generierte Berichte aus deinen Unterlagen.</p>
	</div>
	<div class="relative flex h-full w-full flex-col items-center justify-center">
		<div class="relative">
			<div class="dropzone relative flex h-56 w-96 flex-col items-center justify-center">
				<div class="absolute left-0 top-0 h-full w-full bg-foreground opacity-15"></div>
				<FileUp class="text-foreground opacity-50" size={48} />
				<p class="text-sm font-medium text-foreground opacity-50">Dateien hier droppen</p>
			</div>
			<PNG class="absolute -left-[calc(50%-1.5rem)] -top-[calc(50%-3rem)] translate-x-1/2" />
			<DOCX class="absolute -top-[calc(50%-1rem)] left-1/2 -translate-x-1/2" />
			<PDF class="absolute -right-[calc(50%-1rem)] -top-[calc(50%-4.5rem)] -translate-x-1/2" />
		</div>
		<img
			class="absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 opacity-80 blur-[100px]"
			src="/blob.png"
			alt="blob"
		/>
	</div>
</div>
