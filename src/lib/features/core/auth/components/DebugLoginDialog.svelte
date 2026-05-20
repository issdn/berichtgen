<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { debugLoginSchema } from '$core/auth/schemas';
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as Form from '$lib/components/ui/form/index.js';
	import { Input } from '$ui/input';
	import { Bug } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { defaults, superForm } from 'sveltekit-superforms';
	import { zod4 } from 'sveltekit-superforms/adapters';

	/**
	 * Debug-only login dialog.
	 * Only rendered when `dev === true` (never bundled into production).
	 * Uses the Supabase browser client already present in the user context
	 * so no server action is required.
	 */

	let open = $state(false);

	const form = superForm(defaults(zod4(debugLoginSchema)), {
		SPA: true,
		validators: zod4(debugLoginSchema),
		validationMethod: 'oninput',
		async onUpdate({ form }) {
			if (!form.valid) return;
			const { error } = await page.data.supabase.auth.signInWithPassword({
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
	<Dialog.Trigger class={buttonVariants({ variant: 'outline' })}
		><Bug />Debug Login
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
