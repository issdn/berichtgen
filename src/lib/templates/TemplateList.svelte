<script lang="ts">
	import { untrack } from 'svelte';
	import ErrorAlert from './ErrorAlert.svelte';
	import { berichtgenStore } from '$src/lib/stores/berichtgen.svelte';
	import ScrollArea from '$src/lib/components/ui/scroll-area/scroll-area.svelte';
	import { Skeleton } from '$src/lib/components/ui/skeleton';
	import Template from '$src/lib/templates/Template.svelte';
	import { getTemplates } from './templates.remote';
	import { Spinner } from '../components/ui/spinner';

	/** Resolved type of a single template row. */
	type TemplateItem = Awaited<
		ReturnType<typeof getTemplates>
	>['templates'][number];

	const {
		pages,
		onLoadMore
	}: {
		/** Unawaited page queries owned by the parent. One entry per loaded page. */
		pages: ReturnType<typeof getTemplates>[];
		/** Called with the last template's ID when the user scrolls near the bottom. */
		onLoadMore: (afterId: string) => void;
	} = $props();

	/**
	 * Resolved data from the last page — drives the empty-state check and the
	 * scroll-gate (hasMore + cursor ID).
	 *
	 * Svelte's synchronized-update guarantee keeps this at the previous resolved
	 * value while the latest page is still in flight, so the scroll handler
	 * never reads an inconsistent intermediate state.
	 */
	const lastPageData = $derived(await pages.at(-1)!);

	/** Last observed scroll Y — used to detect downward-only scrolling. */
	let lastScrollY = 0;

	/**
	 * Plain (non-reactive) flag set when a load-more request has been sent but
	 * the new page has not yet appeared in the `pages` prop.
	 *
	 * NOTE: `$effect.pending()` only works in reactive contexts (template /
	 * `$derived` / `$effect`). Inside an event handler it is always `false`,
	 * so it cannot guard against duplicate scroll-triggered calls. We use this
	 * plain variable instead.
	 */
	let pendingLoadMore = false;

	/**
	 * Clear the load-more guard whenever the `pages` prop changes — either
	 * because a new page was appended (load-more resolved) or because the
	 * Dialog reset the list on filter change.
	 */
	$effect(() => {
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		pages; // reactive read — re-run on any pages change
		untrack(() => {
			pendingLoadMore = false;
		});
	});

	/**
	 * Trigger load-more when the user scrolls within 50 px of the bottom
	 * while moving downward. `pendingLoadMore` prevents duplicate calls while
	 * the next page is still in flight.
	 */
	function handleScroll(e: Event) {
		const el = e.target as HTMLDivElement;
		const near = el.scrollTop + el.clientHeight >= el.scrollHeight - 50;
		const down = el.scrollTop > lastScrollY;
		lastScrollY = el.scrollTop;

		if (near && down && lastPageData.hasMore && !pendingLoadMore) {
			const afterId = (lastPageData.templates as TemplateItem[]).at(-1)?.id;
			if (afterId) {
				pendingLoadMore = true;
				onLoadMore(afterId);
			}
		}
	}
</script>

<svelte:boundary>
	<!--
		Shown only on the very first mount of this boundary, while the initial
		page query is resolving. Subsequent async work (filter changes, load-more)
		is indicated by `$effect.pending()` in the content below.
	-->
	{#snippet pending()}
		<div class="flex flex-col">
			{#each { length: 4 } as _item, i (i)}
				<div
					data-testid="templates-skeleton"
					class="flex items-center gap-3 px-2 py-1.5"
				>
					<Skeleton class="size-8 shrink-0 rounded-full" />
					<div class="flex flex-1 flex-col gap-1.5">
						<Skeleton class="h-3.5 w-40 rounded" />
						<Skeleton class="h-3 w-24 rounded" />
					</div>
					<Skeleton class="h-8 w-8 rounded" />
				</div>
			{/each}
		</div>
	{/snippet}

	{#snippet failed(error)}
		<ErrorAlert {error} />
	{/snippet}

	<!--
		Empty state: only shown once the first page has resolved with zero
		results and no fetch is still in flight (which would change that).
	-->
	{#if lastPageData.templates.length === 0 && pages.length === 1 && !$effect.pending()}
		<p class="w-full text-center">Keine Templates gefunden 🥺</p>
	{:else}
		<!--
			h-48 on the ScrollArea viewport (not the ul) so the scrollable
			content can grow beyond 192 px and the spinner at the bottom
			is always reachable by scrolling.
		-->
		<ScrollArea
			type="auto"
			orientation="vertical"
			onscroll={handleScroll}
			class="h-48 w-full"
		>
			<ul data-testid="templates-list" class="flex flex-col">
				<!--
					Each entry is awaited individually inside the boundary so that:
					- The pending snippet fires only on first mount.
					- Subsequent page fetches set $effect.pending() instead.
					- withOverride optimistic updates in Template.svelte are scoped
					  to the correct page query.
					Index is a safe key because pages only append or fully reset.
				-->
				{#each pages as pageQuery, i (i)}
					{@const { templates } = await pageQuery}
					{#each templates as template (template.id)}
						{@const isPreferred =
							berichtgenStore.preferedTemplatePath === template.storage_path}
						{@const hasPendingReport =
							(template.template_report?.length ?? 0) > 0}
						<Template
							profile={template.profile!}
							{isPreferred}
							{template}
							{hasPendingReport}
							query={pageQuery}
						/>
					{/each}
				{/each}
			</ul>

			<!--
				Spinner is INSIDE the scrollable content so it is reachable when
				the list is full. Shown for both filter refetches and load-more.
				Not shown during initial load — the pending snippet handles that.
			-->
			{#if $effect.pending()}
				<div class="flex w-full items-center justify-center py-2">
					<Spinner />
				</div>
			{/if}
		</ScrollArea>
	{/if}
</svelte:boundary>
