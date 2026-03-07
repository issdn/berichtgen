<script lang="ts">
	import type { Database } from '$src/lib/database.types';
	import { parsePostgresDate } from '$src/lib/utils';
	import { FilePlus2, ImageOff, Shredder, View } from '@lucide/svelte';
	import type { SupabaseClient } from '@supabase/supabase-js';
	import { createInfiniteQuery, createMutation, keepPreviousData } from '@tanstack/svelte-query';
	import { berichtgenStore } from '$src/lib/stores/berichtgen.svelte';
	import { PUBLIC_SUPABASE_URL } from '$env/static/public';
	import { Button } from '$src/lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog/index.js';

	const {
		supabase,
		isPreferred,
		template
	}: {
		supabase: SupabaseClient<Database>;
		isPreferred: boolean;
		template: Database['public']['Tables']['template']['Row'];
	} = $props();

	const itemsPerPage = 9;

	let search = $state('');

	function setPreferedTemplate(path: string) {
		berichtgenStore.preferedTemplatePath = path;
	}

	async function deleteTemplate(id: string, storagePath: string) {
		// First delete from storage
		const { error: storageError } = await supabase.storage.from('templates').remove([storagePath]);
		if (storageError) {
			throw storageError;
		}

		// Then delete the template record
		const { error } = await supabase.storage.from('templates').remove([storagePath]);
			if (storageError) {
				throw storageError;
			}
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
		mutationFn: ({ id, storagePath }: { id: string; storagePath: string }) => deleteTemplate(id, storagePath),
		onSuccess: () => {
			query.refetch();
		}
	}));

	const name = template.storage_path.split('/').at(-1);

	// Works only for public files
	const filepath = `${PUBLIC_SUPABASE_URL}/storage/v1/object/public/templates/${template.storage_path}`;

	const thumbnailpath = `${PUBLIC_SUPABASE_URL}/storage/v1/object/public/thumbnails/${template.thumbnail_path
		?.split('/')
		.at(-1)}`;
</script>

<button
	class={`group ${isPreferred ? 'bg-muted' : ''} border-primary-muted relative flex h-64 w-36 cursor-pointer flex-col justify-between gap-y-1 rounded-sm border p-1`}
>
	<div
		class="align-center absolute top-2 left-0 flex h-full w-full flex-row items-start justify-center gap-1 rounded-sm"
	>
		<Dialog.Root>
			<Dialog.Trigger>
				<Button variant="secondary" onclick={() => deleteMutation.mutate({ id: template.id, storagePath: template.storage_path })}>
					<View size={24} />
				</Button>
			</Dialog.Trigger>
			<Dialog.Content class="h-[calc(100%-6rem)] sm:max-w-[calc(100%-6rem)]">
				<div class="h-full w-full pt-4">
					<iframe
						class="h-full w-full rounded-xl border-0"
						allowfullscreen={true}
						title={name}
						src={`https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(filepath)}`}
					></iframe>
				</div>
			</Dialog.Content>
		</Dialog.Root>

		{#if !isPreferred}
			<Button variant="secondary" onclick={() => deleteMutation.mutate({ id: template.id, storagePath: template.storage_path })}>
				<Shredder size={24} />
			</Button>
			<Button variant="secondary" onclick={() => setPreferedTemplate(template.storage_path)}>
				<FilePlus2 size={24} />
			</Button>
		{/if}
	</div>
	{#if template.thumbnail_path}
		<img alt={name} src={thumbnailpath} />
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
</button>
