CREATE SCHEMA IF NOT EXISTS private;
CREATE SCHEMA IF NOT EXISTS extensions;

-- UUIDv7 generator: timestamp-ordered, no extension required (works on PG17+)
CREATE OR REPLACE FUNCTION private.uuidv7() RETURNS uuid AS $$
  SELECT encode(
    set_bit(
      set_bit(
        overlay(
          uuid_send(extensions.gen_random_uuid())
          placing substring(int8send(floor(extract(epoch from clock_timestamp()) * 1000)::bigint) from 3)
          from 1 for 6
        ),
        52, 1
      ),
      53, 1
    ),
    'hex'
  )::uuid;
$$ LANGUAGE sql VOLATILE
SET search_path = pg_catalog;

-- Enable the pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
ALTER EXTENSION pg_trgm SET SCHEMA extensions;

-- Schedule the cron job to run every day at midnight
SELECT cron.schedule(
  'prune-carts',
  '0 0 * * *',
  $$DELETE FROM private.cart WHERE created_at < NOW() - INTERVAL '7 days'$$
);

SELECT cron.schedule(
  'prune-deleted-user-consent-logs',
  '15 0 * * *',
  $$
    DELETE FROM private.consent
    WHERE user_id IS NULL
      AND deleted_user_at IS NOT NULL
      AND deleted_user_at < NOW() - INTERVAL '3 years'
  $$
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
    tokens bigint DEFAULT 5000 NOT NULL
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
CREATE INDEX template_storage_path_trgm_idx ON private.template USING gin (storage_path extensions.gin_trgm_ops);

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

CREATE TABLE private.consent (
    id uuid PRIMARY KEY DEFAULT private.uuidv7(),
    user_id uuid REFERENCES private.profile(id) ON DELETE SET NULL ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED,
    consent_type text NOT NULL CHECK (consent_type IN ('privacy_policy', 'vertex_ai_file_analysis')),
    status text NOT NULL CHECK (status IN ('granted', 'withdrawn')),
    app_version text NOT NULL,
    deleted_user_at timestamptz,
    source text NOT NULL CHECK (source IN ('login_gate', 'settings', 'wizard')),
    user_email text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX consent_user_type_created_desc_idx
    ON private.consent (user_id, consent_type, created_at DESC, id DESC);

CREATE TABLE private.template_report (
    id uuid PRIMARY KEY DEFAULT private.uuidv7(),
    template_id uuid NOT NULL REFERENCES private.template(id) ON DELETE CASCADE ON UPDATE CASCADE,
    reporter_user_id uuid NOT NULL REFERENCES private.profile(id) ON DELETE CASCADE ON UPDATE CASCADE,
    message text,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (template_id, reporter_user_id)
);

CREATE INDEX template_report_template_id_idx ON private.template_report (template_id);

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

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
SELECT
    'private-templates',
    'private-templates',
    false,
    5242880, -- 5MB (mirror of src/lib/constants.ts -> TEMPLATE_MAX_BYTES)
    ARRAY['application/vnd.openxmlformats-officedocument.wordprocessingml.document']
WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'private-templates'
);

CREATE POLICY "Owners can insert into public templates bucket"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'templates'
        AND (storage.foldername(name))[1] = (SELECT auth.jwt()->>'sub')
    );

CREATE POLICY "Owners can read public templates bucket objects via storage API"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'templates'
        AND (storage.foldername(name))[1] = (SELECT auth.jwt()->>'sub')
    );

CREATE POLICY "Owners can update public templates bucket objects"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'templates'
        AND (storage.foldername(name))[1] = (SELECT auth.jwt()->>'sub')
    )
    WITH CHECK (
        bucket_id = 'templates'
        AND (storage.foldername(name))[1] = (SELECT auth.jwt()->>'sub')
    );

CREATE POLICY "Owners can delete public templates bucket objects"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'templates'
        AND (storage.foldername(name))[1] = (SELECT auth.jwt()->>'sub')
    );

CREATE POLICY "Owners can insert into private templates bucket"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'private-templates'
        AND (storage.foldername(name))[1] = (SELECT auth.jwt()->>'sub')
    );

CREATE POLICY "Owners can read private templates bucket objects"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'private-templates'
        AND (storage.foldername(name))[1] = (SELECT auth.jwt()->>'sub')
    );

CREATE POLICY "Owners can update private templates bucket objects"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'private-templates'
        AND (storage.foldername(name))[1] = (SELECT auth.jwt()->>'sub')
    )
    WITH CHECK (
        bucket_id = 'private-templates'
        AND (storage.foldername(name))[1] = (SELECT auth.jwt()->>'sub')
    );

CREATE POLICY "Owners can delete private templates bucket objects"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'private-templates'
        AND (storage.foldername(name))[1] = (SELECT auth.jwt()->>'sub')
    );

CREATE OR REPLACE FUNCTION private.validate_template_storage_object()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private
AS $$
DECLARE
    template_count bigint;
    template_owner uuid;
