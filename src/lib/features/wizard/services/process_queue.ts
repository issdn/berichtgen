type QueueCallbacks<T> = {
	ondequeue?: (
		removed: T | undefined,
		nextToStart: T | undefined,
		items: readonly T[]
	) => void;
	onenqueue?: (item: T, index: number, items: readonly T[]) => void;
};

export class ProcessQueue<T> {
	private readonly items: T[] = [];

	constructor(
		public readonly batchSize: number,
		private readonly callbacks: QueueCallbacks<T> = {}
	) {}

	dequeue(): T | undefined {
		const shifted = this.items.shift();
		this.callbacks.ondequeue?.(
			shifted,
			this.items.at(this.batchSize),
			this.items
		);
		return shifted;
	}

	enqueue(item: T) {
		this.items.push(item);
		this.callbacks.onenqueue?.(item, this.items.length - 1, this.items);
	}

	reset() {
		this.items.length = 0;
	}
}
