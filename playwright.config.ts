import { defineConfig } from '@playwright/test';

export default defineConfig({
	globalSetup: './e2e/global-setup.ts',

	testDir: 'e2e',

	use: {
		baseURL: 'http://localhost:5173',
		storageState: 'e2e/.auth/user.json'
	},

	webServer: {
		command: 'pnpm run dev -- --port 5173',
		reuseExistingServer: true,
		timeout: 120_000,
		url: 'http://localhost:5173'
	}
});
