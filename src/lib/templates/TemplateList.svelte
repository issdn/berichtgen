<script lang="ts">
	import type { Database } from '$src/lib/database.types';
	import { parsePostgresDate } from '$src/lib/utils';
	import { FileCheck2, FilePlus, FilePlus2, ImageOff, SearchIcon, Shredder } from '@lucide/svelte';
	import type { SupabaseClient } from '@supabase/supabase-js';
	import { createInfiniteQuery, createMutation, keepPreviousData } from '@tanstack/svelte-query';
	import { fade } from 'svelte/transition';
	import * as InputGroup from '$src/lib/components/ui/input-group/index.js';
	import { berichtgenStore } from '$src/lib/stores/berichtgen.svelte';
	import { PUBLIC_SUPABASE_URL } from '$env/static/public';
	import ScrollArea from '$src/lib/components/ui/scroll-area/scroll-area.svelte';
	import { Spinner } from '$src/lib/components/ui/spinner';
	import { Button } from '$src/lib/components/ui/button';

	const { supabase }: { supabase: SupabaseClient<Database> } = $props();

	const itemsPerPage = 9;

	let search = $state('');

	function setPreferedTemplate(path: string) {
		berichtgenStore.preferedTemplatePath = path;
	}

	async function deleteTemplate(id: string) {
		const { error } = await supabase.from('template').delete().eq('id', id);
		if (error) {
			throw error;
		}
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

	const deleteMutation = createMutation(() => ({
		mutationFn: (id: string) => deleteTemplate(id),
		onSuccess: () => {
			query.refetch();
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
				{#each query.data.pages as page}
					{#each page as template}
						{@const isPreferred = berichtgenStore.preferedTemplatePath === template.storage_path}
						<div
							class={`group ${isPreferred ? 'bg-muted' : ''} border-primary-muted relative flex h-64 w-36 flex-col justify-between gap-y-1 rounded-sm border p-1`}
						>
							{#if !isPreferred}
								<div
									class="align-center absolute top-0 left-0 flex h-full w-full flex-row items-start justify-end gap-1 rounded-sm p-2"
								>
									<Button variant="secondary" onclick={() => deleteMutation.mutate(template.id)}>
										<Shredder size={24} />
									</Button>
									<Button
										variant="secondary"
										onclick={() => setPreferedTemplate(template.storage_path)}
									>
										<FilePlus2 size={24} />
									</Button>
								</div>
							{/if}
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
							<div class="flex w-full flex-col">
								<p class="w-full overflow-hidden text-left text-sm text-nowrap overflow-ellipsis">
									{template.storage_path.split('/').at(-1)}
								</p>
								<p class="w-full text-left text-sm overflow-ellipsis">
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
				<div class="flex w-full flex-row justify-center pt-4" transition:fade>
					<Spinner class="size-6" />
				</div>
			{/if}
		</ScrollArea>
	{:else if query.isError}
		<p>Fehler beim Laden der Templates: {query.error.message}</p>
	{/if}
</div>
