CREATE SCHEMA IF NOT EXISTS private;

-- UUIDv7 generator: timestamp-ordered, no extension required (works on PG17+)
CREATE OR REPLACE FUNCTION private.uuidv7() RETURNS uuid AS $$
  SELECT encode(
    set_bit(
      set_bit(
        overlay(
          uuid_send(gen_random_uuid())
          placing substring(int8send(floor(extract(epoch from clock_timestamp()) * 1000)::bigint) from 3)
          from 1 for 6
        ),
        52, 1
      ),
      53, 1
    ),
    'hex'
  )::uuid;
$$ LANGUAGE sql VOLATILE;

-- Enable the pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Schedule the cron job to run every day at midnight
SELECT cron.schedule(
  'prune-carts',
  '0 0 * * *',
  $$DELETE FROM private.cart WHERE created_at < NOW() - INTERVAL '7 days'$$
);

-- ============================================================
-- Tables
-- ============================================================

CREATE TABLE private.profile (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    full_name text,
    avatar_url text
);

CREATE TABLE private.user_token_count (
    user_id uuid PRIMARY KEY REFERENCES private.profile(id) ON DELETE CASCADE ON UPDATE CASCADE,
    tokens bigint DEFAULT 0 NOT NULL
);

CREATE TABLE private.cart (
    user_id uuid PRIMARY KEY REFERENCES private.profile(id) ON DELETE CASCADE ON UPDATE CASCADE,
    intent_id text UNIQUE NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    created_at timestamp DEFAULT now()
);

CREATE INDEX cart_created_at_idx ON private.cart (created_at);

CREATE TABLE private.purchase (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_event_id text UNIQUE NOT NULL,
    stripe_intent_id text NOT NULL,
    user_id         uuid NOT NULL REFERENCES private.profile(id) ON DELETE CASCADE ON UPDATE CASCADE,
    quantity        integer NOT NULL,
    tokens_credited bigint NOT NULL,
    created_at      timestamptz DEFAULT now()
);

CREATE TABLE private.template (
    id uuid PRIMARY KEY DEFAULT private.uuidv7(),
    user_id uuid NOT NULL REFERENCES private.profile(id) ON DELETE CASCADE ON UPDATE CASCADE,
    storage_path text UNIQUE NOT NULL,
    is_public boolean NOT NULL DEFAULT false,
    safe_marked_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz
);

CREATE INDEX IF NOT EXISTS template_user_id_idx ON private.template (user_id);
CREATE INDEX template_public_id_desc_idx ON private.template (is_public, id DESC);
CREATE INDEX template_storage_path_trgm_idx ON private.template USING gin (storage_path gin_trgm_ops);

CREATE TABLE private.user_metadata (
    user_id uuid PRIMARY KEY REFERENCES private.profile(id) ON DELETE CASCADE ON UPDATE CASCADE,
    full_name text,
    ausbildungsberuf text,
    abteilung text
);

CREATE TABLE private.user_feedback (
    id uuid PRIMARY KEY DEFAULT private.uuidv7(),
    user_id uuid NOT NULL REFERENCES private.profile(id) ON DELETE CASCADE ON UPDATE CASCADE,
    message text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX user_feedback_user_id_idx ON private.user_feedback (user_id);

CREATE TABLE private.template_report (
    id uuid PRIMARY KEY DEFAULT private.uuidv7(),
    template_id uuid NOT NULL REFERENCES private.template(id) ON DELETE CASCADE ON UPDATE CASCADE,
    reporter_user_id uuid NOT NULL REFERENCES private.profile(id) ON DELETE CASCADE ON UPDATE CASCADE,
    message text,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (template_id, reporter_user_id)
);

CREATE INDEX template_report_template_id_idx ON private.template_report (template_id);
CREATE UNIQUE INDEX template_report_template_reporter_uidx ON private.template_report (template_id, reporter_user_id);

-- ============================================================
-- Storage buckets
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
SELECT
    'templates',
    'templates',
    true,
    5242880, -- 5MB (mirror of src/lib/constants.ts -> TEMPLATE_MAX_BYTES)
    ARRAY['application/vnd.openxmlformats-officedocument.wordprocessingml.document']
WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'templates'
);

-- ============================================================
-- Functions
-- ============================================================

-- Keeps profile in sync with auth.users metadata
CREATE OR REPLACE FUNCTION private.sync_profile_from_auth()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO private.profile (id, full_name, avatar_url)
        VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
            COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture')
        )
        ON CONFLICT (id) DO NOTHING;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE private.profile SET
            full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
            avatar_url = COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture')
        WHERE id = NEW.id;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$;

-- ============================================================
-- Triggers
-- ============================================================

CREATE TRIGGER on_auth_user_change_sync_profile
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION private.sync_profile_from_auth();

-- ============================================================
-- RLS — tables are locked down; only service_role has access.
-- service_role bypasses RLS entirely.
-- ============================================================

GRANT USAGE ON SCHEMA private TO service_role;
GRANT ALL ON private.profile          TO service_role;
GRANT ALL ON private.cart             TO service_role;
GRANT ALL ON private.user_token_count TO service_role;
GRANT ALL ON private.template         TO service_role;
GRANT ALL ON private.user_metadata    TO service_role;
GRANT ALL ON private.user_feedback    TO service_role;
GRANT ALL ON private.template_report  TO service_role;
GRANT ALL ON private.purchase         TO service_role;
