<script lang="ts">
	import type { Snippet } from 'svelte';
	import { pasteStack } from '$lib/stores/paste_stack.svelte';

	let {
		handlePaste,
		enabled = true,
		children
	}: {
		handlePaste: (e: ClipboardEvent) => void | Promise<void>;
		enabled?: boolean;
		children: Snippet;
	} = $props();

	let registered = $state(false);

	function register() {
		if (!registered) {
			pasteStack.push(handlePaste);
			registered = true;
		}
	}

	function unregister() {
		if (registered) {
			pasteStack.pop();
			registered = false;
		}
	}

	$effect(() => {
		if (enabled) {
			register();
			return unregister;
		}
		unregister();
	});
</script>

{@render children()}
