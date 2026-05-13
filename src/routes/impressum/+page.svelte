<script>
	import CopyButton from '$board/components/CopyButton.svelte';
	import { Button } from '$ui/button';
</script>

<div class="h-main flex w-full flex-col items-center justify-center">
	<div class="flex flex-col gap-y-2">
		<h1 class="text-xl">Impressum</h1>
		<div>
			<p class="text-muted-foreground">Anbieter</p>
			<p>Karol Bielski Software</p>
			<p>Auf der Lieth 174</p>
			<p>33100 Paderborn</p>
		</div>

		<div>
			<p class="text-muted-foreground">Kontakt</p>
			<p>
				<strong>Telefon:</strong><Button
					variant="link"
					href="tel:+4917645809457">+49 176 45809457</Button
				>
			</p>
			<p>
				<strong>E-Mail:</strong><Button
					variant="link"
					href="mailto:contact@karolbielski.com"
					>contact@karolbielski.com</Button
				>
			</p>
		</div>
		<CopyButton
			// eslint-disable-next-line svelte/no-useless-mustaches
			text={'Karol Bielski Software\nAuf der Lieth 174\n33100 Paderborn\n+49 176 45809457\ncontact@karolbielski.com'}
			>Kopieren</CopyButton
		>
	</div>
</div>
