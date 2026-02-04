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