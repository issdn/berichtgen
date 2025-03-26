export const debounce = <F extends (...args: Parameters<F>) => ReturnType<F>>(
	func: F,
	waitFor: number = 500
) => {
	let timeout: NodeJS.Timer;

	return (...args: Parameters<F>) => {
		clearTimeout(timeout);
		timeout = setTimeout(() => func(...args), waitFor);
	};
};
