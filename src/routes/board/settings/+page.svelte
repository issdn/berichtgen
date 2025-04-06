<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { superForm } from 'sveltekit-superforms/client';
	import { Trash2 } from 'lucide-svelte';
	import { Input } from '$lib/components/ui/input/index.js';
	import Button from '$lib/components/ui/button/button.svelte';
	import ProviderAddDialog from './ProviderAddDialog.svelte';
	import { toast } from 'svelte-sonner';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import { providerSchema } from './schema';

	let { data } = $props();

	const form = superForm(data.form, {
		clearOnSubmit: 'errors',
		dataType: 'json',
		validators: zodClient(providerSchema),
		validationMethod: 'oninput',
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
				toast.success(form.message);
			}
		}
	});

	const { form: formData, enhance, formId, submitting } = form;
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
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each data.providers as provider}
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
										<Input name="id" type="hidden"></Input>
										<Button
											disabled={$submitting}
											type="submit"
											formaction="/board/settings?/delete"
											onclick={() => {
												$formId = $formData.id = provider.id;
												$formData.name = provider.name;
											}}
											variant="ghost"><Trash2 /></Button
										>
									{:else}
										<ProviderAddDialog {form} {provider} />
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
