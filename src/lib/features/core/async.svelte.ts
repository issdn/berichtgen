import { toErrorBody } from '$lib/errors';
import * as Sentry from '@sentry/sveltekit';

export type AsyncOptions<T> = {
	initialValue?: T | Promise<T>;
	onSuccess?: (data: T) => void;
	onError?: (e: ReturnType<typeof toErrorBody>) => void;
	onFinished?: () => void;
	captureToSentry?: boolean;
};

/**
 * T: The return type of the async function
 * P: The parameters of the async function (as a tuple)
 */
export class AsyncResource<T, P extends unknown[]> {
	#data = $state<T | null>(null);
	#loading = $state(false);
	#error = $state<ReturnType<typeof toErrorBody> | null>(null);

	#asyncFn: (...args: P) => Promise<T>;
	#options: AsyncOptions<T>;

	constructor(
		asyncFn: (...args: P) => Promise<T>,
		options: AsyncOptions<T> = {}
	) {
		this.#asyncFn = asyncFn;
		this.#options = options;

		if (options.initialValue instanceof Promise) {
			this.#handleInitialPromise(options.initialValue);
		} else if (options.initialValue !== undefined) {
			this.#data = options.initialValue;
		}
	}

	// Reactive Getters
	get data(): T | null {
		return this.#data;
	}
	get loading(): boolean {
		return this.#loading;
	}
	get error(): ReturnType<typeof toErrorBody> | null {
		return this.#error;
	}

	async #handleInitialPromise(promise: Promise<T>): Promise<void> {
		this.#loading = true;
		try {
			this.#data = await promise;
		} catch (e: unknown) {
			this.#error = toErrorBody(e);
		} finally {
			this.#loading = false;
		}
	}

	/**
	 * Arguments are strictly typed based on the input function.
	 */
	execute = async (...args: P): Promise<T | undefined> => {
		this.#loading = true;
		this.#error = null;

		try {
			const result = await this.#asyncFn(...args);
			this.#data = result;
			this.#options.onSuccess?.(result);
			return result;
		} catch (e: unknown) {
			console.log(e, typeof e);
			const body = toErrorBody(e);
			this.#error = body;
			this.#options.onError?.(body);
			if (this.#options.captureToSentry) {
				// Capture the original error, not the transformed body
				Sentry.captureException(e);
			}
			return undefined;
		} finally {
			this.#loading = false;
			this.#options.onFinished?.();
		}
	};
}
