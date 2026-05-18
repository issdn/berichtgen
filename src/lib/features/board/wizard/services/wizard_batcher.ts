import { SvelteMap } from 'svelte/reactivity';
import type { WizardProcessStateMachine } from '$wizard/types';

export class WizardBatcher {
	readonly pendingById = new SvelteMap<string, WizardProcessStateMachine>();

	get size() {
		return this.pendingById.size;
	}

	get isRunning() {
		return this.size > 0;
	}

	reset() {
		this.pendingById.clear();
	}

	register(process: WizardProcessStateMachine) {
		this.pendingById.set(process.id, process);
	}

	takePendingIds(): string[] {
		const ids = [...this.pendingById.keys()];
		this.pendingById.clear();
		return ids;
	}
}
