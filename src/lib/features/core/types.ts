import type { ExternalToast } from 'svelte-sonner';

export const ScanReturnValue = Object.freeze({
	FILE: { type: 'file' },
	DATA_TRANSFER_ITEM: { type: 'data_transfer_item' }
} as const);

export type ScanReturnType =
	(typeof ScanReturnValue)[keyof typeof ScanReturnValue];

/**
 * Represents a flash message that can be displayed to the user.
 * It includes a type (success, error, or info), a message string,
 * and optionally additional data for external toasts.
 *
 * !!! Even though the `data` specifies all properties, only the primitives can be stored in a cookie and this used in a flash message.
 */
export type FlashMessage = {
	type: 'success' | 'error' | 'info';
	message: string;
	data?: ExternalToast | undefined;
};

export type NonFunctionKeys<T> = {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
	[K in keyof T]: T[K] extends Function ? never : K;
}[keyof T];

export type Attributes<T> = Pick<T, NonFunctionKeys<T>>;

export type ReplaceAttr<T, K extends keyof T, V> = Omit<T, K> & {
	[P in K]: V;
};

// Available only when user is logged in and only on board routes
export type UserBoardContext = {
	tokenCount: number;
	setTokenCount: (count: number) => void;
	userMetadata: {
		fullName: string | null;
		ausbildungsberuf: string | null;
		abteilung: string | null;
	} | null;
};

/**
 * Dropzone component overrides global paste event handler on mount.
 * On unmount, it restores the previous handler.
 * For more see *Dropzone.svelte*, *WizardDropzone.svelte* and *paste_stack.svelte.ts*
 */
export type PasteHandler = ((e: ClipboardEvent) => void)[];
