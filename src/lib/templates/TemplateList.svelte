<script lang="ts">
	import Spinner from '$src/lib/components/ui/Spinner.svelte';
	import { LOCALE, TIMEZONE } from '$src/lib/constants';
	import type { Database } from '$src/lib/database.types';
	import { parsePostgresDate } from '$src/lib/utils';
	import {
		DateFormatter,
		parseAbsolute,
		parseDateTime,
		parseZonedDateTime
	} from '@internationalized/date';
	import { ImageOff } from '@lucide/svelte';
	import type { SupabaseClient } from '@supabase/supabase-js';
	import { createInfiniteQuery } from '@tanstack/svelte-query';
	import { fade } from 'svelte/transition';

	const { supabase }: { supabase: SupabaseClient<Database> } = $props();

	const itemsPerPage = 9;

	let virtualListContainer: HTMLDivElement | null = $state(null);

	async function fetchTemplates(page: number) {
		const { data, error } = await supabase
			.from('template')
			.select('*')
			.order('created_at', { ascending: false })
			.order('updated_at', { ascending: false })
			.range(page * itemsPerPage, (page + 1) * itemsPerPage);

		if (error) {
			throw error;
		}

		return await new Promise<typeof data>((resolve) => setTimeout(() => resolve(data ?? []), 500));
	}

	const query = createInfiniteQuery(() => ({
		queryKey: ['template'],
		queryFn: ({ pageParam }) => fetchTemplates(pageParam),
		initialPageParam: 0,
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

<div class="flex w-full flex-col items-center">
	{#if query.data && query.data.pages.length === 0}
		<p>Keine Templates gefunden.</p>
	{:else if query.isSuccess}
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
	{/if}
	{#if query.isError}
		<p>Fehler beim Laden der Templates: {query.error.message}</p>
	{:else}
		<div class="h-6 py-4"></div>
	{/if}
</div>
