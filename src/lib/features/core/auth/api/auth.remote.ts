import { form, getRequestEvent } from '$app/server';
import {
	PRIVACY_CONSENT_GRANTED_METADATA_KEY,
	PRIVACY_CONSENT_VERSION_METADATA_KEY
} from '$lib/constants';
import { guardedForm } from '$lib/server/remote';
import { redirect } from '@sveltejs/kit';
import { z } from 'zod';

import { createGoogleSignInUrl, signOut } from './auth.handlers';

const signInWithGoogleSchema = z.object({
	[PRIVACY_CONSENT_GRANTED_METADATA_KEY]: z.literal('true'),
	[PRIVACY_CONSENT_VERSION_METADATA_KEY]: z.string().min(1)
});

export const signInWithGoogleForm = form(
	signInWithGoogleSchema,
	async (data) => {
		const {
			locals: { supabase },
			url
		} = getRequestEvent();

		const oauthUrl = await createGoogleSignInUrl({
			consentGranted: data[PRIVACY_CONSENT_GRANTED_METADATA_KEY],
			privacyConsentVersion: data[PRIVACY_CONSENT_VERSION_METADATA_KEY],
			supabase,
			url
		});

		throw redirect(303, oauthUrl);
	}
);

export const signOutForm = guardedForm(async () => {
	const {
		locals: { supabase }
	} = getRequestEvent();

	await signOut({ supabase });

	throw redirect(303, '/');
});
