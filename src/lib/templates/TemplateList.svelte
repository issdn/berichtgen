<script lang="ts">
	import Error from './Error.svelte';
	import { berichtgenStore } from '$src/lib/stores/berichtgen.svelte';
	import ScrollArea from '$src/lib/components/ui/scroll-area/scroll-area.svelte';
	import { Skeleton } from '$src/lib/components/ui/skeleton';
	import Template from '$src/lib/templates/Template.svelte';
	import { getTemplates } from './templates.remote';
	import { Spinner } from '../components/ui/spinner';

	type TemplateItem = Awaited<
		ReturnType<typeof getTemplates>
	>['templates'][number];

	const {
		query,
		cachedTemplates,
		onLoadMore,
		onTemplateDeleted,
		onTemplateReported
	}: {
		query: ReturnType<typeof getTemplates>;
		cachedTemplates: TemplateItem[];
		onLoadMore: (pageTemplates: TemplateItem[]) => void;
		onTemplateDeleted: (id: string) => void;
		onTemplateReported: (
			id: string,
			report: NonNullable<TemplateItem['template_report']>
		) => void;
	} = $props();

	const { templates: pageTemplates, hasMore } = $derived(await query);

	const allTemplates = $derived([...cachedTemplates, ...pageTemplates]);

	let lastScroll = 0;
</script>

<svelte:boundary>
	{#snippet pending()}
		<div class="flex flex-col">
			{#each { length: 4 } as _item, i (i)}
				<div class="flex items-center gap-3 px-2 py-1.5">
					<Skeleton class="size-8 shrink-0 rounded-full" />
					<div class="flex flex-1 flex-col gap-1.5">
						<Skeleton class="h-3.5 w-40 rounded" />
						<Skeleton class="h-3 w-24 rounded" />
					</div>
					<Skeleton class="h-8 w-8 rounded" />
				</div>
			{/each}
		</div>
	{/snippet}

	{#snippet failed(error)}
		<Error {error} />
	{/snippet}

	{#if allTemplates.length === 0}
		<p class="w-full text-center">Keine Templates gefunden 🥺</p>
	{:else}
		<ScrollArea
			type="auto"
			orientation="vertical"
			onscroll={(e) => {
				const el = e.target as HTMLDivElement;
				const near = el.scrollTop + el.clientHeight >= el.scrollHeight - 10;
				const down = el.scrollTop > lastScroll;
				lastScroll = el.scrollTop;
				if (near && down && hasMore) {
					onLoadMore(pageTemplates);
				}
			}}
			class="h-full w-full"
		>
			<ul class="flex h-48 flex-col">
				{#each allTemplates as template (template.id)}
					{@const isPreferred =
						berichtgenStore.preferedTemplatePath === template.storage_path}
					{@const hasPendingReport =
						(template.template_report?.length ?? 0) > 0}
					<Template
						profile={template.profile!}
						{isPreferred}
						{template}
						{hasPendingReport}
						{query}
						{onTemplateDeleted}
						{onTemplateReported}
					/>
				{/each}
			</ul>
			{#if hasMore && $effect.pending()}
				<div class="flex w-full items-center justify-center pt-2">
					<Spinner />
				</div>
			{/if}
		</ScrollArea>
	{/if}
</svelte:boundary>
