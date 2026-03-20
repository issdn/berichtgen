export function clamp(num: number, min: number, max: number) {
	return Math.min(Math.max(num, min), max);
}

export function getArrayDepth(arr: unknown[]): number {
	if (!Array.isArray(arr)) return 0;
	return (
		1 + Math.max(0, ...arr.map(getArrayDepth as (value: unknown) => number))
	);
}
