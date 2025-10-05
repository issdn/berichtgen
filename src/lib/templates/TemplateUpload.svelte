<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import Dropzone from '$src/lib/components/Dropzone.svelte';
	import { buttonVariants } from '$src/lib/components/ui/button';
	import { FileTypes } from '$src/lib/enums';
	import { extractFilesSimple } from '$src/lib/parse/file_scan';
	import { FileCode } from '@lucide/svelte';
	import type { SupabaseClient, User } from '@supabase/supabase-js';
	import { createMutation, createQuery } from '@tanstack/svelte-query';
	import { toast } from 'svelte-sonner';

	const { user, supabase }: { user: User; supabase: SupabaseClient } = $props();

	const upload = createMutation(() => ({
		mutationKey: ['template-upload'],
		mutationFn: (file: File) => uploadTemplates(file)
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
		const arrayBuffer = await file.arrayBuffer();
		const fileBytes = new Uint8Array(arrayBuffer);

		const { error } = await supabase.from('template').insert([
			{
				userId: user.id,
				name: file.name,
				file: fileBytes,
				username: user.user_metadata?.name || 'Unbekannt'
			}
		]);

		if (error) {
			toast.error('Fehler beim Hochladen der Datei.', { description: error.message });
		} else {
			toast.success('Datei erfolgreich hochgeladen.');
		}
	}
</script>

<div class="h-full w-full">
	<Dropzone disabled={upload.isPending} {handleFiles} />
</div>
