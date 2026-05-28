import { FiniteStateMachine, type Transition } from 'runed';

export class PersistedFiniteStateMachine<
	StatesT extends string,
	EventsT extends string
> extends FiniteStateMachine<StatesT, EventsT> {
	#onAfterSend: ({ changed }: { changed: boolean }) => void;

	constructor({
		initial,
		onAfterSend,
		states
	}: {
		initial: StatesT;
		onAfterSend: ({ changed }: { changed: boolean }) => void;
		states: Transition<StatesT, EventsT>;
	}) {
		super(initial, states);
		this.#onAfterSend = onAfterSend;
	}

	override send(event: EventsT, ...args: unknown[]): StatesT {
		const before = this.current;
		const next = super.send(event, ...args);
		this.#onAfterSend({ changed: before !== next });
		return next;
	}
}
