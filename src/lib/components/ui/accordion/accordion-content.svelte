<script lang="ts">
	import { Accordion as AccordionPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: AccordionPrimitive.ContentProps = $props();
</script>

<AccordionPrimitive.Content
	bind:ref
	class="data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden text-sm"
	{...restProps}
>
	<div class={cn('pt-0 pb-4', className)}>
		{@render children?.()}
	</div>
</AccordionPrimitive.Content>
