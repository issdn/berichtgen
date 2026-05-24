import type { ExternalToast } from 'svelte-sonner';

export const ScanReturnValue = Object.freeze({
	DATA_TRANSFER_ITEM: { type: 'data_transfer_item' },
	FILE: { type: 'file' }
} as const);

export type Attributes<T> = Pick<T, NonFunctionKeys<T>>;

/**
 * Represents a flash message that can be displayed to the user.
 * It includes a type (success, error, or info), a message string,
 * and optionally additional data for external toasts.
 *
 * !!! Even though the `data` specifies all properties, only the primitives can be stored in a cookie and this used in a flash message.
 */
export type FlashMessage = {
	data?: ExternalToast | undefined;
	message: string;
	type: 'error' | 'info' | 'success';
};

export type NonFunctionKeys<T> = {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
	[K in keyof T]: T[K] extends Function ? never : K;
}[keyof T];

/**
 * Dropzone component overrides global paste event handler on mount.
 * On unmount, it restores the previous handler.
 * For more see *Dropzone.svelte*, *WizardDropzone.svelte* and *paste_stack.svelte.ts*
 */
export type PasteHandler = ((e: ClipboardEvent) => void)[];

export type ReplaceAttr<T, K extends keyof T, V> = Omit<T, K> & {
	[P in K]: V;
};

export type ScanReturnType =
	(typeof ScanReturnValue)[keyof typeof ScanReturnValue];

// Available only when user is logged in and only on board routes
export type UserBoardContext = {
	setTokenCount: (count: number) => void;
	tokenCount: number;
	userMetadata: null | {
		abteilung: null | string;
		ausbildungsberuf: null | string;
		fullName: null | string;
	};
};
