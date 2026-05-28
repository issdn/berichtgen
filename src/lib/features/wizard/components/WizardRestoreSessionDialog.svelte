<script lang="ts">
	import type { WizardPersistedSession } from '$wizard/types';

	import { AsyncResource } from '$core/async.svelte';
	import * as AlertDialog from '$ui/alert-dialog';
	import { Spinner } from '$ui/spinner';
	import { wizardMediatorContext } from '$wizard/services/wizard_mediator.svelte';

	let { session }: { session: WizardPersistedSession } = $props();

	const wizardMediator = wizardMediatorContext.get();

	let dismissed = $state(false);

	async function discardRestoredSession() {
		dismissed = true;
		await wizardMediator.clearPersistedSession();
	}

	const restoreSessionMutation = new AsyncResource(
		async ({ session }: { session: WizardPersistedSession }) => {
			wizardMediator.processInit = Promise.resolve(
				wizardMediator.init(session)
			);
			await wizardMediator.processInit;
			dismissed = true;
		}
	);
</script>

{#if !dismissed}
	<AlertDialog.Root open={true}>
		<AlertDialog.Content data-testid="wizard-restore-dialog">
			<AlertDialog.Header>
				<AlertDialog.Title>Vorherige Sitzung gefunden</AlertDialog.Title>
				<AlertDialog.Description>
					{session.files.length} Dateien, zuletzt gespeichert am&nbsp;
					{new Date(session.updatedAt).toLocaleString()}.
					{#if restoreSessionMutation.error !== null}
						<p class="text-destructive mt-2 text-sm">
							{restoreSessionMutation.error.message}
						</p>
					{/if}
				</AlertDialog.Description>
			</AlertDialog.Header>
			<AlertDialog.Footer>
				<AlertDialog.Cancel
					data-testid="wizard-restore-discard"
					onclick={discardRestoredSession}
				>
					Verwerfen
				</AlertDialog.Cancel>
				<AlertDialog.Action
					data-testid="wizard-restore-resume"
					disabled={restoreSessionMutation.loading ||
						restoreSessionMutation.error !== null}
					onclick={() => restoreSessionMutation.execute({ session })}
				>
					{#if restoreSessionMutation.loading}
						<Spinner size="sm" />
					{/if}
					Fortsetzen
				</AlertDialog.Action>
			</AlertDialog.Footer>
		</AlertDialog.Content>
	</AlertDialog.Root>
{/if}
