export const ScanReturnValue = Object.freeze({
	FILE: { type: 'file' },
	DATA_TRANSFER_ITEM: { type: 'data_transfer_item' }
} as const);

export type ScanReturnType =
	(typeof ScanReturnValue)[keyof typeof ScanReturnValue];
