<script lang="ts">
	import Dropzone from '$lib/components/Dropzone.svelte';
	import Howto from '$lib/components/Howto.svelte';
	import { onMount } from 'svelte';
	import Wizard from './Wizard.svelte';
	import { toast } from 'svelte-sonner';
	import * as Sentry from '@sentry/browser';

	let { data } = $props();
	const { supabase, tokenCount } = data;
	let userTokens = $state(tokenCount);

	onMount(() => {
		const channel = supabase
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

		return () => {
			channel.unsubscribe();
		};
	});
</script>

<div class="h-main flex w-full flex-col gap-x-8 gap-y-8 px-8 pb-8 md:flex-row">
	<div class="h-full w-full">
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
