import { sentrySvelteKit } from "@sentry/sveltekit";
import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [sentrySvelteKit({
        sourceMapsUploadOptions: {
            org: "bielski",
            project: "javascript-sveltekit"
        }
    }), sveltekit()],
	test: { include: ['./src/test/**/*'] },
	ssr: {
		noExternal: ['lucide-svelte']
	}
});