<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { buttonVariants } from '$src/lib/components/ui/button';
	import TemplateList from '$src/lib/templates/TemplateList.svelte';
	import TemplateUpload from '$src/lib/templates/TemplateUpload.svelte';
	import type { UserContext } from '$src/lib/types';
	import { FileCode } from '@lucide/svelte';
	import { getContext } from 'svelte';

	let { user, supabase } = getContext<UserContext>('user')();
</script>

<Dialog.Root>
	<Dialog.Trigger class={buttonVariants({ variant: 'outline' })}
		><FileCode /> Templates</Dialog.Trigger
	>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Templates</Dialog.Title>
		</Dialog.Header>
		<div class="w-full">
			<TemplateList {supabase} />
			<TemplateUpload user={user!} {supabase} />
		</div>
	</Dialog.Content>
</Dialog.Root>
