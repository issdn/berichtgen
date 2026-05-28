import type { WizardProcessStateMachine } from '$wizard/types';

import { SvelteMap } from 'svelte/reactivity';

export class WizardBatcher {
	readonly pendingById = new SvelteMap<string, WizardProcessStateMachine>();

	get isRunning() {
		return this.size > 0;
	}

	get size() {
		return this.pendingById.size;
	}

	register(process: WizardProcessStateMachine) {
		this.pendingById.set(process.id, process);
	}

	reset() {
		this.pendingById.clear();
	}

	takePendingIds(): string[] {
		const ids = [...this.pendingById.keys()];
		this.pendingById.clear();
		return ids;
	}

	unregister({ id }: { id: string }) {
		this.pendingById.delete(id);
	}
}
