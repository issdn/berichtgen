<script lang="ts">
	import berichtgenStore from '$lib/stores/berichtgen.svelte';
	import type { getTemplates } from '$templates/api/templates.remote';
	import ErrorAlert from '$ui/ErrorAlert.svelte';
	import { Skeleton } from '$ui/skeleton';
	import { Spinner } from '$ui/spinner';
	import Template from './Template.svelte';
	import { ScrollArea } from '$ui/scroll-area';
	import ProgressBar from '$ui/ProgressBar.svelte';
	import * as Empty from '$ui/empty';

	/** Resolved type of a single template row. */
	type TemplateItem = Awaited<ReturnType<typeof getTemplates>>['templates'][number];

	/** Resolved page data shape. */
	type PageData = Awaited<ReturnType<typeof getTemplates>>;

	/** Discriminated union so error state is always explicit. */
	type PageResult =
		| { ok: true; data: PageData }
		| { ok: false; error: unknown };

	const {
		pages,
		onLoadMore,
		mutationCount = 0
	}: {
		/** Unawaited page queries owned by the parent. One entry per loaded page. */
		pages: ReturnType<typeof getTemplates>[];
		/** Called with the last template's ID when the user scrolls near the bottom. */
		onLoadMore: (afterId: string) => void;
		/** Number of in-flight mutations signalled by descendants via context. */
		mutationCount?: number;
	} = $props();

	/**
	 * Snapshot of the last resolved page result.
	 * null = nothing has loaded yet (first mount). Drives the outer state checks
	 * (skeleton / error / empty) so no async await is needed in the template.
	 */
	let lastPageSnapshot = $state<PageResult | null>(null);

	/**
	 * The page queries currently being rendered. Updated only AFTER the last page
	 * in `pages` resolves — never during the fetch. This keeps Template instances
	 * alive across filter changes and mutation-induced refetches, preventing the
	 * remount flicker that would occur if we switched render branches mid-flight.
	 *
	 * Because these are the same Promise objects held by `pages`, withOverride
	 * optimistic updates propagate to the {#await} blocks here as normal.
	 */
	let displayPages = $state<ReturnType<typeof getTemplates>[]>([]);

	/**
	 * True only while a list-level fetch is in flight (filter change or load-more).
	 * NOT driven by $effect.pending() — that fires for individual Template mutations
	 * too and would show the indicator at the wrong times.
	 */
	let isListLoading = $state(true);

	/**
	 * Prevents duplicate scroll-triggered load-more calls while a page is in-flight.
	 * Reset inside the resolution callback so `lastPageSnapshot` (and therefore the
	 * cursor) is always up-to-date before the next call is allowed.
	 */
	let pendingLoadMore = false;

	$effect(() => {
		isListLoading = true;
		// Capture now — `pages` may change again before the promise settles.
		const snapshot = pages;
		pages.at(-1)!
			.then((data) => {
				displayPages = snapshot;
				lastPageSnapshot = { ok: true, data };
				isListLoading = false;
				pendingLoadMore = false;
			})
			.catch((e) => {
				lastPageSnapshot = { ok: false, error: e };
				isListLoading = false;
				pendingLoadMore = false;
			});
	});

	/** Last observed scroll Y — used to detect downward-only scrolling. */
	let lastScrollY = 0;

	function handleScroll(e: Event) {
		if (!lastPageSnapshot?.ok) return;

		const el = e.target as HTMLDivElement;
		const near = el.scrollTop + el.clientHeight >= el.scrollHeight - 50;
		const down = el.scrollTop > lastScrollY;
		lastScrollY = el.scrollTop;

		if (near && down && lastPageSnapshot.data.hasMore && !pendingLoadMore) {
			const afterId = (lastPageSnapshot.data.templates as TemplateItem[]).at(-1)?.id;
			if (afterId) {
				pendingLoadMore = true;
				onLoadMore(afterId);
			}
		}
	}
</script>

<div class="relative w-full">
	<ProgressBar visible={isListLoading || mutationCount > 0} delay={150} />

	{#if lastPageSnapshot === null}
		<!-- First mount: synchronous skeleton, no boundary or async needed. -->
		<div class="flex flex-col">
			{#each { length: 4 } as _item, i (i)}
				<div data-testid="templates-skeleton" class="flex items-center gap-3 px-2 py-1.5">
					<Skeleton class="size-8 shrink-0 rounded-full" />
					<div class="flex flex-1 flex-col gap-1.5">
						<Skeleton class="h-3.5 w-40 rounded" />
						<Skeleton class="h-3 w-24 rounded" />
					</div>
					<Skeleton class="h-8 w-8 rounded" />
				</div>
			{/each}
		</div>
	{:else if !lastPageSnapshot.ok}
		<div class="flex h-48 items-center justify-center">
			<ErrorAlert error={lastPageSnapshot.error} />
		</div>
	{:else if lastPageSnapshot.data.templates.length === 0 && pages.length === 1 && !isListLoading}
		<div class="flex h-48 items-center justify-center">
			<Empty.Root>
				<Empty.Header>
					<Empty.Title>Keine Templates gefunden</Empty.Title>
					<Empty.Description>Lade ein Template hoch, um loszulegen.</Empty.Description>
				</Empty.Header>
			</Empty.Root>
		</div>
	{:else}
		<ScrollArea type="auto" orientation="vertical" onscroll={handleScroll} class="h-48 w-full">
			<!--
				Always rendered from displayPages — the same query objects that pages
				currently holds, but only swapped in after they resolve. This means:
				- Filter change / refetch: old queries stay in displayPages until the
				  new ones settle → Template instances never cross an {#if} boundary
				  → no remount flicker.
				- withOverride optimistic updates: since displayPages[i] === pages[i]
				  (same reference), the {#await} blocks react to overrides normally.
				- Dimming: applied as a CSS class when a fetch is in-flight for a
				  single page (filter change), not for load-more appends.
			-->
			<ul
				data-testid="templates-list"
				class="flex flex-col transition-opacity duration-150"
				class:opacity-50={isListLoading && pages.length === 1}
				class:pointer-events-none={isListLoading && pages.length === 1}
			>
				{#each displayPages as pageQuery, i (i)}
					{#await pageQuery then { templates }}
						{#each templates as template (template.id)}
							{@const isPreferred =
								berichtgenStore.get('preferredTemplatePath') === template.storage_path}
							{@const hasPendingReport = (template.template_report?.length ?? 0) > 0}
							<Template
								profile={template.profile!}
								{isPreferred}
								{template}
								{hasPendingReport}
								query={pageQuery}
							/>
						{/each}
					{/await}
				{/each}
			</ul>

			{#if isListLoading && pages.length > 1}
				<div class="flex w-full items-center justify-center py-2">
					<Spinner />
				</div>
			{/if}
		</ScrollArea>
	{/if}
</div>


