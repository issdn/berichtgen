<script lang="ts">
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { ***REMOVED***Error, toErrorBody } from '$lib/errors';
	import type { WithElementRef } from '$lib/utils';
	import type { HTMLAttributes } from 'svelte/elements';

	const {
		error,
		...restProps
	}: { error: unknown } & WithElementRef<HTMLAttributes<HTMLDivElement>> =
		$props();

	const typeSafeError = $derived(
		error instanceof ***REMOVED***Error ? error.apiError : toErrorBody(error)
	);
</script>

<Alert.Root {...restProps} variant="destructive">
	<Alert.Title>{typeSafeError.message}</Alert.Title>
	{#if typeSafeError.cause}
		<Alert.Description>
			{typeSafeError.cause}
		</Alert.Description>
	{/if}
</Alert.Root>
