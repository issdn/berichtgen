<script lang="ts">
	import Error from './Error.svelte';

	import { SearchIcon } from '@lucide/svelte';
	import * as InputGroup from '$src/lib/components/ui/input-group/index.js';
	import { berichtgenStore } from '$src/lib/stores/berichtgen.svelte';
	import ScrollArea from '$src/lib/components/ui/scroll-area/scroll-area.svelte';
	import { Skeleton } from '$src/lib/components/ui/skeleton';
	import Thumbnail from '$src/lib/templates/Thumbnail.svelte';
	import { getTemplates } from './templates.remote';
	import Spinner from '../components/ui/Spinner.svelte';

	const ITEMS_PER_PAGE = 9;

	let limit = $state(ITEMS_PER_PAGE);
	let search = $state('');
	let lastScroll = 0;

	const { templates, hasMore } = $derived(
		await getTemplates({ limit, search })
	);
</script>

<div class="flex w-full flex-col items-center gap-y-4">
	<InputGroup.Root>
		<InputGroup.Input
			placeholder="Suchen..."
			value={search}
			oninput={(e) => {
				search = (e.target as HTMLInputElement).value;
				limit = ITEMS_PER_PAGE;
			}}
		/>
		<InputGroup.Addon>
			<SearchIcon />
		</InputGroup.Addon>
	</InputGroup.Root>

	<svelte:boundary>
		{#snippet pending()}
			<div class="flex w-full flex-wrap gap-2">
				{#each { length: 3 } as _item, i (i)}
					<Skeleton class="h-50.75 w-36 shrink-0 rounded-sm" />
				{/each}
			</div>
		{/snippet}

		{#snippet failed(error)}
			<Error {error} />
		{/snippet}

		{#if templates.length === 0}
			<p>Wir haben noch keine Templates 🥺</p>
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
						limit += ITEMS_PER_PAGE;
					}
				}}
				class="h-50.75 w-full"
			>
				<ul class="flex h-full flex-wrap gap-2">
					{#each templates as template (template.id)}
						{@const isPreferred =
							berichtgenStore.preferedTemplatePath === template.storage_path}
						{@const hasPendingReport =
							template.template_report?.some((r) => r.status === 'pending') ??
							false}
						<Thumbnail
							profile={template.profile}
							{isPreferred}
							{template}
							{hasPendingReport}
						/>
					{/each}
				</ul>
				{#if hasMore}
					<div class="flex w-full items-center justify-center pt-2">
						<Spinner />
					</div>
				{/if}
			</ScrollArea>
		{/if}
	</svelte:boundary>
</div>
