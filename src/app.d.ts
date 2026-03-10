import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import type { Database } from '$lib/database.types.ts'; // import generated types
import type { ***REMOVED***ErrorType } from '$src/lib/types.js';
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
		interface Error {
			message: string;
			type?: ***REMOVED***ErrorType | CompletionExceptionType | CommonServerErrorTypes;
		}
		// interface PageState {}
		// interface Platform {}
	}
}
export {};
