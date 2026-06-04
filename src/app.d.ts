import type { AnyErrorValue } from '$src/lib/errors';
import type { Session, SupabaseClient, User } from '@supabase/supabase-js';

import type { KyselyDatabase, SupabaseDatabase } from './lib/schema';
declare global {
	const __APP_VERSION__: string;

	namespace App {
		// interface Error {}
		interface BerichtgenSettings {
			constantHours: boolean;
			preferredTemplatePath: null | string;
			preferredWizardDownloadType: 'docx' | 'json' | null;
			rewordJSON: boolean;
			tempEmailContainer: null | string;
		}

		// eslint-disable-next-line @typescript-eslint/no-empty-object-type
		interface Error extends Omit<AnyErrorValue, 'httpCode'> {}
		interface Locals {
			safeGetSession: () => Promise<{
				session: null | Session;
				user: null | User;
			}>;
			session: null | Session;
			supabase: SupabaseClient<SupabaseDatabase, 'private'>;
			user: null | User;
		}

		interface PageData {
			flash?: import('$core/types').FlashMessage;
			session: null | Session;
			supabase: SupabaseClient;
			userMetadata?: KyselyDatabase['user_metadata'];
			vertexAiConsentGranted?: boolean;
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
