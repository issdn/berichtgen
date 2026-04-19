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
