import { FileTypes } from '$src/lib/enums';
import type { Entry, ResultEntry, UserMetadata } from '$src/lib/types';
import { getQuickJS, type QuickJSContext } from 'quickjs-emscripten';
import { createReport } from 'docx-templates';

import { downloadBlob } from './dom';

export type SandBox = Parameters<
	NonNullable<Parameters<typeof createReport>[0]['runJs']>
>[0]['sandbox'];

/** Maximum milliseconds a single template JS expression may run before being interrupted. */
const JS_EXECUTION_TIMEOUT_MS = 5_000;

/**
 * Builds the `runJs` callback that docx-templates calls for each `{{ }}` expression.
 * Exported for unit testing. The caller is responsible for disposing `vm` after
 * `createReport` resolves — this function must NOT call `vm.dispose()`.
 */
export function buildRunJs(vm: QuickJSContext, injected: Map<string, string>) {
	return ({ sandbox }: { sandbox: SandBox }) => {
		for (const [key, value] of Object.entries(sandbox)) {
			if (key === '__code__' || key === '__result__') continue;

			const json = JSON.stringify(value);
			if (json === undefined) continue;

			if (injected.get(key) === json) continue;
			injected.set(key, json);

			const jsonHandle = vm.evalCode(`(${json})`);
			if (jsonHandle.error) {
				const err = vm.dump(jsonHandle.error);
				jsonHandle.error.dispose();
				throw new Error(JSON.stringify(err));
			}

			vm.setProp(vm.global, key, jsonHandle.value);
			jsonHandle.value.dispose();
		}

		const handle = vm.evalCode(sandbox.__code__ as string);
		if (handle.error) {
			const err = vm.dump(handle.error);
			handle.error.dispose();
			throw new Error(JSON.stringify(err));
		}
		const result = vm.dump(handle.value);
		handle.value.dispose();
		return { modifiedSandbox: sandbox as SandBox, result };
	};
}

export async function handleDOCXDownload({
	template,
	entries,
	userMetadata,
	filename = 'bericht.docx'
}: {
	template: Uint8Array<ArrayBufferLike>;
	entries: Promise<ResultEntry[]>;
	userMetadata?: UserMetadata;
	filename?: string;
}) {
	const QuickJS = await getQuickJS();
	const vm = QuickJS.newContext();

	// Fix vuln-2: interrupt any expression that exceeds the timeout (prevents DoS via infinite loops)
	const deadline = Date.now() + JS_EXECUTION_TIMEOUT_MS;
	vm.runtime.setInterruptHandler(() => Date.now() > deadline);

	const injected = new Map<string, string>();
	try {
		const blob = await generateReportBytes(
			template,
			entries,
			userMetadata,
			injected,
			vm
		);
		downloadBlob(
			new Blob([Uint8Array.from(blob)], {
				type: FileTypes.DOCX
			}),
			filename
		);
	} finally {
		// Fix vuln-1: dispose AFTER createReport completes, not inside the per-expression callback
		vm.dispose();
	}
}

export async function generateReportBytes(
	template: Uint8Array<ArrayBufferLike>,
	entries: Promise<Required<Entry>[]>,
	userMetadata: UserMetadata | undefined,
	injected: Map<string, string>,
	vm: QuickJSContext
) {
	const berichte = await entries;
	return await createReport({
		cmdDelimiter: ['{{', '}}'],
		template,
		noSandbox: true,
		data: {
			berichte,
			user: {
				fullName: userMetadata?.fullName ?? '',
				ausbildungsberuf: userMetadata?.ausbildungsberuf ?? '',
				abteilung: userMetadata?.abteilung ?? ''
			}
		},
		// Fix vuln-1: use buildRunJs — no vm.dispose() inside the callback
		runJs: buildRunJs(vm, injected)
	});
}
