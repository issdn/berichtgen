<script lang="ts">
	import {
		profileNameSchema,
		userMetadataSchema
	} from '$core/settings/schemas';
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import Button from '$lib/components/ui/button/button.svelte';
	import { buttonVariants } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { HandCoins, Save, User, UserRoundX } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { superForm } from 'sveltekit-superforms/client';

	let { data } = $props();

	const profileNameForm = $derived(
		superForm(data.profileNameForm, {
			dataType: 'json',
			invalidateAll: true,
			onError({ result }) {
				toast.error(result.error.message);
			},
			onUpdated({ form }) {
				if (form.valid) {
					toast.success(form.message);
				}
			},
			resetForm: false,
			validationMethod: 'oninput',
			validators: zod4Client(profileNameSchema)
		})
	);

	const {
		enhance: profileEnhance,
		form: profileFormData,
		submitting: profileSubmitting
	} = profileNameForm;

	const userMetadataForm = $derived(
		superForm(data.userMetadataForm, {
			dataType: 'json',
			invalidateAll: true,
			onError({ result }) {
				toast.error(result.error.message);
			},
			onUpdated({ form }) {
				if (form.valid) {
					toast.success(form.message);
				}
			},
			resetForm: false,
			validationMethod: 'oninput',
			validators: zod4Client(userMetadataSchema)
		})
	);

	const {
		enhance: metadataEnhance,
		form: metadataFormData,
		submitting: metadataSubmitting
	} = userMetadataForm;
</script>

<svelte:head>
	<title>Einstellungen</title>
</svelte:head>

<div class="flex h-full flex-row justify-center">
	<div class="flex w-full max-w-175 flex-col gap-y-8">
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<User size={20} />
					Profildaten
				</Card.Title>
				<Card.Description>Dein angezeigter Name im Profil.</Card.Description>
			</Card.Header>
			<Card.Content>
				<form
					id="profile-form"
					class="flex w-full flex-col gap-y-4"
					method="POST"
					action="/board/user/settings?/updateProfile"
					use:profileEnhance
				>
					<div class="grid gap-2">
						<Label for="profileFullName">Voller Name</Label>
						<Input
							id="profileFullName"
							name="fullName"
							type="text"
							placeholder="Max Mustermann"
							bind:value={$profileFormData.fullName}
						/>
					</div>
					<Button type="submit" disabled={$profileSubmitting} class="w-fit">
						<Save size={16} class="mr-2" />
						Speichern
					</Button>
				</form>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<User size={20} />
					Berichtsdaten
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
							placeholder="Fachinformatiker für Anwendentwicklung"
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
					<Button type="submit" disabled={$metadataSubmitting} class="w-fit">
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
								class={buttonVariants({ class: 'w-fit', variant: 'default' })}
							>
								<UserRoundX />
								Konto löschen
							</AlertDialog.Trigger>
							<AlertDialog.Content>
								<AlertDialog.Header>
									<AlertDialog.Title>Bist du sicher?</AlertDialog.Title>
									<p class="text-red-500">
										Dieser Vorgang ist unumkehrbar. Dies wird dein Konto und
										deine Daten entfernen.
									</p>
									{#if data.tokenCount !== null && data.tokenCount > 0}
										<p
											class="flex flex-row items-center gap-x-1 text-red-500 [&_span]:text-red-500"
										>
											Deine <Badge variant="default"
												><HandCoins
													size={16}
													class="text-red-500"
												/>{data.tokenCount}</Badge
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
