<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { superForm } from 'sveltekit-superforms/client';
	import { Trash2 } from 'lucide-svelte';
	import { Input } from '$lib/components/ui/input/index.js';
	import Button from '$lib/components/ui/button/button.svelte';
	import ProviderAddDialog from './ProviderAddDialog.svelte';
	import { toast } from 'svelte-sonner';
	import { zod, zodClient } from 'sveltekit-superforms/adapters';
	import { providerDeleteSchema, validProviderSchema } from './schema';
	import { incuriaStore } from '$lib/stores/board.svelte';

	let { data } = $props();

	let action: 'delete' | 'add' = 'delete';

	const form = superForm(data.form, {
		clearOnSubmit: 'errors',
		dataType: 'json',
		validators: zodClient(validProviderSchema),
		validationMethod: 'oninput',
		onSubmit({ validators }) {
			if (action === 'delete') validators(zod(providerDeleteSchema));
			else validators(zod(validProviderSchema));
		},
		onError({ result }) {
			toast.error(result.error.message);
		},
		onUpdate({ result, cancel }) {
			if (result.type === 'failure') {
				toast.error(
					result.data?.form?.errors?.token?.[0] ??
						result.data?.form?.message ??
						'Unbekannter Fehler.'
				);
				cancel();
			}
		},
		onUpdated({ form }) {
			if (form.valid) {
				incuriaStore.providers = incuriaStore.providers.map((provider) => {
					if (provider.id === form.data.id)
						return { ...{ ...provider, token: null }, ...form.data };
					return provider;
				});
				toast.success(form.message);
			}
		}
	});

	const { form: formData, enhance, formId, submitting, submit } = form;
</script>

<div class="flex flex-row md:px-64">
	<Card.Root class="w-full">
		<Card.Header>
			<Card.Title>Deine LLM-Verpküpfungen</Card.Title>
			<Card.Description>Hier kannst du deine eigene API-Keys hinzufügen.</Card.Description>
		</Card.Header>
		<Card.Content>
			<form id="provider-form" class="flex w-full flex-col gap-y-2" method="POST" use:enhance>
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head class="w-32">Provider</Table.Head>
							<Table.Head>Token</Table.Head>
							<Table.Head></Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each incuriaStore.providers as provider}
							{@const hasToken = provider.token !== null && provider.token.length > 0}
							<Table.Row>
								<Table.Cell>
									{provider.name}
								</Table.Cell>
								<Table.Cell>
									{hasToken ? provider.token : '---'}
								</Table.Cell>
								<Table.Cell class="flex flex-row justify-end gap-x-2">
									{#if hasToken}
										<Button
											disabled={$submitting}
											type="submit"
											formaction="/board/settings?/delete"
											onclick={() => {
												$formId = $formData.id = provider.id;
												$formData.name = provider.name;
												action = 'delete';
											}}
											variant="ghost"><Trash2 /></Button
										>
									{:else}
										<ProviderAddDialog
											onSubmit={() => {
												action = 'add';
											}}
											{form}
											{provider}
										/>
									{/if}
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</form>
		</Card.Content>
	</Card.Root>
</div>
