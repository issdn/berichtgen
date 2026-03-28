<script lang="ts">
	/**
	 * Story-only decorator that wires up the two runtime requirements
	 * TemplatesDialogContent has outside its own subtree:
	 *
	 *  1. A `Dialog.Root` ancestor — `Dialog.Content` is rendered by the
	 *     component itself, so the root must come from outside.
	 *  2. The `'user'` Svelte context — consumed by `Authed` and `Template`.
	 *
	 * Props control whether the simulated session is authenticated and,
	 * optionally, which user ID owns the "own" templates in the story.
	 */

	import type { UserContext } from '$auth/types';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { setContext, type Snippet } from 'svelte';

	const {
		children,
		loggedIn = false,
		userId = 'user-story-a'
	}: {
		children: Snippet;
		/** Whether the simulated session should be authenticated. */
		loggedIn?: boolean;
		/** User ID used for ownership checks (isOwnTemplate). */
		userId?: string;
	} = $props();

	setContext<UserContext>('user', () => ({
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		user: loggedIn ? ({ id: userId, email: 'max@example.de' } as any) : null,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		profile: loggedIn ? ({ id: userId, full_name: 'Max Mustermann', avatar_url: null } as any) : null,
		loggedIn,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		supabase: {} as any
	}));
</script>

<Dialog.Root open={true}>
	{@render children()}
</Dialog.Root>
