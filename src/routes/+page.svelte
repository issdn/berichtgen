<script lang="ts">
	import Arrow from '$lib/svg/Arrow.svelte';
	import DOCX from '$lib/svg/DOCX.svelte';
	import PDF from '$lib/svg/PDF.svelte';
	import PNG from '$lib/svg/PNG.svelte';
	import { FileUp } from 'lucide-svelte';
</script>

<div
	class="h-main flex w-full flex-col items-center justify-center overflow-x-clip px-8 pb-8 md:px-16 md:pb-0 lg:flex-row"
>
	<div class="flex h-[35vh] flex-row items-center justify-center lg:h-full lg:basis-2/5">
		<div class="flex flex-col gap-y-2">
			<h1 class="font-[karla] text-5xl font-bold">Zu faul für Berichte? <br /> Fühl ich.</h1>
			<p class="text-2xl opacity-70">Dann lass sie von der KI erstellen!</p>
		</div>
	</div>
	<div
		class="relative mt-24 flex h-full w-full flex-col items-center justify-center gap-y-6 lg:mt-0 lg:basis-3/5"
	>
		<img
			class="absolute left-1/2 top-1/2 -z-10 h-[90vh] -translate-x-1/2 -translate-y-1/2 opacity-80 blur-[100px]"
			src="/blob.png"
			alt="blob"
		/>
		<div class="group relative flex w-full flex-row justify-center">
			<div
				class="dropzone relative flex h-56 w-full max-w-96 flex-col items-center justify-center gap-y-2 rounded-md border-4 border-dashed border-muted-foreground text-sm text-muted-foreground transition-colors duration-300 group-hover:border-foreground group-hover:text-foreground"
			>
				<div class="absolute left-0 top-0 h-full w-full bg-foreground opacity-15"></div>
				<FileUp class="opacity-50" size={48} />
				<p class="text-sm font-medium opacity-50">Dateien hier droppen</p>
				<PNG
					class="file absolute -left-[calc(50%-1.5rem)] -top-[calc(50%-3rem)] translate-x-1/2
						 transition-all duration-200 ease-in-out 
						 group-hover:-left-[calc(50%-0.5rem)] group-hover:-top-[calc(50%-2rem)]"
				/>
				<DOCX
					class="file absolute -top-[calc(50%-1rem)] left-1/2 -translate-x-1/2
						 transition-all duration-200 ease-in-out	 
						 group-hover:-top-[calc(50%)]"
				/>
				<PDF
					class="file absolute -right-[calc(50%-1rem)] -top-[calc(50%-4.5rem)] -translate-x-1/2
						 transition-all duration-200 ease-in-out 
						 group-hover:-right-[calc(50%)] group-hover:-top-[calc(50%-3.5rem)]"
				/>
			</div>
		</div>
		<Arrow />
		<div
			class="flex w-full max-w-[34rem] flex-col gap-y-4 rounded-xl bg-foreground/95 p-4 text-background shadow-lg backdrop-blur-xl"
		>
			<div
				class="rounded-xl bg-foreground px-4 py-2 font-medium text-muted-foreground shadow-inner"
			>
				<p>www.berichtsheft.de</p>
			</div>
			<div
				class="flex flex-col gap-y-2 rounded-xl border border-foreground bg-foreground p-4 shadow-md"
			>
				<div
					class="mb-2 flex flex-row justify-between border-b border-background pb-2 text-sm font-medium text-background"
				>
					<p>ORT: SCHULE</p>
					<p>DATUM: 13.4.2025</p>
				</div>
				<div
					class="rounded-xl bg-foreground p-4 text-sm leading-relaxed text-background/90 shadow-inner"
				>
					<p>
						Im Fach C# Programmierung habe ich gelernt, wie man mit if-Bedingungen einfache
						Entscheidungsstrukturen programmiert. Im Fach Wirtschaft haben wir das Thema Angebot und
						Nachfrage behandelt und besprochen, wie Preise auf dem Markt entstehen. Im
						Rechnungswesen habe ich gelernt, wie man Buchungssätze bildet und Geschäftsvorfälle
						korrekt in die Bilanz einträgt.
					</p>
				</div>
			</div>
		</div>
	</div>
</div>
