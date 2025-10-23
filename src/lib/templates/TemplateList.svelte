<script lang="ts">
	import Spinner from '$src/lib/components/ui/Spinner.svelte';
	import type { Database } from '$src/lib/database.types';
	import { parsePostgresDate } from '$src/lib/utils';
	import { ImageOff, SearchIcon } from '@lucide/svelte';
	import type { SupabaseClient } from '@supabase/supabase-js';
	import { createInfiniteQuery, keepPreviousData } from '@tanstack/svelte-query';
	import { fade } from 'svelte/transition';
	import * as InputGroup from '$src/lib/components/ui/input-group/index.js';

	const { supabase }: { supabase: SupabaseClient<Database> } = $props();

	const itemsPerPage = 9;

	let virtualListContainer: HTMLDivElement | null = $state(null);

	let search = $state('');

	async function fetchTemplates(page: number, nameFilter?: string) {
		let queryBuilder = supabase
			.from('template')
			.select('*')
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

	$effect(() => {
		if (virtualListContainer) {
			virtualListContainer.addEventListener('scroll', () => {
				const passedScrollThreshold =
					virtualListContainer!.scrollTop + virtualListContainer!.clientHeight >=
					virtualListContainer!.scrollHeight - 10;
				const scrollingDown = virtualListContainer!.scrollTop > lastScroll;

				lastScroll = virtualListContainer!.scrollTop;
				if (passedScrollThreshold && !query.isFetching && scrollingDown) {
					query.fetchNextPage();
				}
			});
		}
	});
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
		<div
			bind:this={virtualListContainer}
			class="flex max-h-64 flex-col items-center overflow-y-auto pr-4"
		>
			<ul class="grid h-full auto-cols-fr grid-cols-2 grid-rows-1 gap-1 sm:grid-cols-3">
				{#each query.data.pages as page}
					{#each page as template}
						<div
							class="border-primary-muted flex h-64 flex-col justify-between gap-y-1 rounded-sm border p-1"
						>
							{#if template.thumbnail_path}
								<img
									alt="Thumbnail erster Seite"
									src={`http://127.0.0.1:54321/storage/v1/object/public/thumbnails/${template.thumbnail_path
										?.split('/')
										.at(-1)}`}
								/>
							{:else}
								<div class="flex h-full w-full flex-col items-center justify-center">
									<ImageOff size={72} class="text-primary-foreground" />
								</div>
							{/if}
							<div class="flex w-full flex-col">
								<p class="line-clamp-1 text-sm overflow-ellipsis">
									{template.storage_path.split('/').at(-1)}
								</p>
								<p class="line-clamp-1 text-sm overflow-ellipsis">
									{#if template.updated_at !== null}
										Geä. am: {parsePostgresDate(template.updated_at)}
									{:else}
										Erst. am: {parsePostgresDate(template.created_at)}
									{/if}
								</p>
							</div>
						</div>
					{/each}
				{/each}
			</ul>
			{#if query.isFetchingNextPage}
				<div class="pt-4" transition:fade>
					<Spinner size="md" />
				</div>
			{/if}
		</div>
	{:else if query.isError}
		<p>Fehler beim Laden der Templates: {query.error.message}</p>
	{/if}
</div>
