import { ECommonServerError } from '$lib/errors';
import { svelteApiError } from '$server/errors';

import type { PageData } from '../../../../../routes/$types';

export async function createGoogleSignInUrl({
	consentGranted,
	privacyConsentVersion,
	supabase,
	url
}: {
	consentGranted: string;
	privacyConsentVersion: string;
	supabase: PageData['supabase'];
	url: URL;
}) {
	const baseUrl = new URL('/auth/callback', url.origin);
	baseUrl.searchParams.set('next', '/board');
	baseUrl.searchParams.set('consent_granted', consentGranted);
	baseUrl.searchParams.set('privacy_consent_version', privacyConsentVersion);

	const { data: oauthData, error } = await supabase.auth.signInWithOAuth({
		options: {
			redirectTo: baseUrl.toString()
		},
		provider: 'google'
	});
	if (error || !oauthData.url) {
		throw svelteApiError({
			...ECommonServerError.INTERNAL_ERROR,
			cause: error?.message ?? 'Google-OAuth-URL konnte nicht erzeugt werden.'
		});
	}

	return oauthData.url;
}

export async function signOut({
	supabase
}: {
	supabase: {
		auth: {
			signOut: typeof import('@supabase/supabase-js').SupabaseClient.prototype.auth.signOut;
		};
	};
}) {
	const { error } = await supabase.auth.signOut();
	if (error) {
		throw svelteApiError({
			...ECommonServerError.INTERNAL_ERROR,
			cause: error.message
		});
	}
}
