<script lang="ts">
	import Dropzone from '$lib/components/Dropzone.svelte';
	import Howto from '$lib/components/Howto.svelte';
	import { SignIn } from '@auth/sveltekit/components';

	let files = $state<FileList | null>(null);
</script>

<div class="flex h-full w-full flex-col p-8 md:flex-row">
	<div class="h-full w-full">
		<SignIn provider="google" signInPage="signin" />
		<Howto></Howto>
	</div>
	<div class="h-full w-full">
		<Dropzone bind:files></Dropzone>
	</div>
</div>
