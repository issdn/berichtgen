import * as fs from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const nativeFetch = globalThis.fetch.bind(globalThis);

(globalThis as typeof globalThis & { window?: typeof globalThis }).window =
	globalThis;

globalThis.fetch = async (
	input: Parameters<typeof fetch>[0],
	init?: Parameters<typeof fetch>[1]
) => {
	const url =
		typeof input === 'string'
			? input
			: input instanceof URL
				? input.href
				: input.url;

	if (url.startsWith('file://')) {
		const bytes = await fs.promises.readFile(fileURLToPath(url));
		return new Response(bytes);
	}

	return nativeFetch(input, init);
};

const require = createRequire(import.meta.url);
const quickJsPath = fileURLToPath(
	new URL(
		'../../../node_modules/quickjs-emscripten/dist/index.js',
		import.meta.url
	)
);
const quickJs = require(quickJsPath) as typeof import('quickjs-emscripten');

export const getQuickJS = quickJs.getQuickJS;
