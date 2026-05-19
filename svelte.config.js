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
			$persistence: path.resolve('./src/lib/features/persistence'),
			$auth: path.resolve('./src/lib/features/auth'),
			$parser: path.resolve('./src/lib/features/parser'),
			$wizard: path.resolve('./src/lib/features/wizard'),
			$ui: path.resolve('./src/lib/components/ui'),
			$server: path.resolve('./src/lib/server'),
			$tokens: path.resolve('./src/lib/features/tokens'),
			$settings: path.resolve('./src/lib/features/settings'),
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
