<script lang="ts">
	import type { Snippet } from 'svelte';

	import { pasteStack } from '$core/stores/paste_stack.svelte';

	let {
		children,
		enabled = true,
		handlePaste
	}: {
		children: Snippet;
		enabled?: boolean;
		handlePaste: (e: ClipboardEvent) => Promise<void> | void;
	} = $props();

	let registered = $state(false);

	function register() {
		if (!registered) {
			pasteStack.push((cb) => {
				const active = document.activeElement;
				const isTextareaOrInputFocused =
					active instanceof HTMLTextAreaElement ||
					active instanceof HTMLInputElement;
				if (isTextareaOrInputFocused) return;

				handlePaste(cb);
			});
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
