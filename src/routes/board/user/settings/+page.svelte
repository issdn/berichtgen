<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { superForm } from 'sveltekit-superforms/client';
	import { HandCoins, Trash2, UserRoundX } from 'lucide-svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import ProviderAddDialog from './ProviderAddDialog.svelte';
	import { toast } from 'svelte-sonner';
	import { zod, zodClient } from 'sveltekit-superforms/adapters';
	import { berichtgenStore } from '$src/lib/stores/berichtgen.svelte';
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import { buttonVariants } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { providerDeleteSchema, validProviderSchema } from '$src/lib/schemas';

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
				berichtgenStore.providers = berichtgenStore.providers.map((provider) => {
					if (provider.id === form.data.id)
						return { ...{ ...provider, token: null }, ...form.data };
					return provider;
				});
				toast.success(form.message);
			}
		}
	});

	const { form: formData, enhance: tokenEnhance, formId, submitting } = form;
</script>

<svelte:head>
	<title>Einstellungen | ***REMOVED***</title>
</svelte:head>

<div class="flex flex-row justify-center">
	<div class="flex w-full max-w-[700px] flex-col gap-y-8">
		<Card.Root>
			<Card.Header>
				<Card.Title>Konto Einstellungen</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="flex flex-col gap-y-2">
					<form
						id="delete-account-form"
						action="/board/user/settings?/removeAccount"
						class="flex w-full flex-col gap-y-2"
						method="POST"
					>
						<AlertDialog.Root>
							<AlertDialog.Trigger
								type="button"
								class={buttonVariants({ variant: 'default', class: 'w-fit' })}
							>
								<UserRoundX />
								Konto löschen
							</AlertDialog.Trigger>
							<AlertDialog.Content>
								<AlertDialog.Header>
									<AlertDialog.Title>Bist du sicher?</AlertDialog.Title>
									<p class="text-red-500">
										Dieser Vorgang ist unumkehrbar. Dies wird dein Konto und deine Daten entfernen.
									</p>
									{#if berichtgenStore.userTokens !== null && berichtgenStore.userTokens > 0}
										<p
											class="flex flex-row items-center gap-x-1 text-red-500 [&_span]:text-red-500"
										>
											Deine <Badge variant="default"
												><HandCoins
													size={16}
													class="text-red-500"
												/>{berichtgenStore.userTokens}</Badge
											> Tokens werden ebenfalls gelöscht.
										</p>
									{/if}
								</AlertDialog.Header>
								<AlertDialog.Footer>
									<AlertDialog.Cancel>Abbrechen</AlertDialog.Cancel>
									<AlertDialog.Action
										class={buttonVariants({ variant: 'destructive' })}
										form="delete-account-form"
										type="submit">Löschen</AlertDialog.Action
									>
								</AlertDialog.Footer>
							</AlertDialog.Content>
						</AlertDialog.Root>
					</form>
				</div>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Header>
				<Card.Title>Deine LLM-Verpküpfungen</Card.Title>
				<Card.Description>Hier kannst du deine eigene API-Keys hinzufügen.</Card.Description>
			</Card.Header>
			<Card.Content>
				<form
					id="provider-form"
					class="flex w-full flex-col gap-y-2"
					method="POST"
					use:tokenEnhance
				>
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head class="w-32">Provider</Table.Head>
								<Table.Head>Token</Table.Head>
								<Table.Head></Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each berichtgenStore.providers as provider}
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
												formaction="/board/user/settings?/delete"
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
</div>
