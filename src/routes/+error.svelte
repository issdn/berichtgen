<script>
	import { page } from '$app/state';
	import { Button } from '$ui/button';
	import { Home } from '@lucide/svelte';
</script>

<div class="h-main flex flex-col items-center justify-center">
	<h1 class="text-3xl">{page.status}</h1>
	<p>{page?.error?.message ?? 'Unbekannter Serverfehler.'}</p>
	<Button class="mt-8" variant="link" href="/board"><Home />Zurück</Button>
</div>
