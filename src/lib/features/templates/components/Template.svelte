<script lang="ts">
	import type { KyselyDatabase } from '$lib/schema';

	import { page } from '$app/state';
	import Authed from '$core/auth/components/Authed.svelte';
	import berichtgenStore from '$core/stores/berichtgen.svelte';
	import { PUBLIC_SUPABASE_URL } from '$env/static/public';
	import { LOCALE } from '$lib/constants';
	import { ECommonServerError, toErrorBody } from '$lib/errors';
	import { tryResultAsync } from '$lib/result';
	import { getUserDisplayName } from '$lib/utils';
	import * as AlertDialog from '$ui/alert-dialog';
	import { Badge } from '$ui/badge';
	import { Button } from '$ui/button';
	import * as Dialog from '$ui/dialog';
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
	import { toast } from 'svelte-sonner';

	import {
		deleteReport,
		deleteTemplate,
		getTemplates,
		reportTemplate
	} from '../api/templates.remote';
	import { templatesMutationContext } from '../contexts';
	import TemplateDocxPreviewDialog from './TemplateDocxPreviewDialog.svelte';

	type TemplateItem = Awaited<
		ReturnType<typeof getTemplates>
	>['templates'][number];

	const {
		hasPendingReport = false,
		isPreferred,
		profile,
		query,
		template
	}: {
		hasPendingReport?: boolean;
		isPreferred: boolean;
		profile: KyselyDatabase['profile'];
		query: ReturnType<typeof getTemplates>;
		template: TemplateItem;
	} = $props();

	const mutation = templatesMutationContext.get();

	let reportDialogOpen = $state(false);
	let confirmSelectOpen = $state(false);
	let confirmDeleteOpen = $state(false);
	let previewOpen = $state(false);
	let previewFileUrl = $state<null | string>(null);
	let reportMessage = $state('');
	let reportPending = $state(false);
	let deletePending = $state(false);

	const isSafe = $derived(template.safe_marked_at !== null);
	const isOwnTemplate = $derived(page.data.user?.id === template.user_id);

	const { bucketName, name, previewDescription, publicFileUrl } = $derived.by(
		() => {
			const name =
				template.storage_path
					.split('/')
					.at(-1)
					?.split('.')
					.slice(0, -1)
					.join('.') ?? template.storage_path;
			const bucketName = template.is_public ? 'templates' : 'private-templates';
			const publicFileUrl = template.is_public
				? `${PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucketName}/${template.storage_path}`
				: null;
			const previewDescription = `${profile.full_name ?? 'Anonym'} - Hochgeladen am ${new Date(
				template.created_at
			).toLocaleDateString(LOCALE)}${
				template.updated_at
					? ` - Zuletzt geändert ${new Date(template.updated_at).toLocaleDateString(LOCALE)}`
					: ''
			}`;
			return { bucketName, name, previewDescription, publicFileUrl };
		}
	);

	function reportOverride(reported: boolean) {
		return query.withOverride((result) => ({
			...result,
			templates: result.templates.map((t) =>
				t.id === template.id
					? {
							...t,
							has_pending_report: reported,
							reported_by_me: reported
						}
					: t
			)
		}));
	}

	/**
	 * Resolves a URL for preview/download/open.
	 * Public templates use the stable public bucket URL.
	 * Private templates use a short-lived signed URL.
	 */
	async function resolveTemplateUrl(): Promise<null | string> {
		if (publicFileUrl) {
			return publicFileUrl;
		}

		const signedUrlResult = await page.data.supabase.storage
			.from(bucketName)
			.createSignedUrl(template.storage_path, 60 * 5);

		if (signedUrlResult.error || !signedUrlResult.data?.signedUrl) {
			toast.error('Fehler beim Laden der Vorlage.', {
				description:
					signedUrlResult.error?.message ??
					'Private Vorlagen-URL konnte nicht erstellt werden.'
			});
			return null;
		}

		return signedUrlResult.data.signedUrl;
	}

	async function undoReport() {
		mutation?.start();
		const result = await tryResultAsync({
			apiError: ECommonServerError.INTERNAL_ERROR,
			promise: deleteReport({ templateId: template.id }).updates(
				reportOverride(false)
			)
		});
		if (result.ok) {
			toast.success('Meldung zurückgezogen.');
		} else {
			toast.error('Fehler beim Zurückziehen.', {
				description: toErrorBody(result.error).message
			});
		}
		mutation?.end();
	}

	async function submitDelete() {
		deletePending = true;
		mutation?.start();
		const result = await tryResultAsync({
			apiError: ECommonServerError.INTERNAL_ERROR,
			promise: deleteTemplate({ storagePath: template.storage_path }).updates(
				query.withOverride((result) => ({
					...result,
					templates: result.templates.filter((t) => t.id !== template.id)
				}))
			)
		});
		if (result.ok) {
			toast.success('Datei erfolgreich gelöscht.');
		} else {
			toast.error('Fehler beim Löschen der Datei.', {
				description: toErrorBody(result.error).message
			});
		}
		deletePending = false;
		mutation?.end();
	}

	async function submitReport() {
		reportPending = true;
		mutation?.start();
		const result = await tryResultAsync({
			apiError: ECommonServerError.INTERNAL_ERROR,
			promise: reportTemplate({
				message: reportMessage || undefined,
				templateId: template.id
			}).updates(reportOverride(true))
		});
		if (result.ok) {
			reportDialogOpen = false;
			reportMessage = '';
			toast.success('Vorlage gemeldet.', {
				action: { label: 'Rückgängig', onClick: undoReport }
			});
		} else {
			toast.error('Fehler beim Melden.', {
				description: toErrorBody(result.error).message
			});
		}
		reportPending = false;
		mutation?.end();
	}

	async function openPreview() {
		const resolvedUrl = await resolveTemplateUrl();
		if (!resolvedUrl) return;
		previewFileUrl = resolvedUrl;
		previewOpen = true;
	}

	async function openInGoogleDocs() {
		const resolvedUrl = await resolveTemplateUrl();
		if (!resolvedUrl) return;
		window.open(
			`https://docs.google.com/viewer?url=${encodeURIComponent(resolvedUrl)}`,
			'_blank',
			'noopener,noreferrer'
		);
	}

	async function downloadTemplateFile() {
		const resolvedUrl = await resolveTemplateUrl();
		if (!resolvedUrl) return;
		window.open(resolvedUrl, '_blank', 'noopener,noreferrer');
	}
