<script lang="ts">
	import {
		Check,
		Download,
		ExternalLink,
		FileBox,
		Flag,
		FlagOff,
		Shredder,
		TriangleAlert,
		View
	} from '@lucide/svelte';

	import Authed from '$auth/components/Authed.svelte';
	import { PUBLIC_SUPABASE_URL } from '$env/static/public';
	import { toErrorBody } from '$lib/errors';
	import type { KyselyDatabase } from '$lib/schema';
	import { berichtgenStore } from '$lib/stores/berichtgen.svelte';
	import { getUserDisplayName } from '$lib/utils';
	import { Badge } from '$ui/badge';
	import { Button } from '$ui/button';
	import * as Dialog from '$ui/dialog';
	import * as AlertDialog from '$ui/alert-dialog';
	import { toast } from 'svelte-sonner';
	import {
		deleteReport,
		deleteTemplate,
		getTemplates,
		reportTemplate
	} from '../api/templates.remote';
	import { getTemplatesMutationContext } from '../contexts';
	import DocxPreview from './DocxPreview.svelte';
	import { LOCALE } from '$lib/constants';
	import { page } from '$app/state';

	type TemplateItem = Awaited<
		ReturnType<typeof getTemplates>
	>['templates'][number];

	const {
		isPreferred,
		template,
		hasPendingReport = false,
		profile,
		query
	}: {
		isPreferred: boolean;
		template: TemplateItem;
		hasPendingReport?: boolean;
		profile: KyselyDatabase['profile'];
		query: ReturnType<typeof getTemplates>;
	} = $props();

	const mutation = getTemplatesMutationContext();

	let reportDialogOpen = $state(false);

	let confirmSelectOpen = $state(false);

	let confirmDeleteOpen = $state(false);

	let reportMessage = $state('');

	let reportPending = $state(false);

	let deletePending = $state(false);

	const isReportedByMe = $derived(
		template.template_report?.some(
			(r) => page.data.user && r.reporter_user_id === page.data.user.id
		) ?? false
	);

	const isSafe = $derived(template.safe_marked_at !== null);

	const isOwnTemplate = $derived(page.data.user?.id === template.user_id);

	const { name, filepath } = $derived.by(() => {
		const name = template.storage_path
			.split('/')
			.at(-1)
			?.split('.')
			.slice(0, -1)
			.join('.');
		const filepath = `${PUBLIC_SUPABASE_URL}/storage/v1/object/public/templates/${template.storage_path}`;
		return { name, filepath };
	});

	function reportOverride(reported: boolean) {
		return query.withOverride((result) => ({
			...result,
			templates: result.templates.map((t) =>
				t.id === template.id
					? {
							...t,
							template_report: reported
								? [
										{
											id: 'optimistic',
											template_id: template.id,
											reporter_user_id: page.data.user!.id,
											message: null,
											created_at: new Date().toISOString(),
											user_id: page.data.user!.id,
											storage_path: '',
											safe_marked_at: null,
											updated_at: null
										}
									]
								: []
						}
					: t
			)
		}));
	}

	async function undoReport() {
		mutation?.start();
		try {
			await deleteReport({ templateId: template.id }).updates(
				reportOverride(false)
			);
			toast.success('Meldung zurückgezogen.');
		} catch (e) {
			toast.error('Fehler beim Zurückziehen.', {
				description: toErrorBody(e).message
			});
		} finally {
			mutation?.end();
		}
	}

	async function submitDelete() {
		deletePending = true;
		mutation?.start();
		try {
			await deleteTemplate({ storagePath: template.storage_path }).updates(
				query.withOverride((result) => ({
					...result,
					templates: result.templates.filter((t) => t.id !== template.id)
				}))
			);
			toast.success('Datei erfolgreich gelöscht.');
		} catch (e) {
			toast.error('Fehler beim Löschen der Datei.', {
				description: toErrorBody(e).message
			});
		} finally {
			deletePending = false;
			mutation?.end();
		}
	}

	async function submitReport() {
		reportPending = true;
		mutation?.start();
		try {
			await reportTemplate({
				templateId: template.id,
				message: reportMessage || undefined
			}).updates(reportOverride(true));
			reportDialogOpen = false;
			reportMessage = '';
			toast.success('Template gemeldet.', {
				action: { label: 'Rückgängig', onClick: undoReport }
			});
		} catch (e) {
			toast.error('Fehler beim Melden.', {
				description: toErrorBody(e).message
			});
		} finally {
			reportPending = false;
			mutation?.end();
		}
	}
</script>

<div
	class="hover:bg-muted/50 flex items-center gap-3 rounded-md px-2 py-1.5 {isPreferred
		? 'bg-muted'
		: ''}"
