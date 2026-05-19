import type { PasteHandler } from '$core/types';

class GlobalPasteStack {
	pasteStack: PasteHandler = [];

	push(callback: (e: ClipboardEvent) => void) {
		window.removeEventListener(
			'paste',
			this.pasteStack[this.pasteStack.length - 1]
		);
		this.pasteStack.push(callback);
		window.addEventListener('paste', callback);
	}

	pop() {
		window.removeEventListener(
			'paste',
			this.pasteStack[this.pasteStack.length - 1]
		);
		this.pasteStack.pop();
		window.addEventListener(
			'paste',
			this.pasteStack[this.pasteStack.length - 1]
		);
	}

	get length() {
		return this.pasteStack.length;
	}

	clear() {
		this.pasteStack = [];
	}
}

export const pasteStack = new GlobalPasteStack();
