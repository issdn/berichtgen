<script lang="ts">
	import Arrow from '$lib/svg/Arrow.svelte';
	import DOCX from '$lib/svg/DOCX.svelte';
	import PDF from '$lib/svg/PDF.svelte';
	import PNG from '$lib/svg/PNG.svelte';
	import { ArrowRight, FileUp } from '@lucide/svelte';
</script>

<svelte:head>
	<title>***REMOVED***</title>
</svelte:head>

<div
	class="h-main flex w-full flex-col items-center justify-center overflow-x-clip px-8 pb-8 md:px-16 md:pb-0 lg:flex-row"
>
	<div class="flex h-[35vh] flex-col items-center justify-center lg:h-full lg:basis-2/5">
		<div class="flex flex-col gap-y-12">
			<div class="flex flex-col gap-y-2">
				<h1 class="font-[karla] text-5xl font-bold">Zu faul für Berichte? <br /> Fühl ich.</h1>
				<a href="/board" class="flex flex-row items-center text-2xl opacity-70">
					Dann lass sie von der KI erstellen!<ArrowRight size={36} class="animate-bob-right" />
				</a>
			</div>
			<div class="flex flex-col text-base">
				<p class="text-xl font-medium">
					<b class="text-4xl font-bold text-blue-300">4€</b> / ~1.400 Seiten
				</p>
				<p class="text-md opacity-80">oder <b class="text-blue-300">~2€</b> mit deinem API-Key</p>
			</div>
		</div>
	</div>
	<div
		class="relative mt-24 flex h-full w-full flex-col items-center justify-center lg:mt-0 lg:basis-3/5"
	>
		<div class="group flex h-full w-full flex-col items-center justify-center gap-y-6 lg:w-fit">
			<img
				class="absolute top-1/2 left-1/2 -z-10 h-[90vh] -translate-x-1/2 -translate-y-1/2 opacity-80 blur-[100px]"
				src="/blob.png"
				alt="blob"
			/>
			<div class="relative flex w-full flex-row justify-center">
				<div
					class="dropzone border-muted-foreground text-muted-foreground group-hover:border-foreground group-hover:text-foreground relative flex h-56 w-full max-w-96 flex-col items-center justify-center gap-y-2 rounded-md border-4 border-dashed text-sm transition-colors duration-300"
				>
					<div class="bg-foreground absolute top-0 left-0 h-full w-full opacity-15"></div>
					<FileUp class="opacity-50" size={48} />
					<p class="text-sm font-medium opacity-50">Dateien hier droppen</p>
					<PNG
						class="file absolute -top-[calc(50%-3rem)] -left-[calc(50%-1.5rem)] translate-x-1/2
							 transition-all duration-200 ease-in-out
							 group-hover:-top-[calc(50%-2rem)] group-hover:-left-[calc(50%-0.5rem)]"
					/>
					<DOCX
						class="file absolute -top-[calc(50%-1rem)] left-1/2 -translate-x-1/2
							 transition-all duration-200 ease-in-out
							 group-hover:-top-[calc(50%)]"
					/>
					<PDF
						class="file absolute -top-[calc(50%-4.5rem)] -right-[calc(50%-1rem)] -translate-x-1/2
							 transition-all duration-200 ease-in-out
							 group-hover:-top-[calc(50%-3.5rem)] group-hover:-right-[calc(50%)]"
					/>
				</div>
			</div>
			<Arrow />
			<div
				class="bg-foreground/95 text-background flex w-full max-w-136 flex-col gap-y-4 rounded-xl p-4 shadow-lg backdrop-blur-xl"
			>
				<div
					class="bg-foreground text-muted-foreground rounded-xl px-4 py-2 font-medium shadow-inner"
				>
					<p>www.berichtsheft.de</p>
				</div>
				<div
					class="border-foreground bg-foreground flex flex-col gap-y-2 rounded-xl border p-4 shadow-md"
				>
					<div
						class="border-background text-background mb-2 flex flex-row justify-between border-b pb-2 text-sm font-medium"
					>
						<p>
							ORT: <span class="group-hover:opacity-100 lg:opacity-0 lg:duration-300 lg:ease-in-out"
								>SCHULE</span
							>
						</p>
						<p>
							DATUM: <span
								class="group-hover:opacity-100 lg:opacity-0 lg:duration-300 lg:ease-in-out"
								>13.4.2025</span
							>
						</p>
					</div>
					<div
						class="bg-foreground text-background/90 relative h-48 overflow-hidden rounded-xl p-4 text-sm leading-relaxed shadow-inner transition-opacity"
					>
						<p
							class="group-hover:opacity-100 group-hover:duration-500 lg:opacity-0 lg:duration-200 lg:ease-in-out"
						>
							Im Fach C# Programmierung habe ich gelernt, wie man mit if-Bedingungen einfache
							Entscheidungsstrukturen programmiert. Im Fach Wirtschaft haben wir das Thema Angebot
							und Nachfrage behandelt und besprochen, wie Preise auf dem Markt entstehen. Im
							Rechnungswesen habe ich gelernt, wie man Buchungssätze bildet und Geschäftsvorfälle
							korrekt in die Bilanz einträgt.
						</p>
						<i
							class="text-muted-foreground absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-lg font-medium opacity-0 group-hover:opacity-0 lg:opacity-100 lg:duration-100 lg:ease-in-out"
						>
							Kein Eintrag!
						</i>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
