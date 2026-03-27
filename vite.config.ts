import { sentrySvelteKit } from '@sentry/sveltekit';
import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
	plugins: [
		nodePolyfills({
			include: ['buffer', 'util']
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
	test: {
		include: ['./src/test/**/*.test.ts'],
		alias: {
			canvas: new URL('./src/test/__mocks__/canvas.ts', import.meta.url)
				.pathname
		}
	},
	ssr: {
		noExternal: ['@lucide/svelte']
	},
	optimizeDeps: {
		exclude: ['quickjs-emscripten']
	}
});
