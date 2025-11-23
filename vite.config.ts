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
				project: 'javascript-sveltekit'
			}
		}),
		sveltekit()
	],
	test: { include: ['./src/test/**/*'] },
	ssr: {
		noExternal: ['@lucide/svelte']
	},
	optimizeDeps: {
		exclude: ['quickjs-emscripten']
	}
});
