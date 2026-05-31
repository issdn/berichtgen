import type { TestProjectConfiguration } from 'vitest/config';

import { sentrySvelteKit } from '@sentry/sveltekit';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { svelteTesting } from '@testing-library/svelte/vite';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

const unitProject = {
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
} satisfies TestProjectConfiguration;

const domProject = {
	extends: true,
	test: {
		alias: {
			'@sentry/sveltekit': new URL(
				'./src/test/__mocks__/sentry.sveltekit	.ts',
				import.meta.url
			).pathname
		},
		environment: 'jsdom',
		include: ['./src/lib/features/templates/templates.test.ts'],
		name: 'dom'
	}
} satisfies TestProjectConfiguration;

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
		sveltekit(),
		svelteTesting()
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
		projects: [unitProject, domProject]
	}
}));
