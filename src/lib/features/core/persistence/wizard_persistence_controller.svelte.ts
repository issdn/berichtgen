import type { WizardPersistedSession } from '$wizard/types';

import { AsyncResource } from '$core/async.svelte';
import Persistence from '$core/persistence';
import {
	WIZARD_PERSISTENCE_STORE,
	WIZARD_PERSISTENCE_TTL_MS,
	WIZARD_PERSISTENCE_VERSION
} from '$lib/constants';

type MutationStatus = 'loading' | 'saved';

/** Encapsulates wizard persistence behavior and indicator state. */
export class WizardPersistenceController {
	isRehydrating = $state(false);

	mutation = $state<AsyncResource<void, []> | null>(null);

	status = $state<MutationStatus>('loading');

	private closeTimer: null | ReturnType<typeof setTimeout> = null;

	/** Clears wizard persisted session for a user key. */
	async clearWizardSession({ key }: { key: string }): Promise<void> {
		await this.runMutation({
			op: async () => {
				await Persistence.clear(WIZARD_PERSISTENCE_STORE, key);
			}
		});
	}

	/** Loads wizard persisted session for a user key. */
	async loadWizardSession({
		key
	}: {
		key: string;
	}): Promise<null | WizardPersistedSession> {
		return Persistence.load<WizardPersistedSession>(
			WIZARD_PERSISTENCE_STORE,
			key,
			WIZARD_PERSISTENCE_VERSION,
			WIZARD_PERSISTENCE_TTL_MS
		);
	}

	/** Saves wizard persisted session for a user key. */
	async saveWizardSession({
		key,
		payload
	}: {
		key: string;
		payload: WizardPersistedSession;
	}): Promise<void> {
		await this.runMutation({
			op: async () => {
				await Persistence.save(
					WIZARD_PERSISTENCE_STORE,
					key,
					payload,
					WIZARD_PERSISTENCE_VERSION
				);
			}
		});
	}

	private cancelDelayedClose() {
		if (this.closeTimer === null) return;
		clearTimeout(this.closeTimer);
		this.closeTimer = null;
	}

	private closeAfterDelay() {
		this.cancelDelayedClose();
		this.closeTimer = setTimeout(() => {
			this.mutation = null;
		}, 1000);
	}

	private async runMutation({ op }: { op: () => Promise<void> }) {
		this.cancelDelayedClose();
		const resource = new AsyncResource<void, []>(
			async () => {
				await op();
			},
			{
				onFinished: () => {
					if (resource.error === null) {
						this.status = 'saved';
						this.closeAfterDelay();
					}
				}
			}
		);
		this.status = 'loading';
		this.mutation = resource;
		await resource.execute();
	}
}
