import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { DateFormatter, parseAbsolute } from '@internationalized/date';
import { LOCALE, TIMEZONE } from '$lib/constants';
import type { KyselyDatabase } from '$lib/schema';
import type { User } from '@supabase/supabase-js';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, 'child'> : T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any }
	? Omit<T, 'children'>
	: T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & {
	ref?: U | null;
};

export function promisify<T, E>(
	fn: (success: (value: T) => void, error: (message: E) => void) => void
): Promise<T> {
	return new Promise((resolve, reject) => {
		fn(resolve, reject);
	});
}

export function parsePostgresDate(dateString: string): string {
	return new DateFormatter(LOCALE, { dateStyle: 'medium' })
		.format(parseAbsolute(dateString, TIMEZONE).toDate())
		.toString();
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

	return (...args: Parameters<F>) => {
		clearTimeout(timeout);
		timeout = setTimeout(() => func(...args), waitFor);
	};
};

export function clamp(num: number, min: number, max: number) {
	return Math.min(Math.max(num, min), max);
}

export function getArrayDepth(arr: unknown[]): number {
	if (!Array.isArray(arr)) return 0;
	return (
		1 + Math.max(0, ...arr.map(getArrayDepth as (value: unknown) => number))
	);
}

export function getUserDisplayName(
	profile: KyselyDatabase['profile'] | null,
	user?: User | null
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
