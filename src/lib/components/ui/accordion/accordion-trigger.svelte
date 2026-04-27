<script lang="ts">
	import { Accordion as AccordionPrimitive } from 'bits-ui';
	import { ChevronDown } from '@lucide/svelte';
	import { cn } from '$lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: AccordionPrimitive.TriggerProps = $props();
</script>

<AccordionPrimitive.Header class="flex">
	<AccordionPrimitive.Trigger
		bind:ref
		class={cn(
			'focus-visible:ring-ring focus-visible:ring-offset-background data-[state=open]:text-foreground flex flex-1 items-center justify-between py-4 text-left text-sm font-medium transition-all hover:underline focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
			className
		)}
		{...restProps}
	>
		{@render children?.()}
		<ChevronDown
			class="text-muted-foreground pointer-events-none size-4 shrink-0 transition-transform duration-200 data-[state=open]:rotate-180"
		/>
	</AccordionPrimitive.Trigger>
</AccordionPrimitive.Header>
