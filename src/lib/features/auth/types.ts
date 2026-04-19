import type { User } from '@supabase/supabase-js';
import type { KyselyDatabase } from '$lib/schema';

export type UserContext = {
	user: User | null;
	profile: KyselyDatabase['profile'] | null;
	loggedIn: boolean;
	supabase: App.Locals['supabase'];
};

export const PaymentStatus = Object.freeze({
	SUCCESS: 'success',
	FAILED: 'failed'
} as const);

export const KaufOperation = Object.freeze({
	UPDATE: 'update',
	CREATE: 'create'
} as const);
