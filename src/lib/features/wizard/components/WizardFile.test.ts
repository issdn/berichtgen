import type { WizardMediator } from '$wizard/services/wizard_mediator.svelte';

import { WizardStep } from '$wizard/enums';
import { createStateMachineForContext } from '$wizard/services/state_machine';
import { WizardFileContext } from '$wizard/services/wizard_file_context';
// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, test, vi } from 'vitest';

vi.mock('$wizard/api/wizard.remote', () => ({}));
vi.mock('./TimeSpreadDialog.svelte', () => ({
	default: class TimeSpreadDialogStub {}
}));

import WizardFile from './WizardFile.svelte';

afterEach(() => {
	cleanup();
});

function renderWizardFile({ step }: { step: WizardStep }) {
	const context = new WizardFileContext({
		file: new File(['hello'], 'beispiel.txt', { type: 'text/plain' }),
		type: 'file'
	});
	const scheduler = {
		finish: vi.fn(),
		hasProcess: vi.fn(() => true),
		isDone: false,
		onFileBatchPending: vi.fn(),
		onFileCancelled: vi.fn()
	} as unknown as WizardMediator;
	const machine = createStateMachineForContext({
		context,
		id: 'file-1',
		initialStep: step,
		scheduler
	});

	return render(WizardFile, {
		props: {
			cancel: vi.fn(),
			confirmDateRanges: vi.fn(),
			context,
			id: 'file-1',
			machine,
			remove: vi.fn(),
			restart: vi.fn()
		}
	});
}

describe('WizardFile action visibility', () => {
	test('shows Trash before AI completion starts', () => {
		renderWizardFile({ step: WizardStep.INITIALISING });

		expect(screen.getByTestId('wizard-file-remove')).not.toBeNull();
		expect(screen.queryByTestId('wizard-file-cancel')).toBeNull();
	});

	test('shows no remove or cancel action during active AI completion', () => {
		renderWizardFile({ step: WizardStep.AI_COMPLETION });

		expect(screen.queryByTestId('wizard-file-remove')).toBeNull();
		expect(screen.queryByTestId('wizard-file-cancel')).toBeNull();
	});

	test('shows only cancel after AI completion finished', () => {
		renderWizardFile({ step: WizardStep.DONE });

		expect(screen.queryByTestId('wizard-file-remove')).toBeNull();
		expect(screen.getByTestId('wizard-file-cancel')).not.toBeNull();
	});
});
