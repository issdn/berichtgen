import type { KyselyDatabase } from '$lib/schema';
import type { User } from '@supabase/supabase-js';

import { LOCALE } from '$lib/constants';
import { DateFormatter } from '@internationalized/date';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & {
	ref?: null | U;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, 'child'> : T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any }
	? Omit<T, 'children'>
	: T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function downloadBlob(blob: Blob, filename: string) {
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}

export const debounce = <F extends (...args: Parameters<F>) => ReturnType<F>>(
	func: F,
	waitFor: number = 500
) => {
	let timeout: ReturnType<typeof setTimeout>;

	const debounced = (...args: Parameters<F>): void => {
		clearTimeout(timeout);
		timeout = setTimeout(() => func(...args), waitFor);
	};

	/** Cancel any pending invocation. Safe to call multiple times. */
	debounced.cancel = (): void => clearTimeout(timeout);

	return debounced;
};

export function clamp(num: number, min: number, max: number) {
	return Math.min(Math.max(num, min), max);
}
export function getUserDisplayName(
	profile: KyselyDatabase['profile'] | null,
	user?: null | User
) {
	const fullName =
		profile?.full_name ??
		(user?.user_metadata.name as string | undefined) ??
		'Anonym';

	const shortName = fullName
		.split(' ')
		.map((s) => s[0])
		.join('');

	return { fullName, shortName };
}

export const dateFormatter = new DateFormatter(LOCALE, {
	dateStyle: 'short'
});