BEGIN
    IF NEW.bucket_id NOT IN ('templates', 'private-templates') THEN
        RETURN NEW;
    END IF;

    template_owner := ((storage.foldername(NEW.name))[1])::uuid;

    IF template_owner IS NULL THEN
        RAISE EXCEPTION 'Template path must start with the owner UUID.'
            USING ERRCODE = 'P0001';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM private.template t
        WHERE t.storage_path = NEW.name
    ) THEN
        SELECT COUNT(*)
        INTO template_count
        FROM private.template t
        WHERE t.user_id = template_owner;

        IF template_count >= 3 THEN
            RAISE EXCEPTION 'Du kannst maximal 3 Vorlagen hochladen.'
                USING ERRCODE = 'P0001';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.sync_template_from_storage_object()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private
AS $$
DECLARE
    template_owner uuid;
    template_is_public boolean;
BEGIN
    IF NEW.bucket_id NOT IN ('templates', 'private-templates') THEN
        RETURN NEW;
    END IF;

    template_owner := ((storage.foldername(NEW.name))[1])::uuid;
    template_is_public := NEW.bucket_id = 'templates';

    INSERT INTO private.template (
        is_public,
        storage_path,
        updated_at,
        user_id
    )
    VALUES (
        template_is_public,
        NEW.name,
        CASE WHEN TG_OP = 'UPDATE' THEN NOW() ELSE NULL END,
        template_owner
    )
    ON CONFLICT (storage_path) DO UPDATE
    SET
        is_public = EXCLUDED.is_public,
        updated_at = NOW(),
        user_id = EXCLUDED.user_id;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.delete_template_from_storage_object()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private
AS $$
BEGIN
    IF OLD.bucket_id NOT IN ('templates', 'private-templates') THEN
        RETURN OLD;
    END IF;

    DELETE FROM private.template
    WHERE storage_path = OLD.name
      AND is_public = (OLD.bucket_id = 'templates');

    RETURN OLD;
END;
$$;

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
DECLARE
    consent_granted boolean;
    privacy_consent_version text;
    provider text;
BEGIN
    consent_granted := lower(COALESCE(NEW.raw_user_meta_data->>'consent_granted', 'false')) = 'true';
    privacy_consent_version := NULLIF(NEW.raw_user_meta_data->>'privacy_consent_version', '');
    provider := COALESCE(NEW.raw_app_meta_data->>'provider', '');

    IF TG_OP = 'INSERT' THEN
        INSERT INTO private.profile (id, full_name, avatar_url)
        VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
            COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture')
        )
        ON CONFLICT (id) DO NOTHING;

        IF provider = 'email' AND NOT consent_granted THEN
            RAISE EXCEPTION 'Datenschutzeinwilligung fehlt.'
                USING ERRCODE = 'P0001';
        END IF;

        IF provider = 'email' AND privacy_consent_version IS NULL THEN
            RAISE EXCEPTION 'Datenschutzversionsstand fehlt.'
                USING ERRCODE = 'P0001';
        END IF;

        IF provider = 'email' AND consent_granted AND privacy_consent_version IS NOT NULL THEN
            INSERT INTO private.consent (
                app_version,
                consent_type,
                source,
                status,
                user_email,
                user_id
            )
            VALUES (
                privacy_consent_version,
                'privacy_policy',
                'login_gate',
                'granted',
                NEW.email,
                NEW.id
            );
        END IF;
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

CREATE OR REPLACE FUNCTION private.mark_deleted_user_consents()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private
AS $$
BEGIN
    -- Stamp the deletion time before the profile row disappears. The FK on
    -- `consent.user_id` is `ON DELETE SET NULL`, so this timestamp is the
    -- anchor for the "delete 3 years after account deletion" retention job.
    UPDATE private.consent
    SET deleted_user_at = NOW()
    WHERE user_id = OLD.id
      AND deleted_user_at IS NULL;
    RETURN OLD;
END;
$$;

-- ============================================================
-- Triggers
-- ============================================================

CREATE TRIGGER on_auth_user_change_sync_profile
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION private.sync_profile_from_auth();

CREATE TRIGGER on_profile_delete_mark_consents
    -- Run before the FK nulls `consent.user_id`, otherwise the deleted
    -- user's rows could no longer be matched for retention stamping.
    BEFORE DELETE ON private.profile
    FOR EACH ROW EXECUTE FUNCTION private.mark_deleted_user_consents();

CREATE TRIGGER on_template_storage_object_validate
    BEFORE INSERT OR UPDATE ON storage.objects
    FOR EACH ROW EXECUTE FUNCTION private.validate_template_storage_object();

CREATE TRIGGER on_template_storage_object_sync
    AFTER INSERT OR UPDATE ON storage.objects
    FOR EACH ROW EXECUTE FUNCTION private.sync_template_from_storage_object();

CREATE TRIGGER on_template_storage_object_delete
    AFTER DELETE ON storage.objects
    FOR EACH ROW EXECUTE FUNCTION private.delete_template_from_storage_object();

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
GRANT ALL ON private.consent      TO service_role;
GRANT ALL ON private.template_report  TO service_role;
GRANT ALL ON private.purchase         TO service_role;

