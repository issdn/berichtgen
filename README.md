# Secrets
|Key|Desc|
|-|-|
|thumbnail_api_secret|Vault value for hashing inside supabase's trigger. This must be set in vault and in the python thumbnail api.|

# Supabase
```sql
create or replace function add_user_tokens(user_id uuid, amount integer)
returns void
language plpgsql
as $$s
begin
  update "userTokenCount"
  set "tokens" = tokens + amount
  where "userId" = user_id;
end;
$$;

create or replace function deduct_user_tokens(user_id uuid, amount integer)
returns boolean
language plpgsql
as $$
declare
  current_tokens int;
begin
  -- Lock the user's row to prevent concurrent changes
  select tokens into current_tokens
  from "userTokenCount"
  where "userId" = user_id
  for update;

  -- Check if enough tokens are available
  if current_tokens < amount then
    return false;
  end if;

  -- Deduct the tokens
  update "userTokenCount"
  set "tokens" = current_tokens - amount
  where "userId" = user_id;

  return true;
end;
$$;

-- Enable RLS on all tables
ALTER TABLE "cart" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "llmProvider" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "userLLMProvider" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "userTokenCount" ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public".cart to service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."llmProvider" to service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."userLLMProvider" to service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."userTokenCount" to service_role;

GRANT SELECT ("quantity") ON TABLE "public".cart to authenticated;
GRANT SELECT ON TABLE "public"."llmProvider" to authenticated;
GRANT SELECT ON TABLE "public"."userTokenCount" to authenticated;
GRANT UPDATE, INSERT, SELECT, DELETE ON TABLE "public"."userLLMProvider" to authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."template" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."template" TO authenticated;

DROP POLICY IF EXISTS "User can select cart" ON "public"."cart";
CREATE POLICY "User can select cart"
ON "public"."cart"
FOR UPDATE
TO authenticated
USING ((select auth.uid()) = "public"."cart"."userId");

DROP POLICY IF EXISTS "User can select llm provider" ON "public"."llmProvider";
CREATE POLICY "User can select llm provider"
ON "public"."llmProvider"
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "User can fully modify own userLLMProvider" ON "public"."userLLMProvider";
CREATE POLICY "User can fully modify own userLLMProvider"
ON "public"."userLLMProvider"
FOR ALL
TO authenticated
USING (
  (select auth.uid()) = "public"."userLLMProvider"."userId"
)

DROP POLICY IF EXISTS "User can select own userTokenCount" ON "public"."userTokenCount";
CREATE POLICY "User can select own userTokenCount"
ON "public"."userTokenCount"
FOR SELECT
TO authenticated
USING (
  (select auth.uid()) = "public"."userTokenCount"."userId"
);

```

Templates
```sql
DROP POLICY IF EXISTS "User can access own word templates" ON "public"."template";
CREATE POLICY "User can access own word templates"
ON "public"."template"
FOR ALL
TO authenticated
USING (
  (select auth.uid()) = "public"."template"."userId"
);

DROP POLICY IF EXISTS "Only authenticated can select any data" ON storage.objects;
CREATE POLICY "Only authenticated can select data"
ON storage.objects FOR SELECT 
USING (
    bucket_id = 'templates'
    AND (select auth.role()) = 'authenticated'
);

DROP POLICY IF EXISTS "Only authenticated can upload data" ON storage.objects;
CREATE POLICY "Only authenticated can upload data"
ON storage.objects FOR INSERT 
WITH CHECK (
    bucket_id = 'templates'
    AND (select auth.role()) = 'authenticated'
);

DROP POLICY IF EXISTS "Only owners of file can delete it" ON storage.objects;
CREATE POLICY "Only owners of file can delete it"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'templates'
  AND auth.uid() = owner
);

DROP POLICY IF EXISTS "Only owners of file can update it" ON storage.objects;
CREATE POLICY "Only owners of file can update it"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'templates'
  AND auth.uid() = owner
);
```

Realtime
```sql
-- ONE TIME ONLY
-- ALTER PUBLICATION supabase_realtime ADD TABLE "public"."userTokenCount";
```

Webhooks
```sql
create or replace function handle_storage_insert()
returns trigger
language plpgsql
security definer
as $$
declare
  new_template_id uuid;
begin
  -- Insert minimal metadata and return the new template id
  insert into template (storage_path, user_id)
  values (new.name, new.owner)
  returning id into new_template_id;

  -- We intentionally do not call external services here; return quickly.
  return new;
end;
$$;

drop trigger if exists on_template_uploaded on storage.objects;
create trigger on_template_uploaded
after insert on storage.objects
for each row
when (NEW.bucket_id = 'templates')
execute function handle_storage_insert();


create or replace function handle_template_insert()
returns trigger
language plpgsql
security definer
as $$
declare
  secret text;
  hmac_sig text;
begin
  secret := (select decrypted_secret from vault.decrypted_secrets where name = 'thumbnail_api_secret');
  if secret is null then
    raise exception 'Missing secret: vault.decrypted_secrets.thumbnail_api_secret is null or not found';
  end if;

  hmac_sig := encode(hmac(NEW.id::text::bytea, secret::bytea, 'sha256'), 'base64');

  perform(
    net.http_post(
    url := 'http://192.168.0.150:8123/v1/thumbnail'::text,
    body := '{}'::jsonb,
    params := jsonb_build_object('uuid', NEW.id),
    headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-supabase-signature', hmac_sig
    ),
    timeout_milliseconds  := 5000
)
  );
  
  return NEW;
end;
$$;

drop trigger if exists on_template_http on public.template;
create trigger on_template_http
after insert on public.template
for each row
execute function handle_template_insert();
```

Prune carts
Supabase Integrations -> Cron 0 0 * * 1
```sql
DELETE FROM cart WHERE "createdAt" < NOW() - INTERVAL '7 days';
```

### types
```ps1
supabase gen types typescript --project-id odbyqfknheshvujhabpp > src\lib\database.types.ts
```

### stripe

```ps1
stripe listen --forward-to localhost:5173/webhooks/stripe
```