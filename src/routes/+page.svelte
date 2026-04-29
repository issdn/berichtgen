<script lang="ts">
	import Arrow from '$ui/svg/Arrow.svelte';
	import DOCX from '$ui/svg/DOCX.svelte';
	import PDF from '$ui/svg/PDF.svelte';
	import PNG from '$ui/svg/PNG.svelte';
	import { FileUp, Lock } from '@lucide/svelte';
</script>

<svelte:head>
	<title>Berichtgen</title>
</svelte:head>

<div
	class="h-main flex w-full flex-col items-center justify-center overflow-x-clip px-8 pb-8 md:px-16 md:pb-0 lg:flex-row"
>
	<div class="flex flex-col items-center justify-center lg:h-full lg:basis-2/5">
		<div class="flex flex-col gap-y-24">
			<div class="flex flex-col">
				<h1 class="font-[karla] text-5xl leading-tight font-bold">
					Monate nachschreiben <br /> in Sekunden.
				</h1>
				<p class="text-muted-foreground text-lg">
					KI-Automatisierung für deine Ausbildungsnachweise.
				</p>
			</div>
			<div class="flex flex-col gap-y-1 text-base">
				<p class="text-xl font-medium">
					<b class="text-4xl font-bold text-queer-blue">5€</b> / ~700 Seiten
				</p>
				<p class="text-md opacity-80">
					oder <a
						href="https://codeberg.org/isdn/Berichtgen"
						target="_blank"
						rel="noopener noreferrer"
						class="font-semibold text-queer-blue underline underline-offset-2 transition-opacity hover:opacity-80"
						>kostenlos</a
					> selbst gehostet
				</p>
			</div>
		</div>
	</div>
	<div
		class="relative flex h-full w-full flex-col items-center justify-center py-12 lg:mt-0 lg:basis-3/5"
	>
		<div
			class="group flex h-full w-full flex-col items-center justify-center gap-y-6 lg:w-fit"
		>
			<img
				class="absolute top-1/2 left-1/2 -z-10 h-[90vh] -translate-x-1/2 -translate-y-1/2 opacity-80 blur-[100px]"
				src="/blob.png"
				alt="blob"
			/>
			<div class="relative flex w-full flex-row justify-center">
				<div
					class="dropzone border-muted-foreground text-muted-foreground group-hover:border-foreground group-hover:text-foreground relative flex h-56 w-full max-w-96 flex-col items-center justify-center gap-y-2 rounded-md border-4 border-dashed text-sm transition-colors duration-300"
				>
					<div
						class="bg-foreground absolute top-0 left-0 h-full w-full opacity-15"
					></div>
					<FileUp class="opacity-50" size={48} />
					<p class="text-sm font-medium opacity-50">Dateien hier droppen</p>
					<PNG
						class="file absolute -top-[calc(50%-3rem)] -left-[calc(50%-1.5rem)] translate-x-1/2
							 transition-all duration-200 ease-in-out
							 drop-shadow-[0_4px_8px_rgba(0,0,0,0.35)]
							 group-hover:-top-[calc(50%-2rem)] group-hover:-left-[calc(50%-0.5rem)]
							 group-hover:drop-shadow-[0_16px_32px_rgba(0,0,0,0.12)]"
					/>
					<DOCX
						class="file absolute -top-[calc(50%-1rem)] left-1/2 -translate-x-1/2
							 transition-all duration-200 ease-in-out
							 drop-shadow-[0_4px_8px_rgba(0,0,0,0.35)]
							 group-hover:-top-[calc(50%)]
							 group-hover:drop-shadow-[0_16px_32px_rgba(0,0,0,0.12)]"
					/>
					<PDF
						class="file absolute -top-[calc(50%-4.5rem)] -right-[calc(50%-1rem)] -translate-x-1/2
							 transition-all duration-200 ease-in-out
							 drop-shadow-[0_4px_8px_rgba(0,0,0,0.35)]
							 group-hover:-top-[calc(50%-3.5rem)] group-hover:-right-[calc(50%)]
							 group-hover:drop-shadow-[0_16px_32px_rgba(0,0,0,0.12)]"
					/>
				</div>
			</div>
			<Arrow />
			<div
				class="bg-foreground/95 text-background flex w-full max-w-136 flex-col overflow-hidden rounded-xl shadow-lg backdrop-blur-xl"
			>
				<!-- Browser chrome -->
				<div class="bg-foreground flex flex-col gap-y-2 px-3 pt-3 pb-2">
					<!-- Title bar: traffic lights + tabs -->
					<div class="flex flex-row items-center gap-x-2">
						<!-- Traffic lights -->
						<div class="flex shrink-0 flex-row items-center gap-x-1.5">
							<span class="h-3 w-3 rounded-full bg-red-400/70"></span>
							<span class="h-3 w-3 rounded-full bg-yellow-400/70"></span>
							<span class="h-3 w-3 rounded-full bg-green-400/70"></span>
						</div>
						<!-- Address bar -->
						<div
							class="bg-background/10 text-muted-foreground flex flex-1 items-center gap-x-1.5 rounded-md px-3 py-1 text-xs font-medium"
						>
							<Lock size={13} class="shrink-0 opacity-50" />
							www.berichtsheft.de
						</div>
					</div>
				</div>
				<!-- Content area -->
				<div class="flex flex-col gap-y-4 p-4">
					<div
						class="border-foreground bg-foreground flex flex-col gap-y-2 rounded-xl border p-4 shadow-md"
					>
						<div
							class="border-background text-background mb-2 flex flex-row justify-between border-b pb-2 text-sm font-medium"
						>
							<p>
								ORT: <span
									class="group-hover:opacity-100 lg:opacity-0 lg:duration-300 lg:ease-in-out"
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
								Im Fach C# Programmierung habe ich gelernt, wie man mit
								if-Bedingungen einfache Entscheidungsstrukturen programmiert. Im
								Fach Wirtschaft haben wir das Thema Angebot und Nachfrage
								behandelt und besprochen, wie Preise auf dem Markt entstehen. Im
								Rechnungswesen habe ich gelernt, wie man Buchungssätze bildet
								und Geschäftsvorfälle korrekt in die Bilanz einträgt.
							</p>
							<i
								class="text-muted-foreground absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-lg font-medium opacity-0 group-hover:opacity-0 lg:opacity-100 lg:duration-100 lg:ease-in-out"
							>
								Kein Eintrag!
							</i>
						</div>
					</div>
				</div>
				<!-- end content area -->
			</div>
		</div>
	</div>
</div>
