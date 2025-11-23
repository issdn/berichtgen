import { FileTypes } from '$src/lib/enums';
import type { ResultEntry } from '$src/lib/types';
import { getQuickJS } from 'quickjs-emscripten';
import { createReport } from 'docx-templates';

export async function handleDOCXDownload({
	template,
	entries,
	filename = 'bericht.docx'
}: {
	template: Uint8Array<ArrayBufferLike>;
	entries: Promise<ResultEntry[]>;
	filename?: string;
}) {
	const QuickJS = await getQuickJS();
	const vm = QuickJS.newContext();

	const blob = await await createReport({
		cmdDelimiter: ['{{', '}}'],
		template,
		data: { berichte: await entries },
		runJs: ({ sandbox }) => {
			return { result: vm.evalCode(sandbox.__code__!), modifiedSandbox: sandbox };
		}
	});

	const url = URL.createObjectURL(
		new Blob([Uint8Array.from(blob)], {
			type: FileTypes.DOCX
		})
	);
	const a = document.createElement('a');

	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();

	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}
