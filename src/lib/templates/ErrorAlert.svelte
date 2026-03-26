<script lang="ts">
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { toErrorBody } from '../errors';

	const { error }: { error: unknown } = $props();

	const typeSafeError = $derived(toErrorBody(error));
</script>

<Alert.Root variant="destructive">
	<Alert.Title>{typeSafeError.message}</Alert.Title>
	{#if typeSafeError.cause}
		<Alert.Description>
			{typeSafeError.cause}
		</Alert.Description>
	{/if}
</Alert.Root>
