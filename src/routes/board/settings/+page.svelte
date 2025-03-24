<script lang="ts">
	import * as Form from '$lib/components/ui/form/index.js';
	import SuperDebug, { superForm } from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import { Input } from '$lib/components/ui/input/index.js';
	import { providersSchema } from './schema.js';
	const { data } = $props();

	const { form: validator } = data;

	const form = superForm(validator, {
		validators: zodClient(providersSchema),
		dataType: 'json'
	});

	const { form: formData, enhance } = form;
</script>

<SuperDebug data={formData} />

<form method="POST" use:enhance>
	{#each $formData.providers as provider, i}
		<Form.Field {form} name="providers">
			<Form.Control>
				{#snippet children({ props })}
					<Form.Label>{provider.name}</Form.Label>
					<Input {...props} bind:value={$formData.providers[i].token} />
				{/snippet}
			</Form.Control>
			<Form.Description />
			<Form.FieldErrors />
		</Form.Field>
	{/each}
</form>
