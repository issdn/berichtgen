<script lang="ts">
	import Dropzone from '$src/lib/components/Dropzone.svelte';
	import { FileTypes } from '$src/lib/enums';
	import { extractFilesSimple } from '$src/lib/parse/file_scan';
	import { toast } from 'svelte-sonner';
	import { uploadTemplate, getTemplates } from './templates.remote';
	import { toErrorBody } from '../errors';
	import type { UserContext } from '../types';
	import { getContext } from 'svelte';

	type TemplateItem = Awaited<
		ReturnType<typeof getTemplates>
	>['templates'][number];

	const { profile, user } = getContext<UserContext>('user')();

	const {
		query
	}: {
		query: ReturnType<typeof getTemplates>;
	} = $props();

	function createTemplate(file: File) {
		return {
			id: 'temp-id',
			storage_path: file.name,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			safe_marked_at: null,
			thumbnail_path: null,
			user_id: user!.id,
			profile: {
				id: user!.id,
				full_name: profile?.full_name || 'Anonym',
				avatar_url: profile?.avatar_url || null
			},
			template_report: [] as TemplateItem['template_report']
		};
	}

	let isPending = $state(false);

	async function handleFiles(input: FileList | DataTransferItemList) {
		const files = extractFilesSimple(input);
		const firstFile = files[0];
		if (!firstFile) return;

		if (firstFile.type !== FileTypes.DOCX) {
			toast.error('Nur .docx Dateien sind erlaubt.');
			return;
		}

		if (firstFile.size > 10 * 1024 * 1024) {
			toast.error('Die Datei darf maximal 10MB groß sein.');
			return;
		}

		isPending = true;
		try {
			const data = new Uint8Array(await firstFile.arrayBuffer());
			await uploadTemplate({
				name: firstFile.name,
				type: firstFile.type,
				data
			}).updates(
				query.withOverride(({ templates, hasMore }) => ({
					templates: [createTemplate(firstFile), ...templates],
					hasMore
				}))
			);
			toast.success('Datei erfolgreich hochgeladen.');
		} catch (e) {
			toast.error('Fehler beim Hochladen der Datei.', {
				description: toErrorBody(e).cause
			});
		} finally {
			isPending = false;
		}
	}
</script>

<div class="h-full w-full">
	<Dropzone disabled={isPending} {handleFiles} />
</div>
