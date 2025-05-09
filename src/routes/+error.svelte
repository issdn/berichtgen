<script>
	import { page } from '$app/state';
</script>

<div class="h-main flex flex-col items-center justify-center">
	<h1>{page.status}</h1>
	<p>{page?.error?.message ?? 'Unbekannter Serverfehler.'}</p>
</div>
