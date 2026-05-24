import adapter from '@sveltejs/adapter-vercel';
import path from 'path';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		experimental: {
			async: true
		}
	},
	kit: {
		adapter: adapter({ regions: ['fra1'] }),
		alias: {
			$core: path.resolve('./src/lib/features/core'),
			$routes: path.resolve('./src/routes'),
			$server: path.resolve('./src/lib/server'),
			$templates: path.resolve('./src/lib/features/templates'),
			$tokens: path.resolve('./src/lib/features/tokens'),
			$ui: path.resolve('./src/lib/components/ui'),
			$wizard: path.resolve('./src/lib/features/wizard')
		},
		experimental: {
			remoteFunctions: true
		}
	},
	vitePlugin: {
		dynamicCompileOptions: ({ filename }) =>
			filename.includes('node_modules') ? undefined : { runes: true }
	}
};

export default config;
