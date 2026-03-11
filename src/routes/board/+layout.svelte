<script lang="ts">
	import { type UserContext } from '$src/lib/types.js';
	import { getContext, setContext } from 'svelte';
	import { berichtgenStore } from '$src/lib/stores/berichtgen.svelte';
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import { browser } from '$app/environment';
	import { SvelteQueryDevtools } from '@tanstack/svelte-query-devtools';

	let { data, children } = $props();

	let { tokenCount, userMetadata } = $derived(data);

	function setTokenCount(count: number) {
		tokenCount = count;
	}

	setContext('board', () => ({ tokenCount, setTokenCount, userMetadata }));

	let getUser = getContext<UserContext>('user');

	let { loggedIn } = $derived(getUser());

	$effect.pre(() => {
		berichtgenStore.processPhotos = JSON.parse(localStorage.getItem('processPhotos') ?? 'false');
		berichtgenStore.rewordJSON = loggedIn
			? JSON.parse(localStorage.getItem('rewordJSON') ?? 'false')
			: false;
		berichtgenStore.constantHours = JSON.parse(localStorage.getItem('constantHours') ?? 'false');
		berichtgenStore.preferedTemplatePath = JSON.parse(
			localStorage.getItem('preferedTemplatePath') ?? 'null'
		);
	});

	const queryClient = new QueryClient({ defaultOptions: { queries: { enabled: browser } } });
</script>

<QueryClientProvider client={queryClient}>
	{@render children()}
	<SvelteQueryDevtools initialIsOpen={false} />
</QueryClientProvider>
