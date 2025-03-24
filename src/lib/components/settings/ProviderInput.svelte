<script lang="ts">
	import * as Form from '$lib/components/ui/form/index.js';
	import { superForm } from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import { Input } from '$lib/components/ui/input/index.js';
	import { type ProviderSchema, providerSchema } from '../../../routes/board/settings/schema';
	import * as z from 'zod';
	import { toast } from 'svelte-sonner';
	import { debounce } from '$lib/debounce';

	const { provider }: { provider: z.infer<ProviderSchema> } = $props();

	const form = superForm(provider, {
		validators: zodClient(providerSchema),
		id: provider.id,
		invalidateAll: false,
		dataType: 'json',
		onError({ result }) {
			toast.error(result.error.message);
		},
		onUpdate({ result, cancel }) {
			if (result.type === 'failure') {
				toast.error(
					result.data?.form?.errors?.token?.[0] ??
						result.data?.form?.message ??
						'Unbekannter Fehler.'
				);
				cancel();
			}
		},
		onUpdated({ form }) {
			if (form.valid) {
				toast.success('Gespeichert!');
			}
		}
	});

	const { form: formData, enhance, submit, submitting } = form;

	const debouncedSubmit = debounce(submit);
	form.options.onChange = () => debouncedSubmit();
</script>

<form action="/board/settings" method="POST" use:enhance>
	<Form.Field {form} name="token">
		<Form.Control>
			{#snippet children({ props })}
				<Form.Label>{provider.name}</Form.Label>
				<Input disabled={$submitting} {...props} bind:value={$formData.token} />
			{/snippet}
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>
</form>
