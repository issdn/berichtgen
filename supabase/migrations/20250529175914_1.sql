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
    tokens integer DEFAULT 0 NOT NULL
);

CREATE TABLE cart (
    user_id uuid PRIMARY KEY REFERENCES profile(id) ON DELETE CASCADE ON UPDATE CASCADE,
    intent_id text NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    created_at timestamp DEFAULT now()
);

CREATE TABLE template (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES profile(id) ON DELETE CASCADE ON UPDATE CASCADE,
    storage_path text NOT NULL,
    thumbnail_path text,
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
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id uuid NOT NULL REFERENCES template(id) ON DELETE CASCADE ON UPDATE CASCADE,
    reporter_user_id uuid NOT NULL REFERENCES profile(id) ON DELETE CASCADE ON UPDATE CASCADE ,
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

CREATE FUNCTION get_templates(
  limit_val int,
  search_val text DEFAULT '',
  only_unreported boolean DEFAULT false,
  only_mine boolean DEFAULT false
)
RETURNS SETOF template AS $$
  SELECT t.*
  FROM template t
  LEFT JOIN template_report tr ON tr.template_id = t.id
  WHERE
    (search_val = '' OR t.storage_path ILIKE '%/%' || search_val || '%.docx')
    AND (only_mine = false OR t.profile_id = auth.uid())
  GROUP BY t.id
  HAVING (only_unreported = false OR COUNT(tr.id) = 0)
  ORDER BY t.created_at DESC, t.updated_at DESC
  LIMIT limit_val;
$$ LANGUAGE sql STABLE SECURITY INVOKER;


CREATE OR REPLACE FUNCTION add_user_tokens(p_user_id uuid, amount integer)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE user_token_count
    SET tokens = tokens + amount
    WHERE user_id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION deduct_user_tokens(p_user_id uuid, p_amount integer)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
    current_tokens int;
BEGIN
    SELECT tokens INTO current_tokens
    FROM user_token_count
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF current_tokens < p_amount THEN
        RETURN false;
    END IF;

    UPDATE user_token_count
    SET tokens = current_tokens - p_amount
    WHERE user_id = p_user_id;

    RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION delete_template_metadata_when_file_deleted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.template
    WHERE storage_path = OLD.name;
    RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION create_template_metadata_when_new_file_inserted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_template_id uuid;
BEGIN
    INSERT INTO template (storage_path, user_id)
    VALUES (NEW.name, NEW.owner)
    RETURNING id INTO new_template_id;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION handle_template_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    secret text;
    hmac_sig text;
BEGIN
    secret := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'thumbnail_api_secret');
    IF secret IS NULL THEN
        RAISE EXCEPTION 'Missing secret: vault.decrypted_secrets.thumbnail_api_secret is null or not found';
    END IF;

    hmac_sig := encode(hmac(NEW.id::text::bytea, secret::bytea, 'sha256'), 'base64');

    PERFORM net.http_post(
        url := 'http://192.168.0.150:8123/v1/thumbnail'::text,
        body := '{}'::jsonb,
        params := jsonb_build_object('uuid', NEW.id),
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-supabase-signature', hmac_sig
        ),
        timeout_milliseconds := 5000
    );

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION mark_template_safe_on_quarantine_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_template_id uuid;
BEGIN
    IF OLD.bucket_id = 'quarantine' THEN
        target_template_id := OLD.name::uuid;

        UPDATE template
        SET safe_marked_at = now()
        WHERE id = target_template_id;

        DELETE FROM template_report
        WHERE template_id = target_template_id;
    END IF;
    RETURN OLD;
EXCEPTION WHEN invalid_text_representation THEN
    RETURN OLD;
END;
$$;

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

CREATE TRIGGER on_template_file_deletion_delete_metadata
    AFTER DELETE ON storage.objects
    FOR EACH ROW
    WHEN (OLD.bucket_id = 'templates')
    EXECUTE FUNCTION delete_template_metadata_when_file_deleted();

-- on_new_file_insert_create_metadata: disabled (metadata created client-side)
-- on_template_http: disabled (thumbnail API not active)

CREATE TRIGGER on_quarantine_delete_mark_template_safe
    AFTER DELETE ON storage.objects
    FOR EACH ROW
    EXECUTE FUNCTION mark_template_safe_on_quarantine_delete();

CREATE TRIGGER on_new_file_insert_create_metadata
    AFTER INSERT ON storage.objects
    FOR each ROW
    WHEN (NEW.bucket_id = 'templates')
    EXECUTE FUNCTION create_template_metadata_when_new_file_inserted();

-- ============================================================
-- RLS, grants, policies
-- ============================================================

ALTER TABLE profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_token_count ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE template ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_report ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON profile TO authenticated;
GRANT ALL ON profile TO service_role;

CREATE POLICY "Authenticated users can view all profiles"
    ON profile FOR SELECT TO authenticated
    USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.cart TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_token_count TO service_role;
GRANT SELECT (quantity) ON TABLE public.cart TO authenticated;
GRANT SELECT ON TABLE public.user_token_count TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.template TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.template TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_metadata TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_metadata TO authenticated;

GRANT SELECT, INSERT ON TABLE public.template_report TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.template_report TO service_role;

CREATE POLICY "Users can delete own reports"
    ON template_report FOR DELETE TO authenticated
    USING (reporter_user_id = auth.uid());

-- cart
CREATE POLICY "User can select cart"
    ON public.cart FOR ALL TO authenticated
    USING (user_id = auth.uid());

-- user_token_count
CREATE POLICY "User can select own user_token_count"
    ON public.user_token_count FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- template
CREATE POLICY "Authenticated users can view all templates"
    ON public.template FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Users can manage own templates"
    ON public.template FOR ALL TO authenticated
    USING (user_id = auth.uid());

-- user_metadata
CREATE POLICY "Authenticated users can view all user metadata"
    ON public.user_metadata FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Users can manage own user_metadata"
    ON public.user_metadata FOR ALL TO authenticated
    USING (user_id = auth.uid());

-- template_report
CREATE POLICY "Authenticated users can view reports"
    ON template_report FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Users can report non-safe templates they dont own"
    ON template_report FOR INSERT TO authenticated
    WITH CHECK (
        reporter_user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM template
            WHERE id = template_id
              AND user_id != auth.uid()
              AND safe_marked_at IS NULL
        )
    );

-- storage.objects
CREATE POLICY "Only authenticated can select data"
    ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'templates');

CREATE POLICY "Only authenticated can upload data"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'templates');

CREATE POLICY "Only owners of file can delete it"
    ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'templates' AND auth.uid() = owner);

CREATE POLICY "Only owners of file can update it"
    ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'templates' AND auth.uid() = owner);
