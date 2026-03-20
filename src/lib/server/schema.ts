import type { Generated } from 'kysely';

export interface ProfileTable {
	id: string;
	full_name: string | null;
	avatar_url: string | null;
}

export interface TemplateTable {
	id: Generated<string>;
	user_id: string;
	storage_path: string;
	safe_marked_at: string | null;
	created_at: Generated<string>;
	updated_at: string | null;
}

export interface TemplateReportTable {
	id: Generated<string>;
	template_id: string;
	reporter_user_id: string;
	message: string | null;
	created_at: Generated<string>;
}

export interface UserTokenCountTable {
	user_id: string;
	tokens: Generated<number>;
}

export interface UserMetadataTable {
	user_id: string;
	full_name: string | null;
	ausbildungsberuf: string | null;
	abteilung: string | null;
}

export interface CartTable {
	intent_id: string;
	user_id: string;
	quantity: Generated<number>;
	created_at: Generated<string | null>;
}

export interface KyselyDatabase {
	profile: ProfileTable;
	template: TemplateTable;
	template_report: TemplateReportTable;
	user_token_count: UserTokenCountTable;
	user_metadata: UserMetadataTable;
	cart: CartTable;
}
