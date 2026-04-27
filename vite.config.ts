/// <reference types="vitest/config" />
import { sentrySvelteKit } from '@sentry/sveltekit';
import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';

const dirname =
	typeof __dirname !== 'undefined'
		? __dirname
		: path.dirname(fileURLToPath(import.meta.url));

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig(({ mode }) => ({
	define: {
		__APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.0')
	},
	plugins: [
		nodePolyfills({
			include: ['buffer']
		}),
		tailwindcss(),
		sentrySvelteKit({
			sourceMapsUploadOptions: {
				org: 'bielski',
				project: 'berichtgen',
				authToken: process.env.SENTRY_AUTH_TOKEN
			}
		}),
		sveltekit()
	],
	esbuild: {
		drop: mode === 'production' ? ['console', 'debugger'] : []
	},
	ssr: {
		noExternal: ['@lucide/svelte']
	},
	optimizeDeps: {
		exclude: ['quickjs-emscripten']
	},
	test: {
		projects: [
			{
				extends: true,
				test: {
					include: ['./src/test/**/*.test.ts'],
					alias: {
						canvas: new URL('./src/test/__mocks__/canvas.ts', import.meta.url)
							.pathname
					}
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
					name: 'storybook',
					browser: {
						enabled: true,
						headless: true,
						provider: playwright(),
						instances: [
							{
								browser: 'chromium'
							}
						]
					}
				}
			}
		]
	}
}));
