<script lang="ts">
	import { cn } from '$lib/utils';

	const {
		visible = true,
		delay = 0,
		class: className
	}: {
		visible?: boolean;
		/** Milliseconds to wait before showing. Prevents flash for fast operations. */
		delay?: number;
		class?: string;
	} = $props();

	let show = $derived(delay === 0 && visible);

	$effect(() => {
		if (!visible) {
			show = false;
			return;
		}
		if (delay === 0) {
			show = true;
			return;
		}
		const t = setTimeout(() => {
			show = true;
		}, delay);
		return () => clearTimeout(t);
	});
</script>

{#if show}
	<div data-testid="templates-loading-bar" class={cn('h-0.5 w-full overflow-hidden', className)}>
		<div class="animate-nav-beam bg-primary h-full w-1/3"></div>
	</div>
{/if}
