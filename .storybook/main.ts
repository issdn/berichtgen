import type { StorybookConfig } from '@storybook/sveltekit';
import type { Plugin, UserConfig } from 'vite';

function mockRemoteModules(): Plugin {
	const VIRTUAL_PREFIX = '\0storybook-mock:';

	const mocks: [rawAlias: string, pathSuffix: string, source: string][] = [
		[
			'$templates/api/templates.remote',
			'templates/api/templates.remote',
			// Plain JS stubs — no storybook/test globals needed so
			// vite-plugin-sveltekit-remote's pre-transform analysis doesn't choke.
			`const TEMPLATES = [
  { id: 'tpl-1', user_id: 'user-b', storage_path: 'user-b/Jahresbericht_2024.docx',
    safe_marked_at: null, created_at: '2025-01-15T10:00:00Z', updated_at: null,
    is_mine: false, profile: { id: 'user-b', full_name: 'Erika Muster', avatar_url: null },
    template_report: [] },
  { id: 'tpl-2', user_id: 'user-b', storage_path: 'user-b/Wochenbericht_Vorlage.docx',
    safe_marked_at: null, created_at: '2025-02-03T08:30:00Z', updated_at: null,
    is_mine: false, profile: { id: 'user-b', full_name: 'Erika Muster', avatar_url: null },
    template_report: [] },
  { id: 'tpl-3', user_id: 'user-b', storage_path: 'user-b/Azubi_Bericht.docx',
    safe_marked_at: '2025-02-01T00:00:00Z', created_at: '2025-03-10T08:00:00Z',
    updated_at: '2025-03-10T08:00:00Z',
    is_mine: false, profile: { id: 'user-b', full_name: 'Erika Muster', avatar_url: null },
    template_report: [] },
];
function makeQuery(templates) {
  const p = Promise.resolve({ templates, hasMore: false });
  return Object.assign(p, { withOverride: () => ({ updates: () => Promise.resolve() }) });
}
const noop = () => Promise.resolve();
export const getTemplates    = () => makeQuery(TEMPLATES);
export const uploadTemplate  = noop;
export const deleteTemplate  = noop;
export const deleteReport    = noop;
export const reportTemplate  = noop;
export const markTemplateSafe = noop;
`
		]
	];

	function matchKey(norm: string): string | undefined {
		for (const [alias, suffix, source] of mocks) {
			if (norm === alias) return source;
			if (norm.endsWith('/' + suffix) || norm.endsWith('/' + suffix + '.ts')) {
				return source;
			}
		}
		return undefined;
	}

	return {
		enforce: 'pre',
		load(id) {
			if (!id.startsWith(VIRTUAL_PREFIX)) return undefined;
			const key = id.slice(VIRTUAL_PREFIX.length);
			const entry = mocks.find(([alias]) => alias === key);
			return entry ? entry[2] : undefined;
		},

		name: 'storybook:mock-remote-modules',

		resolveId(id) {
			const norm = id.replace(/\\/g, '/').split('?')[0];
			const entry = mocks.find(
				([alias, suffix]) =>
					norm === alias ||
					norm.endsWith('/' + suffix) ||
					norm.endsWith('/' + suffix + '.ts')
			);
			if (entry) return VIRTUAL_PREFIX + entry[0];
			return undefined;
		},

		// Fallback: if resolveId/load didn't fire (e.g. another pre-plugin
		// resolved the file to its real path first), replace the source in
		// the transform step before vite-plugin-sveltekit-remote can process it.
		transform(code, id) {
			const norm = id.replace(/\\/g, '/').split('?')[0];
			const source = matchKey(norm);
			if (source) return { code: source };
			return undefined;
		}
	};
}

const config: StorybookConfig = {
	addons: ['@storybook/addon-svelte-csf', '@storybook/addon-vitest'],
	framework: '@storybook/sveltekit',
	stories: ['../src/**/*.stories.@(js|ts|svelte)'],

	async viteFinal(config) {
		// Flatten and filter the plugin list:
		//  - Remove vite-plugin-sveltekit-remote: it tries to set up HTTP transport
		//    for remote functions, which times out in Storybook's serverless env.
		//    Our mockRemoteModules() stubs replace every *.remote.ts module instead.
		//  - Prepend our plugin so its transform runs before any remaining pre-plugins.
		type AnyPlugin = NonNullable<NonNullable<UserConfig['plugins']>[number]>;
		function flatten(list: NonNullable<UserConfig['plugins']>): Plugin[] {
			return (list as AnyPlugin[]).flatMap((p) =>
				!p ? [] : Array.isArray(p) ? flatten(p) : [p as Plugin]
			);
		}

		const plugins = flatten(config.plugins ?? []).filter(
			(p) => p.name !== 'vite-plugin-sveltekit-remote'
		);

		return { ...config, plugins: [mockRemoteModules(), ...plugins] };
	}
};
export default config;
