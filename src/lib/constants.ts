export const LOCALE = 'de-DE';

export const LANGUAGE_CODE = 'de';

/** Price per 1 million tokens in euro cents (used for Stripe amount). */
export const PRICE_PER_MILLION_TOKENS_CENTS = 500;

/** Price per 1 million tokens in euro (used for display). */
export const PRICE_PER_MILLION_TOKENS_EUR = 5;

export const TIMEZONE = 'Europe/Berlin';

export const CONFIG_FILENAME_REGEX = /^berichtgen(\(.*?\))?\.(txt|csv)$/;

export const DEFAULT_MODEL = 'gemini-3.1-flash-lite-preview';

export const MODEL_LOCATION = 'global';

export const WIZARD_PERSISTENCE_VERSION = 1;

export const WIZARD_PERSISTENCE_TTL_MS = 24 * 60 * 60 * 1000;

export const WIZARD_PERSISTENCE_STORE = 'wizard_sessions';

/** Maximum milliseconds a single template JS expression may run before being interrupted. (write_docx.ts) */
export const JS_EXECUTION_TIMEOUT_MS = 5_000;

/**
 * Stable audit-log type key for the user's Vertex AI file-analysis consent.
 * Used in: consent logging/lookup across auth + wizard server flows.
 */
export const VERTEX_AI_CONSENT_TYPE = 'vertex_ai_file_analysis';

/**
 * Stable audit-log type key for the accepted Datenschutzerklärung in auth flows.
 * Used in: pre-login consent logging for Google OAuth and OTP login requests.
 */
export const PRIVACY_POLICY_CONSENT_TYPE = 'privacy_policy';

/**
 * Source key written when Vertex AI consent is granted from the wizard run dialog.
 * Used in: consent audit log entries created from the wizard flow.
 */
export const VERTEX_AI_CONSENT_SOURCE_WIZARD = 'wizard';

/**
 * Source key written when Vertex AI consent is changed from account settings.
 * Used in: consent audit log entries created from the settings flow.
 */
export const VERTEX_AI_CONSENT_SOURCE_SETTINGS = 'settings';

/**
 * Source key written when the Datenschutzerklärung is accepted before Google OAuth login.
 * Used in: pre-login privacy consent audit log entries triggered from the login checkbox.
 */
export const PRIVACY_POLICY_CONSENT_SOURCE_LOGIN_GATE = 'login_gate';

/**
 * Raw auth-user metadata key indicating that the Datenschutzerklaerung was accepted.
 * Used in: `signInWithOtp(...)`, OAuth callback `updateUser(...)`, and `private.sync_profile_from_auth()`.
 */
export const PRIVACY_CONSENT_GRANTED_METADATA_KEY = 'consent_granted';

/**
 * Raw auth-user metadata key storing the Datenschutzerklaerung/app version accepted by the user.
 * Used in: `signInWithOtp(...)`, OAuth callback `updateUser(...)`, and `private.sync_profile_from_auth()`.
 */
export const PRIVACY_CONSENT_VERSION_METADATA_KEY = 'privacy_consent_version';

/** Only TXT files at or below this size are sent inline in the completion request. */
export const INLINE_MAX_BYTES = 400 * 1024; // 400 KB

/** Strict max file size for wizard processing. */
export const GCS_MAX_BYTES = 50 * 1024 * 1024; // 50 MB

/**
 * Max number of templates a single user can persist.
 * Used in: `src/lib/features/templates/api/templates.handlers.ts` (`validateCanCreateTemplate`).
 */
export const TEMPLATE_MAX_COUNT_PER_USER = 3;

/**
 * Max allowed upload size for a template `.docx` in bytes.
 * Used in: `src/lib/features/templates/components/TemplateUpload.svelte` (client pre-check)
 * and mirrored in Supabase bucket migration `supabase/migrations/20250529175914_1.sql`.
 */
export const TEMPLATE_MAX_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Number of non-owner templates loaded per page in template browsing.
 * Used in: `src/lib/features/templates/api/templates.handlers.ts` pagination queries.
 */
export const TEMPLATE_PAGE_SIZE = 30;
