<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { superForm } from 'sveltekit-superforms/client';
	import { HandCoins, Trash2, UserRoundX, Save, User } from '@lucide/svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import ProviderAddDialog from './ProviderAddDialog.svelte';
	import { toast } from 'svelte-sonner';
	import { zod4, zod4Client } from 'sveltekit-superforms/adapters';
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import { buttonVariants } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { providerDeleteSchema, userMetadataSchema, validProviderSchema } from '$src/lib/schemas';

	let { data } = $props();

	let action: 'delete' | 'add' = 'delete';

	const providerForm = $derived(superForm(data.providerForm, {
		clearOnSubmit: 'errors',
		dataType: 'json',
		validators: zod4Client(validProviderSchema),
		validationMethod: 'oninput',
		invalidateAll: true,
		onSubmit({ validators }) {
			if (action === 'delete') validators(zod4(providerDeleteSchema));
			else validators(zod4(validProviderSchema));
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
				toast.success(form.message);
			}
		}
	}));

	const userMetadataForm = $derived(superForm(data.userMetadataForm, {
		dataType: 'json',
		validators: zod4Client(userMetadataSchema),
		validationMethod: 'oninput',
		resetForm: false,
		invalidateAll: true,
		onError({ result }) {
			toast.error(result.error.message);
		},
		onUpdated({ form }) {
			if (form.valid) {
				toast.success(form.message);
			}
		}
	}));

	const { form: providerFormData, enhance: tokenEnhance, formId, submitting: providerSubmitting } = providerForm;
	const { form: metadataFormData, enhance: metadataEnhance, submitting: metadataSubmitting } = userMetadataForm;
</script>

<svelte:head>
	<title>Einstellungen | ***REMOVED***</title>
</svelte:head>

<div class="flex flex-row justify-center h-full">
	<div class="flex w-full max-w-175 flex-col gap-y-8">
	
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
							{#each data.providers as provider(provider.id)}
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
												disabled={$providerSubmitting}
												type="submit"
												formaction="/board/user/settings?/delete"
												onclick={() => {
													$formId = $providerFormData.id = provider.id;
													$providerFormData.name = provider.name;
													action = 'delete';
												}}
												variant="ghost"><Trash2 /></Button
											>
										{:else}
											<ProviderAddDialog
												onSubmit={() => {
													action = 'add';
												}}
												form={providerForm}
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
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<User size={20} />
					Profildaten
				</Card.Title>
				<Card.Description>
					Deine persönlichen Daten für die Berichtsgenerierung.
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<form
					id="metadata-form"
					class="flex w-full flex-col gap-y-4"
					method="POST"
					action="/board/user/settings?/updateMetadata"
					use:metadataEnhance
				>
					<div class="grid gap-2">
						<Label for="fullName">Voller Name</Label>
						<Input
							id="fullName"
							name="fullName"
							type="text"
							placeholder="Max Mustermann"
							bind:value={$metadataFormData.fullName}
						/>
					</div>
					<div class="grid gap-2">
						<Label for="ausbildungsberuf">Ausbildungsberuf</Label>
						<Input
							id="ausbildungsberuf"
							name="ausbildungsberuf"
							type="text"
							placeholder="Fachinformatiker für Anwendungsentwicklung"
							bind:value={$metadataFormData.ausbildungsberuf}
						/>
					</div>
					<div class="grid gap-2">
						<Label for="abteilung">Abteilung</Label>
						<Input
							id="abteilung"
							name="abteilung"
							type="text"
							placeholder="Softwareentwicklung"
							bind:value={$metadataFormData.abteilung}
						/>
					</div>
					<Button
						type="submit"
						disabled={$metadataSubmitting}
						class="w-fit"
					>
						<Save size={16} class="mr-2" />
						Speichern
					</Button>
				</form>
			</Card.Content>
		</Card.Root>
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
									{#if data.tokenCount !== null && data.tokenCount > 0}
										<p
											class="flex flex-row items-center gap-x-1 text-red-500 [&_span]:text-red-500"
										>
											Deine <Badge variant="default"
												><HandCoins size={16} class="text-red-500" />{data.tokenCount}</Badge
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
	</div>
</div>
