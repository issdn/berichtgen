<script lang="ts">
	import Dropzone from '$src/lib/components/Dropzone.svelte';
	import { FileTypes } from '$src/lib/enums';
	import { extractFilesSimple } from '$src/lib/parse/file_scan';
	import type { SupabaseClient, User } from '@supabase/supabase-js';
	import { createMutation } from '@tanstack/svelte-query';
	import { toast } from 'svelte-sonner';

	const { user, supabase }: { user: User; supabase: SupabaseClient } = $props();

	const upload = createMutation(() => ({
		mutationFn: (file: File) => uploadTemplates(file),
		onSuccess(data, variables, onMutateResult, context) {
			toast.success('Datei erfolgreich hochgeladen.');
			context.client.refetchQueries({ queryKey: ['template'] });
		},
		onError(error) {
			toast.error('Fehler beim Hochladen der Datei.', { description: error.message });
		},
	}));

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

		upload.mutate(firstFile);
	}

	async function uploadTemplates(file: File) {
		const { error } = await supabase.storage
			.from('templates')
			.upload(`${user.id}/${file.name}`, file, {
				contentType: file.type
			});

			if(error) {
				throw error;
			}
	}
</script>

<div class="h-full w-full">
	<Dropzone disabled={upload.isPending} {handleFiles} />
</div>
