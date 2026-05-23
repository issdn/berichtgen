<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import TemplatesDialogContent from './TemplatesDialogContent.svelte';
	import TemplatesContextDecorator from './TemplatesContextDecorator.svelte';

	// into $$ComponentProps; defineMeta sees a mismatch with its Record<string,never>
	// constraint. The component renders correctly at runtime.
	const { Story } = defineMeta({
		title: 'Board/Templates/TemplatesDialogContent',
		component: TemplatesDialogContent,
		parameters: { layout: 'centered' },
		// @ts-expect-error — Svelte 5 propagates Dialog.Content's required `children`
		decorators: [() => ({ Component: TemplatesContextDecorator })]
	});
</script>

<!--
	getTemplates is mocked by the storybook:mock-remote-modules Vite plugin
	(see .storybook/main.ts). The spy returns { templates: [], hasMore: false }
	by default. Override in loaders if you need specific fixture data.
-->
<Story name="Standard" />

<Story
	name="LoggedIn"
	decorators={[
		() => ({
			Component: TemplatesContextDecorator,
			props: { loggedIn: true, userId: 'user-story-a' }
		})
	]}
/>
