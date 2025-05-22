<script lang="ts">
	import { Plus } from 'lucide-svelte';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { buttonVariants } from '$lib/components/ui/button/button.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import type { ProviderSchemaType } from './schema';
	import type { SuperForm } from 'sveltekit-superforms/client';
	import * as Form from '$lib/components/ui/form/index.js';

	let {
		provider,
		form,
		onSubmit
	}: {
		provider: Omit<ProviderSchemaType, 'token'> & { token: ProviderSchemaType['token'] | null };
		form: SuperForm<ProviderSchemaType>;
		onSubmit: () => void;
	} = $props();

	let { submitting, form: data, formId, errors } = form;

	let open = $state(false);
</script>

<Dialog.Root bind:open>
	<Dialog.Trigger
		disabled={$submitting}
		onclick={() => {
			$formId = provider.id;
			$data = { ...provider };
		}}
		type="button"
		class={buttonVariants({ variant: 'ghost' })}><Plus /></Dialog.Trigger
	>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>{provider.name} Token hinzufügen</Dialog.Title>
		</Dialog.Header>
		<Form.Field {form} name="token">
			<Form.Control>
				{#snippet children({ props })}
					<Input {...props} bind:value={$data.token} class="w-full" disabled={$submitting} />
				{/snippet}
			</Form.Control>
			<Form.FieldErrors />
		</Form.Field>
		<div class="flex flex-row justify-end gap-x-2">
			<Button type="button" variant="ghost" onclick={() => (open = false)}>Abbrechen</Button>
			<Button
				disabled={$submitting || ($errors.token?.length ?? 0) > 0}
				form="provider-form"
				type="submit"
				formaction="/board/user/settings?/add"
				onclick={() => {
					$formId = provider.id;
					onSubmit();
					open = false;
				}}>Speichern</Button
			>
		</div>
	</Dialog.Content>
</Dialog.Root>
