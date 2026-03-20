<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { buttonVariants } from '$src/lib/components/ui/button';
	import TemplateList from '$src/lib/templates/TemplateList.svelte';
	import TemplateUpload from '$src/lib/templates/TemplateUpload.svelte';
	import { FileCode, SearchIcon } from '@lucide/svelte';
	import * as InputGroup from '$src/lib/components/ui/input-group/index.js';
	import { Toggle } from '$src/lib/components/ui/toggle/index.js';
	import { getTemplates } from '$src/lib/templates/templates.remote';

	type TemplateItem = Awaited<
		ReturnType<typeof getTemplates>
	>['templates'][number];

	let search = $state('');
	let hideReported = $state(false);
	let lastId = $state<string | undefined>(undefined);
	let cachedTemplates = $state<TemplateItem[]>([]);

	const query = $derived(
		getTemplates({ afterId: lastId, search, hideReported })
	);

	function reset() {
		cachedTemplates = [];
		lastId = undefined;
	}

	function onLoadMore(pageTemplates: TemplateItem[]) {
		const existingIds = new Set(cachedTemplates.map((t) => t.id));
		cachedTemplates = [
			...cachedTemplates,
			...pageTemplates.filter((t) => !existingIds.has(t.id))
		];
		lastId = pageTemplates.at(-1)?.id ?? undefined;
	}

	function onTemplateDeleted(id: string) {
		cachedTemplates = cachedTemplates.filter((t) => t.id !== id);
	}

	function onTemplateReported(
		id: string,
		report: NonNullable<TemplateItem['template_report']>
	) {
		cachedTemplates = cachedTemplates.map((t) =>
			t.id === id ? { ...t, template_report: report } : t
		);
	}
</script>

<Dialog.Root>
	<Dialog.Trigger class={buttonVariants({ variant: 'outline' })}
		><FileCode /> Templates</Dialog.Trigger
	>
	<Dialog.Content
		onInteractOutside={(e) => {
			if ((e.target as HTMLElement)?.closest('[data-sonner-toaster]')) {
				e.preventDefault();
			}
		}}
	>
		<Dialog.Header>
			<Dialog.Title>Templates</Dialog.Title>
		</Dialog.Header>
		<div class="flex w-full flex-col gap-y-4 py-4">
			<InputGroup.Root>
				<InputGroup.Input
					placeholder="Suchen..."
					value={search}
					oninput={(e) => {
						search = (e.target as HTMLInputElement).value;
						reset();
					}}
				/>
				<InputGroup.Addon>
					<SearchIcon />
				</InputGroup.Addon>
			</InputGroup.Root>

			<div class="flex w-full gap-2">
				<Toggle
					size="sm"
					variant="outline"
					pressed={hideReported}
					onPressedChange={(v) => {
						hideReported = v;
						reset();
					}}
				>
					Gemeldete ausblenden
				</Toggle>
			</div>

			<TemplateList
				{query}
				{cachedTemplates}
				{onLoadMore}
				{onTemplateDeleted}
				{onTemplateReported}
			/>
			<TemplateUpload {query} />
		</div>
	</Dialog.Content>
</Dialog.Root>
