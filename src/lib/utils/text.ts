import type { User } from '@supabase/supabase-js';
import type { KyselyDatabase } from '../schema';

export function getUserDisplayName(
	profile: KyselyDatabase['profile'] | null,
	user?: User | null
) {
	const fullName =
		profile?.full_name ??
		(user?.user_metadata.name as string | undefined) ??
		'Anonym';

	const shortName = fullName
		.split(' ')
		.map((s) => s[0])
		.join('');

	return { fullName, shortName };
}
