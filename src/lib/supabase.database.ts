export type Json =
	| string
	| number
	| boolean
	| null
	| { [key: string]: Json | undefined }
	| Json[];

export type Database = {
	public: {
		Tables: {
			[_ in never]: never;
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			[_ in never]: never;
		};
		Enums: {
			[_ in never]: never;
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
	private: {
		Tables: {
			cart: {
				Row: {
					created_at: string | null;
					intent_id: string;
					quantity: number;
					user_id: string;
				};
				Insert: {
					created_at?: string | null;
					intent_id: string;
					quantity?: number;
					user_id: string;
				};
				Update: {
					created_at?: string | null;
					intent_id?: string;
					quantity?: number;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'cart_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: true;
						referencedRelation: 'profile';
						referencedColumns: ['id'];
					}
				];
			};
			profile: {
				Row: {
					avatar_url: string | null;
					full_name: string | null;
					id: string;
				};
				Insert: {
					avatar_url?: string | null;
					full_name?: string | null;
					id: string;
				};
				Update: {
					avatar_url?: string | null;
					full_name?: string | null;
					id?: string;
				};
				Relationships: [];
			};
			purchase: {
				Row: {
					created_at: string | null;
					id: string;
					quantity: number;
					stripe_event_id: string;
					stripe_intent_id: string;
					tokens_credited: number;
					user_id: string;
				};
				Insert: {
					created_at?: string | null;
					id?: string;
					quantity: number;
					stripe_event_id: string;
					stripe_intent_id: string;
					tokens_credited: number;
					user_id: string;
				};
				Update: {
					created_at?: string | null;
					id?: string;
					quantity?: number;
					stripe_event_id?: string;
					stripe_intent_id?: string;
					tokens_credited?: number;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'purchase_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'profile';
						referencedColumns: ['id'];
					}
				];
			};
			template: {
				Row: {
					created_at: string;
					id: string;
					is_public: boolean;
					safe_marked_at: string | null;
					storage_path: string;
					updated_at: string | null;
					user_id: string;
				};
				Insert: {
					created_at?: string;
					id?: string;
					is_public?: boolean;
					safe_marked_at?: string | null;
					storage_path: string;
					updated_at?: string | null;
					user_id: string;
				};
				Update: {
					created_at?: string;
					id?: string;
					is_public?: boolean;
					safe_marked_at?: string | null;
					storage_path?: string;
					updated_at?: string | null;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'template_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'profile';
						referencedColumns: ['id'];
					}
				];
			};
			template_report: {
				Row: {
					created_at: string;
					id: string;
					message: string | null;
					reporter_user_id: string;
					template_id: string;
				};
				Insert: {
					created_at?: string;
					id?: string;
					message?: string | null;
					reporter_user_id: string;
					template_id: string;
				};
				Update: {
					created_at?: string;
					id?: string;
					message?: string | null;
					reporter_user_id?: string;
					template_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'template_report_reporter_user_id_fkey';
						columns: ['reporter_user_id'];
						isOneToOne: false;
						referencedRelation: 'profile';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'template_report_template_id_fkey';
						columns: ['template_id'];
						isOneToOne: false;
						referencedRelation: 'template';
						referencedColumns: ['id'];
					}
				];
			};
			user_metadata: {
				Row: {
					abteilung: string | null;
					ausbildungsberuf: string | null;
					full_name: string;
					user_id: string;
				};
				Insert: {
					abteilung?: string | null;
					ausbildungsberuf?: string | null;
					full_name: string;
					user_id: string;
				};
				Update: {
					abteilung?: string | null;
					ausbildungsberuf?: string | null;
					full_name?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'user_metadata_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: true;
						referencedRelation: 'profile';
						referencedColumns: ['id'];
					}
				];
			};
			user_token_count: {
				Row: {
					tokens: number;
					user_id: string;
				};
				Insert: {
					tokens?: number;
					user_id: string;
				};
				Update: {
					tokens?: number;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'user_token_count_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: true;
						referencedRelation: 'profile';
						referencedColumns: ['id'];
					}
				];
			};
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			uuidv7: { Args: never; Returns: string };
		};
		Enums: {
			[_ in never]: never;
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
};
