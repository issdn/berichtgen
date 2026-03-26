<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { buttonVariants } from '$src/lib/components/ui/button';
	import TemplateUpload from '$src/lib/templates/TemplateUpload.svelte';
	import { FileCode, SearchIcon } from '@lucide/svelte';
	import * as InputGroup from '$src/lib/components/ui/input-group/index.js';
	import { Toggle } from '$src/lib/components/ui/toggle/index.js';
	import { getTemplates } from '$src/lib/templates/templates.remote';
	import Authed from '../components/Authed.svelte';
	import TemplateList from './TemplateList.svelte';

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

<Dialog.Root>
	<Dialog.Trigger
		data-testid="templates-dialog-trigger"
		class={buttonVariants({ variant: 'outline' })}
		><FileCode /> Templates</Dialog.Trigger
	>
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
				<Toggle
					size="sm"
					variant="outline"
					pressed={hideReported}
					onPressedChange={(v) => (hideReported = v)}
				>
					Gemeldete ausblenden
				</Toggle>
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
</Dialog.Root>