>
	<FileBox class={isPreferred ? 'text-primary' : 'text-muted'} />
	<div class="flex min-w-0 flex-1 flex-col">
		<span class="flex items-center gap-1.5 text-sm font-medium">
			<span class="truncate" title={name}>
				{name}
			</span>
			{#if hasPendingReport}
				<Badge variant="destructive" class="shrink-0 text-xs [&>svg]:size-3">
					<TriangleAlert class="mr-0.5" />
					Gemeldet
				</Badge>
			{/if}
		</span>
		<span class="text-muted-foreground truncate text-xs"
			>{getUserDisplayName(profile).fullName}</span
		>
	</div>

	<!-- Action buttons -->
	<div class="flex shrink-0 items-center gap-1">
		{#if !isPreferred}
			<Button
				variant="default"
				size="icon"
				title="Als Template auswählen"
				onclick={() => {
					if (hasPendingReport) {
						confirmSelectOpen = true;
					} else {
						berichtgenStore.preferedTemplatePath = template.storage_path;
					}
				}}
			>
				<Check size={16} />
			</Button>
		{/if}

		<Dialog.Root>
			<Dialog.Trigger>
				<Button variant="ghost" size="icon" title="Vorschau">
					<View size={16} />
				</Button>
			</Dialog.Trigger>
			<Dialog.Content
				class="flex h-[calc(100%-6rem)] flex-col overflow-hidden sm:max-w-[calc(100%-6rem)]"
			>
				<Dialog.Header class="shrink-0">
					<Dialog.Title>{name}</Dialog.Title>
					<Dialog.Description>
						{profile.full_name ?? 'Anonym'} · Hochgeladen am {new Date(
							template.created_at
						).toLocaleDateString(LOCALE)}{template.updated_at
							? ` · Zuletzt geändert ${new Date(template.updated_at).toLocaleDateString(LOCALE)}`
							: ''}
					</Dialog.Description>
				</Dialog.Header>
				<div class="min-h-0 flex-1 overflow-y-scroll pt-2">
					<svelte:boundary>
						<DocxPreview fileUrl={filepath} />
						{#snippet pending()}
							<div class="flex h-full items-center justify-center">
								<div class="text-muted-foreground animate-pulse text-sm">
									Dokument wird geladen…
								</div>
							</div>
						{/snippet}
						{#snippet failed(error)}
							<div class="flex h-full items-center justify-center">
								<div class="text-destructive text-sm">
									Fehler beim Laden: {error instanceof Error
										? error.message
										: String(error)}
								</div>
							</div>
						{/snippet}
					</svelte:boundary>
				</div>
				<!-- Note: preview is best-effort; full fidelity needs Word. -->
				<div
					class="text-muted-foreground shrink-0 border-t px-6 py-2 text-center text-xs"
				>
					Die Vorschau gibt das Dokument möglicherweise nicht vollständig
					wieder. Für eine genaue Darstellung öffne die Datei in
					<a
						href="https://docs.google.com/viewer?url={encodeURIComponent(
							filepath
						)}"
						target="_blank"
						rel="noopener noreferrer"
						class="underline">Microsoft Word Online</a
					>.
				</div>
			</Dialog.Content>
		</Dialog.Root>

		<!-- Open in Microsoft Word Online -->
		<a
			href="https://docs.google.com/viewer?url={encodeURIComponent(filepath)}"
			target="_blank"
			rel="noopener noreferrer"
			title="In Word Online öffnen"
		>
			<Button variant="ghost" size="icon" tabindex={-1}>
				<ExternalLink size={16} />
			</Button>
		</a>
		<a
			href={filepath}
			rel="external"
			download={name}
			title="Template herunterladen"
		>
			<Button variant="ghost" size="icon" tabindex={-1}>
				<Download size={16} />
			</Button>
		</a>

		<Authed>
			{#if isOwnTemplate}
				<Button
					variant="destructive"
					size="icon"
					title="Template löschen"
					disabled={deletePending}
					onclick={() => (confirmDeleteOpen = true)}
				>
					<Shredder size={16} />
				</Button>
			{/if}

			{#if !isOwnTemplate && isReportedByMe}
				<Button
					variant="ghost"
					size="icon"
					title="Meldung zurückziehen"
					onclick={undoReport}
				>
					<FlagOff size={16} />
				</Button>
			{/if}

			{#if !isOwnTemplate && !isSafe && !isReportedByMe}
				<Dialog.Root bind:open={reportDialogOpen}>
					<Dialog.Trigger>
						<Button variant="destructive" size="icon" title="Template melden">
							<Flag size={16} />
						</Button>
					</Dialog.Trigger>
					<Dialog.Content class="sm:max-w-md">
						<Dialog.Header>
							<Dialog.Title>Template melden</Dialog.Title>
							<Dialog.Description>
								Melde dieses Template als potenziell schädlich. Die Meldung wird
								von einem Admin geprüft.
							</Dialog.Description>
						</Dialog.Header>
						<div>
							<div class="flex flex-col gap-2 py-2">
								<textarea
									bind:value={reportMessage}
									class="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-20 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
									placeholder="Optionale Nachricht (max. 1000 Zeichen)..."
									maxlength={1000}
								></textarea>
							</div>
							<Dialog.Footer>
								<Button
									variant="destructive"
									disabled={reportPending}
									onclick={submitReport}
								>
									{#if reportPending}
										Wird gemeldet...
									{:else}
										Melden
									{/if}
								</Button>
							</Dialog.Footer>
						</div>
					</Dialog.Content>
				</Dialog.Root>
			{/if}
		</Authed>
	</div>
</div>

<AlertDialog.Root bind:open={confirmSelectOpen}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Gemeldetes Template auswählen?</AlertDialog.Title>
			<AlertDialog.Description>
				Dieses Template wurde gemeldet und wird noch überprüft. Die Nutzung
				erfolgt auf eigenes Risiko.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>Abbrechen</AlertDialog.Cancel>
			<AlertDialog.Action
				onclick={() => {
					berichtgenStore.preferedTemplatePath = template.storage_path;
					confirmSelectOpen = false;
				}}
			>
				Trotzdem auswählen
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

<AlertDialog.Root bind:open={confirmDeleteOpen}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Template löschen?</AlertDialog.Title>
			<AlertDialog.Description>
				„{name}" wird unwiderruflich gelöscht.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>Abbrechen</AlertDialog.Cancel>
			<AlertDialog.Action onclick={submitDelete}>Löschen</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
