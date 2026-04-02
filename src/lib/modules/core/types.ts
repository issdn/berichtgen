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