</script>

<div
	data-testid="template-item"
	data-template-id={template.id}
	class="hover:bg-muted/50 flex items-center gap-3 rounded-md px-2 py-1.5 {isPreferred
		? 'bg-muted'
		: ''}"
>
	<FileBox class={isPreferred ? 'text-primary' : 'text-muted'} />
	<div class="flex min-w-0 flex-1 flex-col">
		<span class="flex items-center gap-1.5 text-sm font-medium">
			<span class="truncate" title={name ?? 'Vorlage'}>
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

	<div class="flex shrink-0 items-center gap-1">
		{#if !isPreferred}
			<Button
				variant="default"
				size="icon"
				title="Als Vorlage auswählen"
				onclick={() => {
					if (hasPendingReport) {
						confirmSelectOpen = true;
					} else {
						berichtgenStore.set('preferredTemplatePath', template.storage_path);
					}
				}}
			>
				<Check size={16} />
			</Button>
		{/if}

		<Button variant="ghost" size="icon" title="Vorschau" onclick={openPreview}>
			<View size={16} />
		</Button>

		<Button
			variant="ghost"
			size="icon"
			title="In Google Docs öffnen"
			onclick={openInGoogleDocs}
		>
			<ExternalLink size={16} />
		</Button>

		<Button
			variant="ghost"
			size="icon"
			title="Vorlage herunterladen"
			onclick={downloadTemplateFile}
		>
			<Download size={16} />
		</Button>

		<Authed>
			{#if isOwnTemplate}
				<Button
					variant="destructive"
					size="icon"
					title="Vorlage löschen"
					disabled={deletePending}
					onclick={() => (confirmDeleteOpen = true)}
				>
					<Shredder size={16} />
				</Button>
			{/if}

			{#if !isOwnTemplate && template.reported_by_me}
				<Button
					variant="ghost"
					size="icon"
					title="Meldung zurückziehen"
					onclick={undoReport}
				>
					<FlagOff size={16} />
				</Button>
			{/if}

			{#if !isOwnTemplate && !isSafe && !template.reported_by_me}
				<Dialog.Root bind:open={reportDialogOpen}>
					<Dialog.Trigger>
						<Button variant="destructive" size="icon" title="Vorlage melden">
							<Flag size={16} />
						</Button>
					</Dialog.Trigger>
					<Dialog.Content class="sm:max-w-md">
						<Dialog.Header>
							<Dialog.Title>Vorlage melden</Dialog.Title>
							<Dialog.Description>
								Melde diese Vorlage als potenziell schädlich. Die Meldung wird
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

{#if previewFileUrl}
	<TemplateDocxPreviewDialog
		bind:open={previewOpen}
		title={name}
		description={previewDescription}
		fileUrl={previewFileUrl}
	/>
{/if}

<AlertDialog.Root bind:open={confirmSelectOpen}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Gemeldete Vorlage auswählen?</AlertDialog.Title>
			<AlertDialog.Description>
				Diese Vorlage wurde gemeldet und wird noch überprüft. Die Nutzung
				erfolgt auf eigenes Risiko.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>Abbrechen</AlertDialog.Cancel>
			<AlertDialog.Action
				onclick={() => {
					berichtgenStore.set('preferredTemplatePath', template.storage_path);
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
			<AlertDialog.Title>Vorlage löschen?</AlertDialog.Title>
			<AlertDialog.Description>
				"{name}" wird unwiderruflich gelöscht.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>Abbrechen</AlertDialog.Cancel>
			<AlertDialog.Action onclick={submitDelete}>Löschen</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
