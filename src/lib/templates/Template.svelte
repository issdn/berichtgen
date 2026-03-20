<script lang="ts">
	import type { Database } from '$src/lib/database.types';
	import {
		Check,
		Flag,
		FlagOff,
		Shredder,
		TriangleAlert,
		View,
		FileBox
	} from '@lucide/svelte';
	import { berichtgenStore } from '$src/lib/stores/berichtgen.svelte';
	import { PUBLIC_SUPABASE_URL } from '$env/static/public';
	import { Button } from '$src/lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import { toast } from 'svelte-sonner';
	import { getContext } from 'svelte';
	import type { UserContext } from '../types';
	import Badge from '../components/ui/badge/badge.svelte';
	import {
		deleteTemplate,
		reportTemplate,
		deleteReport,
		getTemplates
	} from './templates.remote';
	import { toErrorBody } from '../errors';

	type TemplateItem = Awaited<
		ReturnType<typeof getTemplates>
	>['templates'][number];

	const {
		isPreferred,
		template,
		hasPendingReport = false,
		profile,
		query,
		onTemplateDeleted,
		onTemplateReported
	}: {
		isPreferred: boolean;
		template: TemplateItem;
		hasPendingReport?: boolean;
		profile: Database['public']['Tables']['profile']['Row'];
		query: ReturnType<typeof getTemplates>;
		onTemplateDeleted: (id: string) => void;
		onTemplateReported: (
			id: string,
			report: NonNullable<TemplateItem['template_report']>
		) => void;
	} = $props();

	const { user } = getContext<UserContext>('user')();

	let reportDialogOpen = $state(false);
	let confirmSelectOpen = $state(false);

	const isReportedByMe = $derived(
		template.template_report?.some((r) => r.reporter_user_id === user?.id) ??
			false
	);

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
											reporter_user_id: user!.id,
											message: null,
											created_at: new Date().toISOString(),
											user_id: user!.id,
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
		const prevReport = template.template_report ?? [];
		onTemplateReported(template.id, []);
		try {
			await deleteReport({ templateId: template.id }).updates(
				reportOverride(false)
			);
			toast.success('Meldung zurückgezogen.');
		} catch (e) {
			onTemplateReported(template.id, prevReport);
			toast.error('Fehler beim Zurückziehen.', {
				description: toErrorBody(e).message
			});
		}
	}

	const isSafe = $derived(template.safe_marked_at !== null);
	const isOwnTemplate = $derived(user?.id === template.user_id);

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

	let deletePending = $state(false);

	async function submitDelete() {
		deletePending = true;
		try {
			await deleteTemplate({ storagePath: template.storage_path }).updates(
				query.withOverride((result) => ({
					...result,
					templates: result.templates.filter((t) => t.id !== template.id)
				}))
			);
			onTemplateDeleted(template.id);
			toast.success('Datei erfolgreich gelöscht.');
		} catch (e) {
			toast.error('Fehler beim Löschen der Datei.', {
				description: toErrorBody(e).message
			});
		} finally {
			deletePending = false;
		}
	}

	let reportMessage = $state('');
	let reportPending = $state(false);

	async function submitReport() {
		reportPending = true;
		const optimisticReport = [
			{
				id: 'optimistic',
				template_id: template.id,
				reporter_user_id: user!.id,
				message: null,
				created_at: new Date().toISOString(),
				user_id: user!.id,
				storage_path: '',
				safe_marked_at: null,
				updated_at: null
			}
		];
		const prevReport = template.template_report ?? [];
		onTemplateReported(template.id, optimisticReport);
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
			onTemplateReported(template.id, prevReport);
			toast.error('Fehler beim Melden.', {
				description: toErrorBody(e).message
			});
		} finally {
			reportPending = false;
		}
	}
</script>

<div
	class="hover:bg-muted/50 flex items-center gap-3 rounded-md px-2 py-1.5 {isPreferred
		? 'bg-muted'
		: ''}"
>
	<!-- Avatar -->
	<FileBox class={isPreferred ? 'text-primary' : 'text-muted'} />
	<!-- Name + uploader -->
	<div class="flex min-w-0 flex-1 flex-col">
		<span class="flex items-center gap-1.5 text-sm font-medium">
			<span class="truncate">{name}</span>
			{#if hasPendingReport}
				<Badge variant="destructive" class="shrink-0 text-xs [&>svg]:size-3">
					<TriangleAlert class="mr-0.5" />
					Gemeldet
				</Badge>
			{/if}
		</span>
		<span class="text-muted-foreground truncate text-xs"
			>{profile.full_name ?? 'Anonym'}</span
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
			<Dialog.Content class="h-[calc(100%-6rem)] sm:max-w-[calc(100%-6rem)]">
				<div class="h-full w-full pt-4">
					<iframe
						class="h-full w-full rounded-xl border-0"
						allowfullscreen={true}
						title={name}
						src={`https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(filepath)}`}
					></iframe>
				</div>
			</Dialog.Content>
		</Dialog.Root>

		{#if isOwnTemplate}
			<Button
				variant="destructive"
				size="icon"
				title="Template löschen"
				disabled={deletePending}
				onclick={submitDelete}
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
