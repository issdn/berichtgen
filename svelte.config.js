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
			$templates: path.resolve('./src/lib/modules/board/templates'),
			$core: path.resolve('./src/lib/modules/core'),
			$auth: path.resolve('./src/lib/modules/auth'),
			$wizard: path.resolve('./src/lib/modules/board/wizard'),
			$board: path.resolve('./src/lib/modules/board'),
			$ui: path.resolve('./src/lib/components/ui')
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
