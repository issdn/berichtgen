import { sentrySvelteKit } from '@sentry/sveltekit';
import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	plugins: [
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
	}
});
