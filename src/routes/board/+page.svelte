<script lang="ts">
	import Howto from '$lib/components/Howto.svelte';
	import { onMount } from 'svelte';
	import Wizard from './Wizard.svelte';
	import { toast } from 'svelte-sonner';
	import * as Sentry from '@sentry/browser';
	import { page } from '$app/state';
	import { goto, replaceState } from '$app/navigation';
	import { PaymentStatus } from '$src/lib/enums';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { HandCoins } from '@lucide/svelte';
	import type { RealtimeChannel } from '@supabase/supabase-js';
	import { berichtgenStore } from '$src/lib/stores/berichtgen.svelte';
	import { wizardScheduler } from '$src/lib/wizard_scheduler.svelte';
	import WizardDropzone from '$src/lib/components/WizardDropzone.svelte';
	import TemplateUpload from '$src/lib/templates/TemplateUpload.svelte';
	import { Button } from '$src/lib/components/ui/button';
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import TemplatesDialog from '$src/lib/templates/TemplatesDialog.svelte';

	let { data } = $props();
	let { supabase, tokenCount, user } = $derived(data);

	$effect(() => {
		berichtgenStore.userTokens = tokenCount;
	});

	onMount(() => {
		if (page.url.searchParams.get('payment') === PaymentStatus.SUCCESS) {
			toast.success('Kauf von Tokens erfolgreich!');
			const cleanUrl = `${page.url.pathname}${page.url.hash || ''}`;
			replaceState(cleanUrl, '');
		}

		let channel: RealtimeChannel | null = null;

		if (user) {
			channel = supabase
				.channel('token-update')
				.on(
					'postgres_changes',
					{ event: 'UPDATE', table: 'userTokenCount', schema: 'public' },
					(p) => {
						berichtgenStore.userTokens = p.new.tokens;
					}
				)
				.subscribe((_, e) => {
					if (e) {
						Sentry.captureException(e);
						toast.error(
							'Fehler beim Abonnieren des Token-Channels. Token-Count wird nicht aktualisiert.'
						);
					}
				});
		}

		return () => {
			channel?.unsubscribe();
		};
	});

	const queryClient = new QueryClient();
</script>

<svelte:head>
	<title
		>Board - {wizardScheduler.isRunning ? 'In Bearbeitung...' : 'Nix passiert.'} | ***REMOVED***</title
	>
</svelte:head>

<QueryClientProvider client={queryClient}>
	<div
		class="h-main flex w-full flex-col gap-x-8 gap-y-8 px-8 pb-8 md:grid md:grid-cols-2 md:grid-rows-2"
	>
		<div class="flex h-full flex-col gap-y-2 md:row-span-2">
			<div class="w-full flex-row items-center gap-x-16">
				{#if berichtgenStore.userTokens !== null}
					<Button onclick={() => goto('/board/user/kauf')} variant="outline"
						><HandCoins />{berichtgenStore.userTokens}</Button
					>
				{/if}
				{#if user !== null}
					<TemplatesDialog />
				{/if}
			</div>
			<Howto />
		</div>
		<WizardDropzone />
		<Wizard />
	</div>
</QueryClientProvider>
