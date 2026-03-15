-- ============================================================
-- Tables
-- ============================================================

CREATE TABLE user_token_count (
    user_id uuid NOT NULL,
    tokens integer DEFAULT 0 NOT NULL,
    CONSTRAINT user_token_count_user_id_pk PRIMARY KEY(user_id),
    CONSTRAINT user_token_count_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE cascade ON UPDATE no action
);

CREATE TABLE cart (
    user_id uuid  NOT NULL,
    intent_id text NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    created_at timestamp DEFAULT now(),
    CONSTRAINT cart_user_id_pk PRIMARY KEY(user_id),
    CONSTRAINT cart_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE cascade ON UPDATE no action
);

CREATE TABLE template (
    id uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    storage_path text NOT NULL,
    thumbnail_path text,
    safe_marked_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz
);

CREATE INDEX IF NOT EXISTS template_user_id_idx ON template (user_id);

CREATE TABLE user_metadata (
    user_id uuid PRIMARY KEY NOT NULL,
    full_name text,
    ausbildungsberuf text,
    abteilung text,
    CONSTRAINT user_metadata_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE cascade ON UPDATE no action
);

CREATE INDEX IF NOT EXISTS user_metadata_user_id_idx ON user_metadata (user_id);

CREATE TABLE template_report (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id uuid        NOT NULL REFERENCES template(id) ON DELETE CASCADE,
    reporter_id uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message     text,
    status      text        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'false_flag')),
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX template_report_template_id_idx ON template_report (template_id);

-- ============================================================
-- Storage buckets
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'templates',
    'templates',
    true,
    10485760,
    ARRAY['application/vnd.openxmlformats-officedocument.wordprocessingml.document']
);

INSERT INTO storage.buckets (id, name, public)
VALUES ('quarantine', 'quarantine', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Functions
-- ============================================================

CREATE OR REPLACE FUNCTION add_user_tokens(user_id uuid, amount integer)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE user_token_count
    SET tokens = tokens + amount
    WHERE user_id = user_id;
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

        UPDATE template_report
        SET status = 'false_flag'
        WHERE template_id = target_template_id AND status = 'pending';
    END IF;
    RETURN OLD;
EXCEPTION WHEN invalid_text_representation THEN
    RETURN OLD;
END;
$$;

-- ============================================================
-- Triggers
-- ============================================================

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

ALTER TABLE cart ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_token_count ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_report ENABLE ROW LEVEL SECURITY;

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

-- cart
CREATE POLICY "User can select cart"
    ON public.cart FOR UPDATE TO authenticated
    USING ((SELECT auth.uid()) = public.cart.user_id);

-- user_token_count
CREATE POLICY "User can select own user_token_count"
    ON public.user_token_count FOR SELECT TO authenticated
    USING ((SELECT auth.uid()) = public.user_token_count.user_id);

-- template
CREATE POLICY "User can access own word templates"
    ON public.template FOR ALL TO authenticated
    USING ((SELECT auth.uid()) = public.template.user_id);

-- template_report
CREATE POLICY "Authenticated users can view reports"
    ON template_report FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Users can report non-safe templates they dont own"
    ON template_report FOR INSERT TO authenticated
    WITH CHECK (
        reporter_id = auth.uid()
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
