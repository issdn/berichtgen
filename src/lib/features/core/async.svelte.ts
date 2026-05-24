import { toErrorBody } from '$lib/errors';
import * as Sentry from '@sentry/sveltekit';

export type AsyncOptions<T> = {
	captureToSentry?: boolean;
	initialValue?: Promise<T> | T;
	onError?: (e: ReturnType<typeof toErrorBody>) => void;
	onFinished?: () => void;
	onSuccess?: (data: T) => void;
};

/**
 * T: The return type of the async function
 * P: The parameters of the async function (as a tuple)
 */
export class AsyncResource<T, P extends unknown[]> {
	// Reactive Getters
	get data(): null | T {
		return this.#data;
	}
	get error(): null | ReturnType<typeof toErrorBody> {
		return this.#error;
	}
	get loading(): boolean {
		return this.#loading;
	}

	#asyncFn: (...args: P) => Promise<T>;
	#data = $state<null | T>(null);

	#error = $state<null | ReturnType<typeof toErrorBody>>(null);

	#loading = $state(false);
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
}
