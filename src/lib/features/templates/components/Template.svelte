<script lang="ts">
	import type { KyselyDatabase } from '$lib/schema';

	import { page } from '$app/state';
	import Authed from '$core/auth/components/Authed.svelte';
	import berichtgenStore from '$core/stores/berichtgen.svelte';
	import { PUBLIC_SUPABASE_URL } from '$env/static/public';
	import { LOCALE } from '$lib/constants';
	import {
		BerichtgenError,
		ECommonServerError,
		toErrorBody
	} from '$lib/errors';
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

	const { filepath, name } = $derived.by(() => {
		const name = template.storage_path
			.split('/')
			.at(-1)
			?.split('.')
			.slice(0, -1)
			.join('.');
		const filepath = `${PUBLIC_SUPABASE_URL}/storage/v1/object/public/templates/${template.storage_path}`;
		return { filepath, name };
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
											created_at: new Date().toISOString(),
											id: 'optimistic',
											message: null,
											reporter_user_id: page.data.user!.id,
											safe_marked_at: null,
											storage_path: '',
											template_id: template.id,
											updated_at: null,
											user_id: page.data.user!.id
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
		const result = await tryResultAsync(
			deleteReport({ templateId: template.id }).updates(reportOverride(false)),
			BerichtgenError,
			ECommonServerError.INTERNAL_ERROR
		);
		if (result.ok) {
			toast.success('Meldung zur�ckgezogen.');
		} else {
			toast.error('Fehler beim Zur�ckziehen.', {
				description: toErrorBody(result.error).message
			});
		}
		mutation?.end();
	}

	async function submitDelete() {
		deletePending = true;
		mutation?.start();
		const result = await tryResultAsync(
			deleteTemplate({ storagePath: template.storage_path }).updates(
				query.withOverride((result) => ({
					...result,
					templates: result.templates.filter((t) => t.id !== template.id)
				}))
			),
			BerichtgenError,
			ECommonServerError.INTERNAL_ERROR
		);
		if (result.ok) {
			toast.success('Datei erfolgreich gel�scht.');
		} else {
			toast.error('Fehler beim L�schen der Datei.', {
				description: toErrorBody(result.error).message
			});
		}
		deletePending = false;
		mutation?.end();
	}

	async function submitReport() {
		reportPending = true;
		mutation?.start();
		const result = await tryResultAsync(
			reportTemplate({
				message: reportMessage || undefined,
				templateId: template.id
			}).updates(reportOverride(true)),
			BerichtgenError,
			ECommonServerError.INTERNAL_ERROR
		);
		if (result.ok) {
			reportDialogOpen = false;
			reportMessage = '';
			toast.success('Template gemeldet.', {
				action: { label: 'R�ckg�ngig', onClick: undoReport }
			});
		} else {
			toast.error('Fehler beim Melden.', {
				description: toErrorBody(result.error).message
			});
		}
		reportPending = false;
		mutation?.end();
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
			<span class="truncate" title={name ?? 'Template'}>
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
				title="Als Template ausw�hlen"
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

		<TemplateDocxPreviewDialog
			title={name ?? 'Template'}
			description={`${profile.full_name ?? 'Anonym'} - Hochgeladen am ${new Date(
				template.created_at
			).toLocaleDateString(LOCALE)}${
				template.updated_at
					? ` - Zuletzt geaendert ${new Date(template.updated_at).toLocaleDateString(LOCALE)}`
					: ''
			}`}
			fileUrl={filepath}
		>
			{#snippet trigger()}
				<Button variant="ghost" size="icon" title="Vorschau">
					<View size={16} />
				</Button>
			{/snippet}
		</TemplateDocxPreviewDialog>

		<!-- Open in Microsoft Word Online -->
		<a
			href="https://docs.google.com/viewer?url={encodeURIComponent(filepath)}"
			target="_blank"
			rel="noopener noreferrer"
			title="In Word Online �ffnen"
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
					title="Template l�schen"
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
					title="Meldung zur�ckziehen"
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
								Melde dieses Template als potenziell sch�dlich. Die Meldung wird
								von einem Admin gepr�ft.
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
			<AlertDialog.Title>Gemeldetes Template ausw�hlen?</AlertDialog.Title>
			<AlertDialog.Description>
				Dieses Template wurde gemeldet und wird noch �berpr�ft. Die Nutzung
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
				Trotzdem ausw�hlen
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

<AlertDialog.Root bind:open={confirmDeleteOpen}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Template l�schen?</AlertDialog.Title>
			<AlertDialog.Description>
				�{name}" wird unwiderruflich gel�scht.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>Abbrechen</AlertDialog.Cancel>
			<AlertDialog.Action onclick={submitDelete}>L�schen</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
