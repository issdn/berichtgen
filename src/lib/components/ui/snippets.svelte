<script lang="ts" module>
	import ErrorAlert from '$ui/ErrorAlert.svelte';

	export { failed };
</script>

{#snippet failed(error: unknown)}
	<ErrorAlert {error} />
{/snippet}
