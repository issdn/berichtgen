import { BerichtgenError } from '$lib/errors';
import { checkPreferredTemplate } from '$wizard/api/wizard.remote';
import { ETemplateError } from '$wizard/errors';

export type WizardDownloadType = 'docx' | 'json';

export function getWizardDownloadFilename({
	name,
	type
}: {
	name: string;
	type: WizardDownloadType;
}) {
	const baseName = getWizardDownloadNameBase({ name });
	return `${baseName}.${type}`;
}

export async function getPreferredTemplateBytes({
	preferredTemplatePath,
	supabase
}: {
	preferredTemplatePath: null | string;
	supabase: App.PageData['supabase'];
}): Promise<Uint8Array<ArrayBuffer>> {
	if (!preferredTemplatePath) {
		throw new BerichtgenError(
			ETemplateError.PREFERRED_TEMPLATE_MISSING_SELECTION
		);
	}

	const { exists } = await checkPreferredTemplate({
		storagePath: preferredTemplatePath
	});
	if (!exists) {
		throw new BerichtgenError(ETemplateError.PREFERRED_TEMPLATE_DELETED);
	}

	const templateResult = await supabase.storage
		.from('templates')
		.download(preferredTemplatePath);
	if (!templateResult.data) {
		throw new BerichtgenError(ETemplateError.PREFERRED_TEMPLATE_FILE_MISSING);
	}

	return new Uint8Array(await templateResult.data.arrayBuffer());
}

function getWizardDownloadNameBase({ name }: { name: string }) {
	if (URL.canParse(name)) {
		const url = new URL(name);
		const urlName =
			url.pathname
				.split('/')
				.filter(Boolean)
				.at(-1)
				?.replace(/\.[^.]+$/, '') ?? url.hostname;
		return sanitizeFilename(urlName);
	}

	return sanitizeFilename(name.replace(/\.[^.]+$/, ''));
}

function sanitizeFilename(name: string) {
	const trimmed = name.trim();
	return trimmed.length > 0
		? // eslint-disable-next-line no-control-regex
			trimmed.replace(/[<>:"/\\|?*\u0000-\u001F]/gu, '_')
		: 'bericht';
}
