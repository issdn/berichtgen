/// <reference types="vitest/config" />
import { sentrySvelteKit } from '@sentry/sveltekit';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

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
	resolve: {
		conditions: ['browser']
	},
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
					exclude: ['./src/lib/features/templates/templates.test.ts'],
					include: ['./src/**/*.test.ts'],
					name: 'unit'
				}
			},
			{
				extends: true,
				test: {
					alias: {
						'@sentry/sveltekit': new URL(
							'./src/test/__mocks__/sentry.sveltekit.ts',
							import.meta.url
						).pathname
					},
					environment: 'jsdom',
					include: ['./src/lib/features/templates/templates.test.ts'],
					name: 'dom'
				}
			}
		]
	}
}));
