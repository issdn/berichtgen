<script lang="ts">
	/**
	 * Story-only decorator that wires up the two runtime requirements
	 * TemplatesDialogContent has outside its own subtree:
	 *
	 *  1. A `Dialog.Root` ancestor — `Dialog.Content` is rendered by the
	 *     component itself, so the root must come from outside.
	 *  2. The user context — consumed by `Authed` and `Template`.
	 *
	 * Props control whether the simulated session is authenticated and,
	 * optionally, which user ID owns the "own" templates in the story.
	 */

	import { setUserContext } from '$core/auth/contexts';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { type Snippet } from 'svelte';

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

	setUserContext({
		user: loggedIn ? ({ id: userId, email: 'max@example.de' } as never) : null,
		profile: loggedIn
			? ({ id: userId, full_name: 'Max Mustermann', avatar_url: null } as never)
			: null,
		loggedIn,
		supabase: {} as never
	});
</script>

<Dialog.Root open={true}>
	{@render children()}
</Dialog.Root>
