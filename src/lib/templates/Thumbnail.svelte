<script lang="ts">
	import type { Database } from '$src/lib/database.types';
	import { parsePostgresDate } from '$src/lib/utils';
	import { FilePlus2, Flag, ImageOff, Shredder, View } from '@lucide/svelte';
	import { getQueryClientContext, createInfiniteQuery, createMutation, keepPreviousData } from '@tanstack/svelte-query';
	import { berichtgenStore } from '$src/lib/stores/berichtgen.svelte';
	import { PUBLIC_SUPABASE_URL } from '$env/static/public';
	import { Button } from '$src/lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { toast } from 'svelte-sonner';
	import { getContext } from 'svelte';
	import type { UserContext } from '../types';
	
	const {
		isPreferred,
		template,
		hasPendingReport = false
	}: {
		isPreferred: boolean;
		template: Database['public']['Tables']['template']['Row'];
		hasPendingReport?: boolean;
	} = $props();

	let { supabase, user } = getContext<UserContext>('user')();

	const context = getQueryClientContext();

	let reportMessage = $state('');
	let reportDialogOpen = $state(false);

	const itemsPerPage = 9;

	let search = $state('');

	async function deleteTemplate(storagePath: string) {
		// First delete from storage
		const { error } = await supabase.storage.from('templates').remove([storagePath]);
		if (error) {
			throw error;
		}

		await context.refetchQueries({ queryKey: ['template'] });
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
		mutationFn: ({ storagePath }: { id: string; storagePath: string }) => deleteTemplate(storagePath),
		onSuccess: () => {
			toast.success('Datei erfolgreich gelöscht.');
			query.refetch();
		},
		onError(error) {
			toast.error('Fehler beim Löschen der Datei.', { description: error.message });
		},
	}));

	const reportMutation = createMutation(() => ({
		mutationFn: async ({ templateId, message }: { templateId: string; message?: string }) => {
			const res = await fetch('/board/user/templates/report', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ template_id: templateId, message: message || undefined })
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.message ?? 'Unbekannter Fehler');
			}
		},
		onSuccess: () => {
			toast.success('Template gemeldet.');
			reportDialogOpen = false;
			reportMessage = '';
			context.refetchQueries({ queryKey: ['template'] });
		},
		onError(err) {
			toast.error('Fehler beim Melden.', { description: err.message });
		}
	}));

	const isSafe = $derived(template.safe_marked_at !== null);
	const isOwnTemplate = $derived(user?.id === template.user_id);

	const {name, filepath, thumbnailpath} = $derived.by(() => {
		const name = template.storage_path.split('/').at(-1);
		// Works only for public files
		const filepath = `${PUBLIC_SUPABASE_URL}/storage/v1/object/public/templates/${template.storage_path}`;
		const thumbnailpath = `${PUBLIC_SUPABASE_URL}/storage/v1/object/public/thumbnails/${template.thumbnail_path?.split('/').at(-1)}`;
		return { name, filepath, thumbnailpath };
	});
</script>

<button
	class={`group ${isPreferred ? 'bg-muted' : ''} border-primary-muted relative flex h-64 w-36 cursor-pointer flex-col justify-between gap-y-1 rounded-sm border p-1`}
>
	{#if hasPendingReport}
		<div class="absolute top-1 right-1 z-10 rounded bg-orange-500 px-1 py-0.5 text-xs text-white">
			Gemeldet
		</div>
	{/if}

	<div
		class="align-center absolute top-2 left-0 flex h-full w-full flex-row items-start justify-center gap-1 rounded-sm"
	>
		<Dialog.Root>
			<Dialog.Trigger>
				<Button variant="secondary">
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
			<Button variant="secondary" onclick={() => berichtgenStore.preferedTemplatePath = template.storage_path}>
				<FilePlus2 size={24} />
			</Button>
		{/if}

		{#if !isOwnTemplate && !isSafe}
			<Dialog.Root bind:open={reportDialogOpen}>
				<Dialog.Trigger>
					<Button variant="secondary" title="Template melden">
						<Flag size={24} />
					</Button>
				</Dialog.Trigger>
				<Dialog.Content class="sm:max-w-md">
					<Dialog.Header>
						<Dialog.Title>Template melden</Dialog.Title>
						<Dialog.Description>
							Melde dieses Template als potenziell schädlich. Die Meldung wird von einem Admin geprüft.
						</Dialog.Description>
					</Dialog.Header>
					<div class="flex flex-col gap-2 py-2">
						<textarea
							class="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
							placeholder="Optionale Nachricht (max. 1000 Zeichen)..."
							maxlength={1000}
							bind:value={reportMessage}
						></textarea>
					</div>
					<Dialog.Footer>
						<Button
							variant="destructive"
							disabled={reportMutation.isPending}
							onclick={() => reportMutation.mutate({ templateId: template.id, message: reportMessage })}
						>
							{#if reportMutation.isPending}
								Wird gemeldet...
							{:else}
								Melden
							{/if}
						</Button>
					</Dialog.Footer>
				</Dialog.Content>
			</Dialog.Root>
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
