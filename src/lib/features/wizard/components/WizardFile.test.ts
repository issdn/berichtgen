import { WizardStep } from '$wizard/enums';
// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, test, vi } from 'vitest';

import WizardFile from './WizardFile.svelte';

afterEach(() => {
	cleanup();
});

function renderWizardFile({ step }: { step: WizardStep }) {
	return render(WizardFile, {
		props: {
			cancel: vi.fn(),
			confirmDateRanges: vi.fn(),
			context: {
				entry: {
					file: new File(['hello'], 'beispiel.txt', { type: 'text/plain' }),
					type: 'file'
				}
			},
			id: 'file-1',
			machine: { current: step },
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
