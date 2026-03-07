import { FileTypes } from '$src/lib/enums';
import type { Entry, ResultEntry, UserMetadata } from '$src/lib/types';
import { getQuickJS, QuickJSContext } from 'quickjs-emscripten';
import { createReport } from 'docx-templates';
import { downloadBlob } from './dom';

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
	const injected = new Map<string, string>();

	const blob = await generateReport(template, entries, userMetadata, injected, vm);

	downloadBlob(
		new Blob([Uint8Array.from(blob)], {
			type: FileTypes.DOCX
		}),
		filename
	);
}
async function generateReport(
	template: Uint8Array<ArrayBufferLike>,
	entries: Promise<Required<Entry>[]>,
	userMetadata: UserMetadata | undefined,
	injected: Map<string, string>,
	vm: QuickJSContext
) {
	return await createReport({
		cmdDelimiter: ['{{', '}}'],
		template,
		noSandbox: true,
		data: {
			berichte: await entries,
			user: {
				fullName: userMetadata?.fullName ?? '',
				ausbildungsberuf: userMetadata?.ausbildungsberuf ?? '',
				abteilung: userMetadata?.abteilung ?? ''
			}
		},
		runJs: ({ sandbox }) => {
			try {
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

				const handle = vm.evalCode(sandbox.__code__!);
				if (handle.error) {
					const err = vm.dump(handle.error);
					handle.error.dispose();
					throw new Error(JSON.stringify(err));
				}
				const result = vm.dump(handle.value);

				handle.value.dispose();
				return { modifiedSandbox: sandbox, result };
			} finally {
				vm.dispose();
			}
		}
	});
}
