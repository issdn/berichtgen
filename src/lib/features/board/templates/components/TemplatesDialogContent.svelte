<script lang="ts">
	import Authed from '$auth/components/Authed.svelte';
	import { getTemplates } from '$templates/api/templates.remote';
	import * as InputGroup from '$ui/input-group';
	import { SearchIcon, X } from '@lucide/svelte';
	import * as Dialog from '$ui/dialog/index.js';
	import TemplateList from './TemplateList.svelte';
	import TemplateUpload from './TemplateUpload.svelte';
	import { Toggle } from '$ui/toggle';
	import { debounce } from '$lib/utils';
	import { setTemplatesMutationContext } from '../contexts';
	import { Separator } from '$ui/separator';

	/** Counts in-flight mutations (delete / report / unreport / upload). Read by TemplateList. */
	let mutationCount = $state(0);
	setTemplatesMutationContext({
		start: () => mutationCount++,
		end: () => mutationCount--
	});

	/** Raw value bound to the input — updates on every keystroke. */
	let searchInput = $state('');
	/** Debounced value used for queries — only updates after the user stops typing. */
	let search = $state('');
	let hideReported = $state(false);

	const applySearch = debounce((v: string) => {
		search = v;
	});

	$effect(() => {
		applySearch(searchInput);
		return () => applySearch.cancel();
	});

	/**
	 * Single source of truth for all loaded pages.
	 * Each entry is an *unawaited* query object — TemplateList awaits them
	 * inside its `<svelte:boundary>` so the boundary's pending/failed snippets
	 * and `$effect.pending()` work correctly.
	 */
	/**
	 * Single source of truth for all loaded pages.
	 * Resets automatically to a single page whenever `search` or `hideReported`
	 * changes (overridable-derived pattern). `handleLoadMore` overrides the value
	 * by appending a new page; the next filter change resets it back.
	 */
	let pages = $derived<ReturnType<typeof getTemplates>[]>([
		getTemplates({ search, hideReported })
	]);

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
			<InputGroup.Addon>
				<SearchIcon />
			</InputGroup.Addon>
			<InputGroup.Input placeholder="Suchen..." bind:value={searchInput} />
			{#if searchInput}
				<InputGroup.Addon align="inline-end">
					<InputGroup.Button
						size="icon-xs"
						class="rounded-full"
						aria-label="Suche löschen"
						onclick={() => {
							applySearch.cancel();
							searchInput = '';
							search = '';
						}}
					>
						<X />
					</InputGroup.Button>
				</InputGroup.Addon>
			{/if}
		</InputGroup.Root>

		<div class="flex w-full gap-2">
			<Toggle
				pressed={hideReported}
				onPressedChange={(v) => (hideReported = v)}
			>
				Gemeldete ausblenden
			</Toggle>
		</div>

		<TemplateList {pages} onLoadMore={handleLoadMore} {mutationCount} />

		<Separator />

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
