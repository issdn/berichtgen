<script lang="ts">
	import Spinner from '$src/lib/components/ui/Spinner.svelte';
	import type { Database } from '$src/lib/database.types';
	import type { SupabaseClient } from '@supabase/supabase-js';
	import { createQuery } from '@tanstack/svelte-query';

	const { supabase }: { supabase: SupabaseClient<Database> } = $props();

	async function fetchTemplates() {
		const { data, error } = await supabase.from('template').select('*');

		if (error) {
			throw error;
		}

		return data ?? [];
	}

	const templates = createQuery(() => ({
		queryKey: ['template'],
		queryFn: fetchTemplates
	}));
</script>

<div class="flex w-full flex-col items-center">
	{#if templates.isLoading}
		<Spinner size="md" />
	{:else if templates.isError}
		<p>Fehler beim Laden der Templates: {templates.error.message}</p>
	{:else if templates.data && templates.data.length === 0}
		<p>Keine Templates gefunden.</p>
	{:else if templates.data}
		<div class="max-h-64 overflow-y-auto pr-4">
			<ul class="grid h-full auto-cols-fr grid-cols-2 grid-rows-1 gap-1 sm:grid-cols-3">
				{#each templates.data as template}
					<div class="border-primary-muted flex flex-col gap-y-1 rounded-sm border p-1">
						<img
							alt="Thumbnail erster Seite"
							src={`http://127.0.0.1:54321/storage/v1/object/public/thumbnails/${template.thumbnail_path
								?.split('/')
								.at(-1)}`}
						/>
						<p class="line-clamp-2 text-sm overflow-ellipsis">
							{template.storage_path.split('/').at(-1)}
						</p>
					</div>
				{/each}
			</ul>
		</div>
	{/if}
</div>
