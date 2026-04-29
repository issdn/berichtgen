-- UUIDv7 generator: timestamp-ordered, no extension required (works on PG17+)
CREATE OR REPLACE FUNCTION uuidv7() RETURNS uuid AS $$
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

-- Schedule the cron job to run every day at midnight
SELECT cron.schedule(
  'prune-carts',
  '0 0 * * *',
  $$DELETE FROM cart WHERE "createdAt" < NOW() - INTERVAL '7 days'$$
);

-- ============================================================
-- Tables
-- ============================================================

CREATE TABLE profile (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    full_name text,
    avatar_url text
);

CREATE TABLE user_token_count (
    user_id uuid PRIMARY KEY REFERENCES profile(id) ON DELETE CASCADE ON UPDATE CASCADE,
    tokens bigint DEFAULT 0 NOT NULL
);

CREATE TABLE cart (
    user_id uuid PRIMARY KEY REFERENCES profile(id) ON DELETE CASCADE ON UPDATE CASCADE,
    intent_id text NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    created_at timestamp DEFAULT now()
);

CREATE TABLE purchase (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_event_id text UNIQUE NOT NULL,
    stripe_intent_id text NOT NULL,
    user_id         uuid NOT NULL REFERENCES profile(id) ON DELETE CASCADE ON UPDATE CASCADE,
    quantity        integer NOT NULL,
    tokens_credited bigint NOT NULL,
    created_at      timestamptz DEFAULT now()
);

CREATE TABLE template (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    user_id uuid NOT NULL REFERENCES profile(id) ON DELETE CASCADE ON UPDATE CASCADE,
    storage_path text NOT NULL,
    is_public boolean NOT NULL DEFAULT false,
    safe_marked_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz
);

CREATE INDEX IF NOT EXISTS template_user_id_idx ON template (user_id);

CREATE TABLE user_metadata (
    user_id uuid PRIMARY KEY REFERENCES profile(id) ON DELETE CASCADE ON UPDATE CASCADE,
    full_name text NOT NULL,
    ausbildungsberuf text,
    abteilung text
);

CREATE TABLE template_report (
    id uuid PRIMARY KEY DEFAULT uuidv7(),
    template_id uuid NOT NULL REFERENCES template(id) ON DELETE CASCADE ON UPDATE CASCADE,
    reporter_user_id uuid NOT NULL REFERENCES profile(id) ON DELETE CASCADE ON UPDATE CASCADE,
    message text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX template_report_template_id_idx ON template_report (template_id);

-- ============================================================
-- Storage buckets
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
SELECT
    'templates',
    'templates',
    true,
    10485760,
    ARRAY['application/vnd.openxmlformats-officedocument.wordprocessingml.document']
WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'templates'
);

INSERT INTO storage.buckets (id, name, public)
VALUES ('quarantine', 'quarantine', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Functions
-- ============================================================

-- Keeps profile in sync with auth.users metadata
CREATE OR REPLACE FUNCTION public.sync_profile_from_auth()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO profile (id, full_name, avatar_url)
        VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
            COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture')
        )
        ON CONFLICT (id) DO NOTHING;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE profile SET
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
    FOR EACH ROW EXECUTE FUNCTION public.sync_profile_from_auth();

-- ============================================================
-- RLS — tables are locked down; only service_role has access.
-- service_role bypasses RLS entirely.
-- ============================================================

GRANT ALL ON public.profile          TO service_role;
GRANT ALL ON public.cart             TO service_role;
GRANT ALL ON public.user_token_count TO service_role;
GRANT ALL ON public.template         TO service_role;
GRANT ALL ON public.user_metadata    TO service_role;
GRANT ALL ON public.template_report  TO service_role;
GRANT ALL ON public.purchase         TO service_role;
