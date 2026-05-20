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
			$routes: path.resolve('./src/routes'),
			$templates: path.resolve('./src/lib/features/templates'),
			$core: path.resolve('./src/lib/features/core'),
			$wizard: path.resolve('./src/lib/features/wizard'),
			$tokens: path.resolve('./src/lib/features/tokens'),
			$ui: path.resolve('./src/lib/components/ui'),
			$server: path.resolve('./src/lib/server')
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
