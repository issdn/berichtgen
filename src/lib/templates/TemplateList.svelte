<script lang="ts">
	import { SearchIcon } from '@lucide/svelte';
	import { createInfiniteQuery, keepPreviousData } from '@tanstack/svelte-query';
	import { fade } from 'svelte/transition';
	import * as InputGroup from '$src/lib/components/ui/input-group/index.js';
	import { berichtgenStore } from '$src/lib/stores/berichtgen.svelte';
	import ScrollArea from '$src/lib/components/ui/scroll-area/scroll-area.svelte';
	import { Spinner } from '$src/lib/components/ui/spinner';
	import Thumbnail from '$src/lib/templates/Thumbnail.svelte';
	import { getContext } from 'svelte';
	import type { UserContext } from '../types';

	let { supabase } = getContext<UserContext>('user')();

	const itemsPerPage = 9;

	let search = $state('');

	async function fetchTemplates(page: number, nameFilter?: string) {
		let queryBuilder = supabase
			.from('template')
			.select('*, template_report(id, status)')
			.order('created_at', { ascending: false })
			.order('updated_at', { ascending: false })
			.range(page * itemsPerPage, (page + 1) * itemsPerPage);

		if (nameFilter) {
			queryBuilder = queryBuilder.ilike('storage_path', `%${nameFilter}%`);
		}

		const { data, error } = await queryBuilder;

		if (error) {
			throw error;
		}

		return await new Promise<typeof data>((resolve) => setTimeout(() => resolve(data ?? []), 500));
	}

	const query = createInfiniteQuery(() => ({
		queryKey: ['template', search],
		queryFn: ({ pageParam }) => fetchTemplates(pageParam, search),
		initialPageParam: 0,
		placeholderData: keepPreviousData,
		getNextPageParam: (lastPage, allPages) => {
			if (lastPage.length < itemsPerPage) {
				return undefined;
			}
			return allPages.length;
		}
	}));

	let lastScroll = 0;
</script>

<div class="flex w-full flex-col items-center gap-y-4">
	<InputGroup.Root>
		<InputGroup.Input placeholder="Suchen..." bind:value={search} />
		<InputGroup.Addon>
			<SearchIcon />
		</InputGroup.Addon>
	</InputGroup.Root>
	{#if query.data && query.data.pages.length === 0}
		<p>Wir haben noch keine Templates 🥺</p>
	{:else if query.data?.pages}
		<ScrollArea
			type="auto"
			orientation="vertical"
			onscroll={(e) => {
				const virtualListContainer = e.target as HTMLDivElement;
				const passedScrollThreshold =
					virtualListContainer!.scrollTop + virtualListContainer!.clientHeight >=
					virtualListContainer!.scrollHeight - 10;
				const scrollingDown = virtualListContainer!.scrollTop > lastScroll;

				lastScroll = virtualListContainer!.scrollTop;
				if (passedScrollThreshold && !query.isFetching && scrollingDown) {
					query.fetchNextPage();
				}
			}}
			class="flex max-h-64 w-full flex-col items-center pr-4"
		>
			<ul
				class="grid h-full grid-cols-[repeat(auto-fit,minmax(144px,1fr))] justify-items-center gap-1"
			>
				{#if query.data.pages[0]?.length === 0}
					<p>Keine Templates gefunden.</p>
				{/if}
				{#each query.data.pages as page, i (i)}
					{#each page as template (template.id)}
						{@const isPreferred = berichtgenStore.preferedTemplatePath === template.storage_path}
						{@const hasPendingReport = template.template_report?.some((r) => r.status === 'pending') ?? false}
						<Thumbnail {isPreferred} {template} {hasPendingReport} />
					{/each}
				{/each}
			</ul>
			{#if query.isFetchingNextPage}
				<div class="flex w-full flex-row justify-center pt-4" transition:fade>
					<Spinner class="size-6" />
				</div>
			{/if}
		</ScrollArea>
	{:else if query.isError}
		<p>Fehler beim Laden der Templates: {query.error.message}</p>
	{/if}
</div>
