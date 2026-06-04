import type { KyselyDatabase } from '$lib/schema';
import type { CompletionResult, TimeSpreadResult } from '$wizard/types';
import type { QuickJSContext } from 'quickjs-emscripten';

import { JS_EXECUTION_TIMEOUT_MS } from '$lib/constants';
import { downloadBlob } from '$lib/utils';
import { FileTypes } from '$wizard/enums';
import { createReport } from 'docx-templates';
import { getQuickJS } from 'quickjs-emscripten';

export type SandBox = Parameters<
	NonNullable<Parameters<typeof createReport>[0]['runJs']>
>[0]['sandbox'];

/**
 * Builds the `runJs` callback that docx-templates calls for each `{{ }}` expression.
 * Exported for unit testing. The caller is responsible for disposing `vm` after
 * `createReport` resolves — this function must NOT call `vm.dispose()`.
 */
function buildRunJs(vm: QuickJSContext, injected: Map<string, string>) {
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

export async function generateReportBytes(
	template: Uint8Array<ArrayBufferLike>,
	entries: Promise<CompletionResult>,
	userMetadata: KyselyDatabase['user_metadata'] | undefined,
	injected: Map<string, string>,
	vm: QuickJSContext
) {
	const berichte = await entries;

	return await createReport({
		cmdDelimiter: ['{{', '}}'],
		data: {
			abteilung: userMetadata?.abteilung ?? '',
			ausbildungsberuf: userMetadata?.ausbildungsberuf ?? '',
			berichte,
			fullName: userMetadata?.full_name ?? ''
		},
		noSandbox: true,
		runJs: buildRunJs(vm, injected),
		template
	});
}

export async function handleDOCXDownload({
	entries,
	filename = 'bericht.docx',
	template,
	userMetadata
}: {
	entries: Promise<TimeSpreadResult>;
	filename?: string;
	template: Uint8Array<ArrayBufferLike>;
	userMetadata?: KyselyDatabase['user_metadata'];
}) {
	const blob = await renderDocxBlob({ entries, template, userMetadata });
	downloadBlob(blob, filename);
}

export async function renderDocxBlob({
	entries,
	template,
	userMetadata
}: {
	entries: Promise<CompletionResult>;
	template: Uint8Array<ArrayBufferLike>;
	userMetadata?: KyselyDatabase['user_metadata'];
}): Promise<Blob> {
	return withQuickJsContext(async (vm, injected) => {
		const bytes = await generateReportBytes(
			template,
			entries,
			userMetadata,
			injected,
			vm
		);
		return toDocxBlob(bytes);
	});
}

function toDocxBlob(bytes: Uint8Array<ArrayBufferLike>): Blob {
	return new Blob([Uint8Array.from(bytes)], {
		type: FileTypes.DOCX
	});
}

async function withQuickJsContext<T>(
	run: (vm: QuickJSContext, injected: Map<string, string>) => Promise<T>
): Promise<T> {
	const QuickJS = await getQuickJS();
	const vm = QuickJS.newContext();

	const deadline = Date.now() + JS_EXECUTION_TIMEOUT_MS;
	vm.runtime.setInterruptHandler(() => Date.now() > deadline);

	const injected = new Map<string, string>();
	try {
		return await run(vm, injected);
	} finally {
		vm.dispose();
	}
}
