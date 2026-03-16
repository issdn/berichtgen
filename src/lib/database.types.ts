export type Json =
	| string
	| number
	| boolean
	| null
	| { [key: string]: Json | undefined }
	| Json[];

export type Database = {
	// Allows to automatically instantiate createClient with right options
	// instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
	__InternalSupabase: {
		PostgrestVersion: '14.1';
	};
	public: {
		Tables: {
			cart: {
				Row: {
					created_at: string | null;
					intent_id: string;
					user_id: string;
					quantity: number;
				};
				Insert: {
					created_at?: string | null;
					intent_id: string;
					user_id: string;
					quantity?: number;
				};
				Update: {
					created_at?: string | null;
					intent_id?: string;
					user_id?: string;
					quantity?: number;
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
			template: {
				Row: {
					created_at: string;
					id: string;
					user_id: string;
					safe_marked_at: string | null;
					storage_path: string;
					thumbnail_path: string | null;
					updated_at: string | null;
				};
				Insert: {
					created_at?: string;
					id?: string;
					user_id: string;
					safe_marked_at?: string | null;
					storage_path: string;
					thumbnail_path?: string | null;
					updated_at?: string | null;
				};
				Update: {
					created_at?: string;
					id?: string;
					user_id?: string;
					safe_marked_at?: string | null;
					storage_path?: string;
					thumbnail_path?: string | null;
					updated_at?: string | null;
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
					status: string;
					template_id: string;
				};
				Insert: {
					created_at?: string;
					id?: string;
					message?: string | null;
					reporter_user_id: string;
					status?: string;
					template_id: string;
				};
				Update: {
					created_at?: string;
					id?: string;
					message?: string | null;
					reporter_user_id?: string;
					status?: string;
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
					user_id: string;
					tokens: number;
				};
				Insert: {
					user_id: string;
					tokens?: number;
				};
				Update: {
					user_id?: string;
					tokens?: number;
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
			add_user_tokens: {
				Args: { amount: number; p_user_id: string };
				Returns: undefined;
			};
			deduct_user_tokens: {
				Args: { p_amount: number; p_user_id: string };
				Returns: boolean;
			};
		};
		Enums: {
			[_ in never]: never;
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<
	keyof Database,
	'public'
>];

export type Tables<
	DefaultSchemaTableNameOrOptions extends
		| keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
				DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
		: never = never
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
			DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
			Row: infer R;
		}
		? R
		: never
	: DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
				DefaultSchema['Views'])
		? (DefaultSchema['Tables'] &
				DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
				Row: infer R;
			}
			? R
			: never
		: never;

export type TablesInsert<
	DefaultSchemaTableNameOrOptions extends
		| keyof DefaultSchema['Tables']
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
		: never = never
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
			Insert: infer I;
		}
		? I
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
		? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
				Insert: infer I;
			}
			? I
			: never
		: never;

export type TablesUpdate<
	DefaultSchemaTableNameOrOptions extends
		| keyof DefaultSchema['Tables']
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
		: never = never
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
			Update: infer U;
		}
		? U
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
		? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
				Update: infer U;
			}
			? U
			: never
		: never;

export type Enums<
	DefaultSchemaEnumNameOrOptions extends
		| keyof DefaultSchema['Enums']
		| { schema: keyof DatabaseWithoutInternals },
	EnumName extends DefaultSchemaEnumNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
		: never = never
> = DefaultSchemaEnumNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
	: DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
		? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
		: never;

export type CompositeTypes<
	PublicCompositeTypeNameOrOptions extends
		| keyof DefaultSchema['CompositeTypes']
		| { schema: keyof DatabaseWithoutInternals },
	CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
		: never = never
> = PublicCompositeTypeNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
	: PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
		? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
		: never;

export const Constants = {
	public: {
		Enums: {}
	}
} as const;
