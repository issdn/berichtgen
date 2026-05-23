import type { Attributes, ReplaceAttr } from '$core/types';
import type { BerichtgenError } from '$lib/errors';
import type { WizardStep } from '$wizard/enums';
import type { WizardFileContext } from '$wizard/services/wizard_file_context';

export type WizardPersistedFile = {
	id: string;
	step: WizardStep;
} & ReplaceAttr<
	Attributes<WizardFileContext>,
	'error',
	BerichtgenError['apiError'] | undefined
>;

export type WizardPersistedSession = {
	sessionId: string;
	updatedAt: number;
	flushRequested: boolean;
	files: WizardPersistedFile[];
};

export type BatchErrorScope = 'file_scoped' | 'global';
