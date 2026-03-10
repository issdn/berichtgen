<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { buttonVariants } from '$src/lib/components/ui/button';
	import TemplateList from '$src/lib/templates/TemplateList.svelte';
	import TemplateUpload from '$src/lib/templates/TemplateUpload.svelte';
	import { FileCode } from '@lucide/svelte';
</script>

<Dialog.Root>
	<Dialog.Trigger class={buttonVariants({ variant: 'outline' })}
		><FileCode /> Templates</Dialog.Trigger
	>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Templates</Dialog.Title>
		</Dialog.Header>
		<div class="flex w-full flex-col gap-y-4 py-4">
			<TemplateList />
			<TemplateUpload />
		</div>
	</Dialog.Content>
</Dialog.Root>
