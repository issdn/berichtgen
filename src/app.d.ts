import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import type { AnyErrorValue } from '$src/lib/errors';
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
			flash?: import('$core/types').FlashMessage;
		}

		// eslint-disable-next-line @typescript-eslint/no-empty-object-type
		interface Error extends Omit<AnyErrorValue, 'httpCode'> {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
