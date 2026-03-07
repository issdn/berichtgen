create or replace function delete_template_metadata_when_file_deleted()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Remove the template metadata row where storage_path matches the deleted object's name
  delete from public.template
  where storage_path = OLD.name;

  return OLD;
end;
$$;

drop trigger if exists on_template_file_deletion_delete_metadata on storage.objects;
create trigger on_template_file_deletion_delete_metadata
after delete on storage.objects
for each row
when (OLD.bucket_id = 'templates')
execute function delete_template_metadata_when_file_deleted();

create or replace function create_template_metadata_when_new_file_inserted()
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

drop trigger if exists on_new_file_insert_create_metadata on storage.objects;
-- create trigger on_new_file_insert_create_metadata
-- after insert on storage.objects
-- for each row
-- when (NEW.bucket_id = 'templates')
-- execute function create_template_metadata_when_new_file_inserted();


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
-- create trigger on_template_http
-- after insert on public.template
-- for each row
-- execute function handle_template_insert();