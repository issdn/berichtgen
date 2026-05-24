/// <reference types="vitest/config" />
import { sentrySvelteKit } from '@sentry/sveltekit';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { playwright } from '@vitest/browser-playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

const dirname =
	typeof __dirname !== 'undefined'
		? __dirname
		: path.dirname(fileURLToPath(import.meta.url));

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig(({ mode }) => ({
	define: {
		__APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.0')
	},
	esbuild: {
		drop: mode === 'production' ? ['console', 'debugger'] : []
	},
	optimizeDeps: {
		exclude: ['quickjs-emscripten']
	},
	plugins: [
		nodePolyfills({
			include: ['buffer']
		}),
		tailwindcss(),
		sentrySvelteKit({
			sourceMapsUploadOptions: {
				authToken: process.env.SENTRY_AUTH_TOKEN,
				org: 'bielski',
				project: 'berichtgen'
			}
		}),
		sveltekit()
	],
	ssr: {
		noExternal: ['@lucide/svelte']
	},
	test: {
		coverage: {
			exclude: [
				'**/.svelte-kit/**',
				'**/node_modules/**',
				'**/*.d.ts',
				'**/*.remote.ts'
			],
			provider: 'v8'
		},
		projects: [
			{
				extends: true,
				test: {
					alias: {
						canvas: new URL('./src/test/__mocks__/canvas.ts', import.meta.url)
							.pathname
					},
					include: ['./src/**/*.test.ts'],
					name: 'unit'
				}
			},
			{
				extends: true,
				plugins: [
					// The plugin will run tests for the stories defined in your Storybook config
					// See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
					storybookTest({
						configDir: path.join(dirname, '.storybook')
					})
				],
				test: {
					browser: {
						enabled: true,
						headless: true,
						instances: [
							{
								browser: 'chromium'
							}
						],
						provider: playwright()
					},
					name: 'storybook'
				}
			}
		]
	}
}));
