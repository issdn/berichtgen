import { LOCALE, TIMEZONE } from '$src/lib/constants';
import { DateFormatter, parseAbsolute } from '@internationalized/date';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

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
