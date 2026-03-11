import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import type { Database } from '$lib/database.types.ts'; // import generated types
import type { APIError, ErrorBody } from '$src/lib/errors';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			supabase: SupabaseClient<Database, 'public'>;
			safeGetSession: () => Promise<{ session: Session | null; user: User | null }>;
			session: Session | null;
			user: User | null;
		}
		interface PageData {
			session: Session | null;
		}

		// eslint-disable-next-line @typescript-eslint/no-empty-object-type
		interface Error extends Omit<ErrorBody<APIError>, 'httpCode'> {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
