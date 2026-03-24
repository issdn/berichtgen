import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import type { APIError, ErrorBody } from '$src/lib/errors';
import type { KyselyDatabase } from './lib/schema';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			supabase: SupabaseClient<KyselyDatabase>;
			safeGetSession: () => Promise<{
				session: Session | null;
				user: User | null;
			}>;
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
