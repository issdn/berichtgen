<script lang="ts">
	import type { Database } from '$src/lib/database.types';
	import {
		Flag,
		ImageOff,
		Shredder,
		TriangleAlert,
		View
	} from '@lucide/svelte';
	import {
		getQueryClientContext,
		createMutation
	} from '@tanstack/svelte-query';
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

	const {
		isPreferred,
		template,
		hasPendingReport = false,
		profile
	}: {
		isPreferred: boolean;
		template: Database['public']['Tables']['template']['Row'];
		hasPendingReport?: boolean;
		profile: Database['public']['Tables']['profile']['Row'];
	} = $props();

	let { supabase, user } = getContext<UserContext>('user')();

	const context = getQueryClientContext();

	let reportMessage = $state('');
	let reportDialogOpen = $state(false);

	async function deleteTemplate(storagePath: string) {
		const { error } = await supabase.storage
			.from('templates')
			.remove([storagePath]);
		if (error) throw error;
		await context.refetchQueries({ queryKey: ['template'] });
	}

	const deleteMutation = createMutation(() => ({
		mutationFn: ({ storagePath }: { id: string; storagePath: string }) =>
			deleteTemplate(storagePath),
		onSuccess: () => toast.success('Datei erfolgreich gelöscht.'),
		onError: (error) =>
			toast.error('Fehler beim Löschen der Datei.', {
				description: error.message
			})
	}));

	const reportMutation = createMutation(() => ({
		mutationFn: async ({
			templateId,
			message
		}: {
			templateId: string;
			message?: string;
		}) => {
			const res = await fetch('/board/user/templates/report', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					template_id: templateId,
					message: message || undefined
				})
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.message ?? 'Unbekannter Fehler');
			}
		},
		onSuccess: () => {
			toast.success('Template gemeldet.');
			reportDialogOpen = false;
			reportMessage = '';
			context.refetchQueries({ queryKey: ['template'] });
		},
		onError: (err) =>
			toast.error('Fehler beim Melden.', { description: err.message })
	}));

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
					onclick={() =>
						deleteMutation.mutate({
							id: template.id,
							storagePath: template.storage_path
						})}
				>
					<Shredder size={18} />
				</Button>
			{/if}
			{#if !isOwnTemplate && !isSafe}
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
						<div class="flex flex-col gap-2 py-2">
							<textarea
								class="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-20 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
								placeholder="Optionale Nachricht (max. 1000 Zeichen)..."
								maxlength={1000}
								bind:value={reportMessage}
							></textarea>
						</div>
						<Dialog.Footer>
							<Button
								variant="destructive"
								disabled={reportMutation.isPending}
								onclick={() =>
									reportMutation.mutate({
										templateId: template.id,
										message: reportMessage
									})}
							>
								{#if reportMutation.isPending}
									Wird gemeldet...
								{:else}
									Melden
								{/if}
							</Button>
						</Dialog.Footer>
					</Dialog.Content>
				</Dialog.Root>
			{/if}
		</div>
	</Popover.Content>
</Popover.Root>
