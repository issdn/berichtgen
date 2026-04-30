import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import type { AnyErrorValue } from '$src/lib/errors';
import type { KyselyDatabase, SupabaseDatabase } from './lib/schema';
declare global {
	const __APP_VERSION__: string;

	namespace App {
		// interface Error {}
		interface BerichtgenSettings {
			processPhotos: boolean;
			rewordJSON: boolean;
			constantHours: boolean;
			preferredTemplatePath: string | null;
			tempEmailContainer: string | null;
		}

		interface Locals {
			supabase: SupabaseClient<SupabaseDatabase, 'private'>;
			safeGetSession: () => Promise<{
				session: Session | null;
				user: User | null;
			}>;
			session: Session | null;
			user: User | null;
		}
		interface PageData {
			session: Session | null;
			userMetadata?: KyselyDatabase['user_metadata'];
			flash?: import('$core/types').FlashMessage;
		}

		// eslint-disable-next-line @typescript-eslint/no-empty-object-type
		interface Error extends Omit<AnyErrorValue, 'httpCode'> {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
