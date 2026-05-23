<script lang="ts">
	import { CloudAlert } from '@lucide/svelte';
	import * as Empty from '$lib/components/ui/empty/index.js';
	import { BerichtgenError, toErrorBody } from '$lib/errors';
	import type { WithElementRef } from '$lib/utils';
	import type { HTMLAttributes } from 'svelte/elements';

	const {
		error,
		...restProps
	}: { error: unknown } & WithElementRef<HTMLAttributes<HTMLDivElement>> =
		$props();

	const typeSafeError = $derived(
		error instanceof BerichtgenError ? error.apiError : toErrorBody(error)
	);
</script>

<Empty.Root
	{...restProps}
	class="border-destructive/40 bg-destructive/5 text-destructive"
>
	<Empty.Media variant="icon" class="bg-destructive/10 text-destructive">
		<CloudAlert class="size-4" />
	</Empty.Media>
	<Empty.Header>
		<Empty.Title>{typeSafeError.message}</Empty.Title>
		{#if typeSafeError.cause}
			<Empty.Description class="text-destructive/90">
				{typeSafeError.cause}
			</Empty.Description>
		{/if}
	</Empty.Header>
</Empty.Root>
