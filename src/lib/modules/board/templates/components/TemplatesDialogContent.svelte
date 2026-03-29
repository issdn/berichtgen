<script lang="ts">
	import Authed from '$auth/components/Authed.svelte';
	import { getTemplates } from '$templates/api/templates.remote';
	import * as InputGroup from '$ui/input-group';
	import { SearchIcon } from '@lucide/svelte';
	import * as Dialog from '$ui/dialog/index.js';
	import { Toggle } from 'bits-ui';
	import TemplateList from './TemplateList.svelte';
	import TemplateUpload from './TemplateUpload.svelte';

	let search = $state('');
	let hideReported = $state(false);

	/**
	 * Single source of truth for all loaded pages.
	 * Each entry is an *unawaited* query object — TemplateList awaits them
	 * inside its `<svelte:boundary>` so the boundary's pending/failed snippets
	 * and `$effect.pending()` work correctly.
	 */
	let pages = $derived<ReturnType<typeof getTemplates>[]>([
		getTemplates({ search, hideReported })
	]);

	/**
	 * Reset to the first page whenever the filter state changes.
	 * The effect also runs on mount, but `getTemplates` caches by params so
	 * the same query object is reused — no duplicate network request.
	 */
	$effect(() => {
		pages = [getTemplates({ search, hideReported })];
	});

	/**
	 * Append the next page.
	 * Called by TemplateList when the user scrolls near the bottom of the list.
	 *
	 * @param afterId - ID of the last visible template, used as the cursor.
	 */
	function handleLoadMore(afterId: string) {
		pages = [...pages, getTemplates({ afterId, search, hideReported })];
	}
</script>

<Dialog.Content
	data-testid="templates-dialog"
	onInteractOutside={(e) => {
		if ((e.target as HTMLElement)?.closest('[data-sonner-toaster]')) {
			e.preventDefault();
		}
	}}
>
	<Dialog.Header>
		<Dialog.Title>Templates</Dialog.Title>
	</Dialog.Header>
	<div class="flex w-full flex-col gap-y-2">
		<InputGroup.Root>
			<InputGroup.Input placeholder="Suchen..." bind:value={search} />
			<InputGroup.Addon>
				<SearchIcon />
			</InputGroup.Addon>
		</InputGroup.Root>

		<div class="flex w-full gap-2">
			<Toggle.Root
				pressed={hideReported}
				onPressedChange={(v) => (hideReported = v)}
			>
				Gemeldete ausblenden
			</Toggle.Root>
		</div>

		<TemplateList {pages} onLoadMore={handleLoadMore} />

		<Authed>
			<!--
					pages[0] always contains the user's own templates (they're fetched
					regardless of pagination), so it's safe to use for duplicate-name
					checks and post-upload refresh.
				-->
			<TemplateUpload query={pages[0]} />
		</Authed>
	</div>
</Dialog.Content>
