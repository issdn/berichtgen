<script lang="ts">
	/**
	 * Debug-only login dialog.
	 * Only rendered when `dev === true` (never bundled into production).
	 * Uses the Supabase browser client already present in the user context
	 * so no server action is required.
	 */
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as Form from '$lib/components/ui/form/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { defaults, superForm } from 'sveltekit-superforms/client';
	import { zod4 } from 'sveltekit-superforms/adapters';
	import { debugLoginSchema } from '$lib/schemas';
	import { Bug } from '@lucide/svelte';
	import { getContext } from 'svelte';
	import type { UserContext } from '$lib/types';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	let { supabase } = $derived(getContext<UserContext>('user')());

	let open = $state(false);

	const form = superForm(defaults(zod4(debugLoginSchema)), {
		SPA: true,
		validators: zod4(debugLoginSchema),
		validationMethod: 'oninput',
		async onUpdate({ form }) {
			if (!form.valid) return;
			const { error } = await supabase.auth.signInWithPassword({
				email: form.data.email,
				password: form.data.password
			});
			if (error) {
				toast.error(error.message);
				return;
			}
			open = false;
			goto(resolve('/board'), { invalidateAll: true });
		}
	});

	const { form: formData, enhance, submitting } = form;
</script>

<Dialog.Root bind:open>
	<Dialog.Trigger>
		<Button variant="outline" class="w-full"><Bug />Debug Login</Button>
	</Dialog.Trigger>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Debug Login</Dialog.Title>
			<Dialog.Description
				>Nur in der Entwicklungsumgebung verfügbar.</Dialog.Description
			>
		</Dialog.Header>
		<form use:enhance class="flex flex-col gap-4 pt-2">
			<Form.Field {form} name="email">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label>Email</Form.Label>
						<Input
							type="email"
							autocomplete="email"
							{...props}
							bind:value={$formData.email}
						/>
					{/snippet}
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>
			<Form.Field {form} name="password">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label>Passwort</Form.Label>
						<Input
							type="password"
							autocomplete="current-password"
							{...props}
							bind:value={$formData.password}
						/>
					{/snippet}
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>
			<Button type="submit" disabled={$submitting}>
				{$submitting ? 'Wird angemeldet…' : 'Anmelden'}
			</Button>
		</form>
	</Dialog.Content>
</Dialog.Root>
