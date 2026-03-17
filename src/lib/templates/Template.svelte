<script lang="ts">
	import type { Database } from '$src/lib/database.types';
	import {
		Flag,
		FlagOff,
		ImageOff,
		Shredder,
		TriangleAlert,
		View
	} from '@lucide/svelte';
	import { berichtgenStore } from '$src/lib/stores/berichtgen.svelte';
	import { PUBLIC_SUPABASE_URL } from '$env/static/public';
	import { Button } from '$src/lib/components/ui/button';
	import * as Avatar from '$src/lib/components/ui/avatar';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { toast } from 'svelte-sonner';
	import { getContext } from 'svelte';
	import type { UserContext } from '../types';
	import Badge from '../components/ui/badge/badge.svelte';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import {
		deleteTemplate,
		reportTemplate,
		deleteReport,
		getTemplates
	} from './templates.remote';
	import { toErrorBody } from '../errors';

	const {
		isPreferred,
		template,
		hasPendingReport = false,
		profile,
		query
	}: {
		isPreferred: boolean;
		template: Awaited<ReturnType<typeof getTemplates>>['templates'][number];
		hasPendingReport?: boolean;
		profile: Database['public']['Tables']['profile']['Row'];
		query: ReturnType<typeof getTemplates>;
	} = $props();

	const { user } = getContext<UserContext>('user')();

	let reportDialogOpen = $state(false);

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
											created_at: new Date().toISOString()
										}
									]
								: []
						}
					: t
			)
		}));
	}

	async function undoReport() {
		try {
			await deleteReport({ templateId: template.id }).updates(
				reportOverride(false)
			);
			toast.success('Meldung zurückgezogen.');
		} catch (e) {
			toast.error('Fehler beim Zurückziehen.', {
				description: toErrorBody(e).message
			});
		}
	}

	const isSafe = $derived(template.safe_marked_at !== null);
	const isOwnTemplate = $derived(user?.id === template.user_id);

	const { name, filepath, thumbnailpath } = $derived.by(() => {
		const name = template.storage_path
			.split('/')
			.at(-1)
			?.split('.')
			.slice(0, -1)
			.join('.');
		const filepath = `${PUBLIC_SUPABASE_URL}/storage/v1/object/public/templates/${template.storage_path}`;
		const thumbnailpath = `${PUBLIC_SUPABASE_URL}/storage/v1/object/public/thumbnails/${template.thumbnail_path?.split('/').at(-1)}`;
		return { name, filepath, thumbnailpath };
	});

	const uploaderInitials = $derived(
		profile?.full_name
			? profile.full_name
					.split(' ')
					.map((w: string) => w[0])
					.slice(0, 2)
					.join('')
					.toUpperCase()
			: '?'
	);

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
		}
	}
</script>

<Popover.Root>
	<!-- Thumbnail card — clicking selects it as preferred -->
	<Popover.Trigger openOnHover class="h-min">
		<button
			class="bg-muted relative flex h-50.75 w-36 cursor-pointer overflow-hidden rounded-sm p-0.5"
			onclick={() =>
				(berichtgenStore.preferedTemplatePath = template.storage_path)}
			title="Template auswählen"
		>
			{#if template.thumbnail_path}
				<img
					alt={name}
					src={thumbnailpath}
					class="h-full w-full object-cover"
				/>
			{:else}
				<div
					class={` ${isPreferred ? 'bg-muted' : 'bg-background'} focus:bg-muted hover:bg-muted flex h-full w-full items-center justify-center`}
				>
					<ImageOff size={72} class="text-muted-foreground" />
				</div>
			{/if}
			<!-- Pending report badge -->
			{#if hasPendingReport}
				<Tooltip.Provider>
					<Tooltip.Root>
						<Tooltip.Trigger
							><Badge
								variant="destructive"
								class="absolute top-1.5 right-1.5 [&>svg]:size-4"
							>
								<TriangleAlert class="mr-1" />
								Gemeldet
							</Badge></Tooltip.Trigger
						>
						<Tooltip.Content>
							<p>
								Dieses Template wurde gemeldet und wird überprüft. Nutzung auf
								eigenes Risiko.
							</p>
						</Tooltip.Content>
					</Tooltip.Root>
				</Tooltip.Provider>
			{/if}
			<div
				class="absolute bottom-1.5 left-1.5 flex w-full items-center gap-x-1.5"
			>
				<Avatar.Root class="size-8 shrink-0 shadow-sm">
					<Avatar.Image
						src={profile?.avatar_url}
						alt={profile?.full_name ?? ''}
					/>
					<Avatar.Fallback class="bg-primary text-secondary text-xs"
						>{uploaderInitials}</Avatar.Fallback
					>
				</Avatar.Root>
				<div class="flex w-full flex-col items-start gap-y-0.5">
					<p class="w-full max-w-30 truncate text-left text-xs" title={name}>
						{name}
					</p>
					<p
						class="text-muted-foreground w-full max-w-30 truncate text-left text-xs"
					>
						{profile.full_name ?? 'Anonym'}
					</p>
				</div>
			</div>
		</button>
	</Popover.Trigger>

	<!-- Right column: solid background panel, full thumbnail height -->
	<Popover.Content side="bottom" class="w-min p-2">
		<div class="flex flex-row items-start gap-1">
			<Dialog.Root>
				<Dialog.Trigger>
					<Button variant="default" size="icon" title="Vorschau">
						<View size={18} />
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
					variant="default"
					size="icon"
					title="Template löschen"
					disabled={deletePending}
					onclick={submitDelete}
				>
					<Shredder size={18} />
				</Button>
			{/if}
			{#if !isOwnTemplate && isReportedByMe}
				<Button
					variant="default"
					size="icon"
					title="Meldung zurückziehen"
					onclick={undoReport}
				>
					<FlagOff size={18} />
				</Button>
			{/if}
			{#if !isOwnTemplate && !isSafe && !isReportedByMe}
				<Dialog.Root bind:open={reportDialogOpen}>
					<Dialog.Trigger>
						<Button variant="default" size="icon" title="Template melden">
							<Flag size={18} />
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
	</Popover.Content>
</Popover.Root>
