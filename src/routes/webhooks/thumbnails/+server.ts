import * as Sentry from '@sentry/sveltekit';
import { PRIVATE_X_SUPABASE_SECRET } from '$env/static/private';
import crypto from 'crypto';
import path from 'path';

function createHMAC(secret: string, payload: string) {
	const hmac = crypto.createHmac('sha256', secret);
	hmac.update(payload);
	return hmac.digest('base64');
}

function verifySignature(secret: string, payload: string, signature: string) {
	const digest = createHMAC(secret, payload);
	const isEqual =
		digest.length === signature.length &&
		crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
	return isEqual;
}

export async function POST({ request, locals: { supabase } }) {
	const authHeader = request.headers.get('x-supabase-signature');
	const body = await request.json();

	const isEqual = verifySignature(
		PRIVATE_X_SUPABASE_SECRET,
		JSON.stringify(body),
		authHeader ?? ''
	);

	if (!authHeader || !PRIVATE_X_SUPABASE_SECRET || !isEqual) {
		return new Response('Unauthorized', { status: 401 });
	}

	if (body.record == null) {
		return new Response('No record in body', { status: 400 });
	}

	const { error: insertMetadataError } = await supabase.from('template').insert({
		storage_path: body.record.path_tokens.join('/'),
		name: body.record.name,
		user_id: body.record.owner_id
	});

	if (insertMetadataError) {
		Sentry.captureMessage(`Error inserting template metadata: ${insertMetadataError.message}`);
		return new Response('Error inserting template metadata', { status: 500 });
	}

	const payload = { path: path.join(...body.record.path_tokens), bucket: body.record.bucket_id };

	const thumbnailResult = await fetch('https://thumbnail.berichtgen.de/thumbnail/v1', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'x-supabase-auth': `Bearer ${''}`
		},
		body: JSON.stringify(payload)
	});

	if (!thumbnailResult.ok) {
		const errorText = await thumbnailResult.text();
		Sentry.captureMessage(`Error generating thumbnail: ${thumbnailResult.status} - ${errorText}`);
		return new Response('Error generating thumbnail', { status: 500 });
	}

	return new Response('OK', { status: 200 });
}
