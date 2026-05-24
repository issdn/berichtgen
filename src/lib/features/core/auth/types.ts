import type { KyselyDatabase } from '$lib/schema';
import type { User } from '@supabase/supabase-js';

export type UserContext = {
	loggedIn: boolean;
	profile: KyselyDatabase['profile'] | null;
	supabase: App.Locals['supabase'];
	user: null | User;
};

export const PaymentStatus = Object.freeze({
	FAILED: 'failed',
	SUCCESS: 'success'
} as const);

export const KaufOperation = Object.freeze({
	CREATE: 'create',
	UPDATE: 'update'
} as const);
