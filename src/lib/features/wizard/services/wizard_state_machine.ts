import { FiniteStateMachine, type Transition } from 'runed';

/**
 * Wizard-specific finite state machine that exposes the previous state
 * alongside the current one. Persistence is owned by the mediator layer.
 */
export class WizardStateMachine<
	StatesT extends string,
	EventsT extends string
> extends FiniteStateMachine<StatesT, EventsT> {
	previous: null | StatesT = null;

	constructor({
		initial,
		states
	}: {
		initial: StatesT;
		states: Transition<StatesT, EventsT>;
	}) {
		super(initial, states);
	}

	override send(event: EventsT, ...args: unknown[]): StatesT {
		const before = this.current;
		const next = super.send(event, ...args);

		if (before !== next) {
			this.previous = before;
		}

		return next;
	}
}
