import type { Attributes, ReplaceAttr } from '$core/types';
import type { BerichtgenError } from '$lib/errors';
import type { WizardStep } from '$wizard/enums';
import type { WizardFileContext } from '$wizard/services/wizard_file_context';

export type BatchErrorScope = 'file_scoped' | 'global';

export type WizardPersistedFile = ReplaceAttr<
	Attributes<WizardFileContext>,
	'error',
	BerichtgenError['apiError'] | undefined
> & {
	id: string;
	step: WizardStep;
};

export type WizardPersistedSession = {
	files: WizardPersistedFile[];
	flushRequested: boolean;
	sessionId: string;
	updatedAt: number;
};
