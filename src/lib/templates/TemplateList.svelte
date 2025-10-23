<script lang="ts">
	import type { Database } from '$src/lib/database.types';
	import { parsePostgresDate } from '$src/lib/utils';
	import { ImageOff, SearchIcon } from '@lucide/svelte';
	import type { SupabaseClient } from '@supabase/supabase-js';
	import { createInfiniteQuery, keepPreviousData } from '@tanstack/svelte-query';
	import { fade } from 'svelte/transition';
	import * as InputGroup from '$src/lib/components/ui/input-group/index.js';
	import { berichtgenStore } from '$src/lib/stores/berichtgen.svelte';
	import { PUBLIC_SUPABASE_URL } from '$env/static/public';
	import ScrollArea from '$src/lib/components/ui/scroll-area/scroll-area.svelte';
	import { Spinner } from '$src/lib/components/ui/spinner';

	const { supabase }: { supabase: SupabaseClient<Database> } = $props();

	const itemsPerPage = 9;

	let search = $state('');

	function setPreferedTemplate(path: string) {
		berichtgenStore.preferedTemplatePath = path;
	}

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
			class="flex max-h-64 flex-col items-center pr-4"
		>
			<ul class="grid h-full auto-cols-fr grid-cols-2 grid-rows-1 gap-1 sm:grid-cols-3">
				{#each query.data.pages as page}
					{#each page as template}
						<button
							onclick={() => setPreferedTemplate(template.storage_path)}
							class="border-primary-muted hover: flex h-64 cursor-pointer flex-col justify-between gap-y-1 rounded-sm border p-1"
						>
							{#if template.thumbnail_path}
								<img
									alt="Thumbnail erster Seite"
									src={`${PUBLIC_SUPABASE_URL}/storage/v1/object/public/thumbnails/${template.thumbnail_path
										?.split('/')
										.at(-1)}`}
								/>
							{:else}
								<div class="flex h-full w-full flex-col items-center justify-center">
									<ImageOff size={72} class="text-primary-foreground" />
								</div>
							{/if}
							<div class="flex w-full flex-col items-start">
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
						</button>
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
