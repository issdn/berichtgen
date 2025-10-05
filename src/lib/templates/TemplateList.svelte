<script lang="ts">
	import type { SupabaseClient } from '@supabase/supabase-js';
	import { createQuery } from '@tanstack/svelte-query';

	const { supabase }: { supabase: SupabaseClient } = $props();

	async function fetchTemplates() {
		const { data, error } = await supabase.from('template').select('userId, name, username');

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

<div class="w-full">
	{#if templates.isLoading}
		<p>Lade Templates...</p>
	{:else if templates.isError}
		<p>Fehler beim Laden der Templates: {templates.error.message}</p>
	{:else if templates.data && templates.data.length === 0}
		<p>Keine Templates gefunden.</p>
	{:else if templates.data}
		<ul class="list-inside list-disc">
			{#each templates.data as template}
				<li>{template.name} (Hochgeladen von: {template.username})</li>
			{/each}
		</ul>
	{/if}
</div>
