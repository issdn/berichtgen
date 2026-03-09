<script lang="ts">
	import { type UserContext } from '$src/lib/types.js';
	import { getContext, setContext } from 'svelte';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import * as Sentry from '@sentry/sveltekit';
	import { page } from '$app/state';
	import { replaceState } from '$app/navigation';
	import { PaymentStatus } from '$src/lib/enums';
	import type { RealtimeChannel } from '@supabase/supabase-js';
	import { berichtgenStore } from '$src/lib/stores/berichtgen.svelte';
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import { browser } from '$app/environment';
	import { SvelteQueryDevtools } from '@tanstack/svelte-query-devtools';
	import { resolve } from '$app/paths';

	let { data, children } = $props();

	let { supabase, tokenCount, user, userMetadata } = $derived(data);

	setContext('board', () => ({ tokenCount, userMetadata }));

	let getUser = getContext<UserContext>('user');

	let { loggedIn } = $derived(getUser());

	$effect.pre(() => {
		berichtgenStore.processPhotos = JSON.parse(localStorage.getItem('processPhotos') ?? 'false');
		berichtgenStore.rewordJSON = loggedIn
			? JSON.parse(localStorage.getItem('rewordJSON') ?? 'false')
			: false;
		berichtgenStore.contantHours = JSON.parse(localStorage.getItem('contantHours') ?? 'false');
		berichtgenStore.preferedTemplatePath = JSON.parse(
			localStorage.getItem('preferedTemplatePath') ?? 'null'
		);
	});

	onMount(() => {
		if (page.url.searchParams.get('payment') === PaymentStatus.SUCCESS) {
			toast.success('Kauf von Tokens erfolgreich!');
			const cleanUrl = `${page.url.pathname}${page.url.hash || ''}`;
			replaceState(resolve(cleanUrl as `/webhooks/stripe`), '');
		}

		let channel: RealtimeChannel | null = null;

		if (user) {
			channel = supabase
				.channel('token-update')
				.on(
					'postgres_changes',
					{ event: 'UPDATE', table: 'userTokenCount', schema: 'public' },
					(p) => {
						tokenCount = p.new.tokens;
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

	const queryClient = new QueryClient({ defaultOptions: { queries: { enabled: browser } } });
</script>

<QueryClientProvider client={queryClient}>
	{@render children()}
	<SvelteQueryDevtools initialIsOpen={false} />
</QueryClientProvider>
