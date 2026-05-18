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

export const DEFAULT_ANONYM_NAME = 'Anonym';

export const WIZARD_PERSISTENCE_VERSION = 1;

export const WIZARD_PERSISTENCE_TTL_MS = 24 * 60 * 60 * 1000;

export const WIZARD_PERSISTENCE_STORE = 'wizard_sessions';
