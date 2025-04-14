<script lang="ts">
	import Highlight, { LineNumbers } from 'svelte-highlight';
	import language from 'svelte-highlight/languages/json';
	import githubDark from 'svelte-highlight/styles/github-dark';

	const code = JSON.stringify(
		{
			text: 'Im Laufe des Tages wurden zunächst Kaffee; eine optionale Beschäftigung mit Programmieraufgaben war ebenfalls vorgesehen.',
			ort: 'BETRIEB',
			qualifikationen: ['Programmieren von Softwarelösungen'],
			datum: '2025-04-14'
		},
		null,
		2
	);
</script>

<svelte:head>
	{@html githubDark}
</svelte:head>

<div class="h-main flex flex-col items-center justify-center px-8">
	<div class="flex h-full basis-1/5 flex-col items-center justify-end">
		<h1 class="text-center text-5xl font-bold">Zu faul für Berichte? Fühl ich.</h1>
		<p class="text-center text-xl opacity-70">Lass uns die Arbeit machen.</p>
	</div>
	<div class="relative h-full w-full basis-4/5">
		<div
			class="absolute left-1/2 top-12 flex w-96 -translate-x-1/2 flex-col rounded-md bg-muted p-1"
		>
			<div class="flex flex-row items-center p-2">
				<span class="font-mono text-sm font-bold text-muted-foreground">ergebnis.json</span>
			</div>
			<Highlight {language} {code} let:highlighted>
				<LineNumbers {highlighted} wrapLines hideBorder />
			</Highlight>
		</div>
	</div>
</div>
