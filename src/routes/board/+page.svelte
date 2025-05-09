<script lang="ts">
	import Dropzone from '$lib/components/Dropzone.svelte';
	import Howto from '$lib/components/Howto.svelte';
	import { onMount } from 'svelte';
	import Wizard from './Wizard.svelte';
	import { toast } from 'svelte-sonner';
	import * as Sentry from '@sentry/browser';
	import { page } from '$app/state';
	import { replaceState } from '$app/navigation';
	import { PaymentStatus } from '$src/lib/types';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { HandCoins } from 'lucide-svelte';
	import type { RealtimeChannel } from '@supabase/supabase-js';

	let { data } = $props();
	const { supabase, tokenCount, user } = data;
	let userTokens = $state(tokenCount);

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
						userTokens = p.new.tokens;
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
</script>

<div class="h-main flex w-full flex-col gap-x-8 gap-y-8 px-8 pb-8 md:flex-row">
	<div class="flex h-full w-full flex-col gap-y-2">
		{#if userTokens !== null}
			<Badge class="w-fit gap-x-2 px-4 py-2 text-sm" variant="outline"
				><HandCoins size={18} />{userTokens}</Badge
			>
		{/if}
		<Howto />
	</div>
	<div class="flex h-[calc(100%-1rem)] w-full flex-col gap-y-4">
		<div class="h-full w-full">
			<Dropzone {userTokens} />
		</div>
		<div class="h-full w-full">
			<Wizard />
		</div>
	</div>
</div>
