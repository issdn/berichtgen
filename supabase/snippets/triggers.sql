create or replace function handle_template_delete_remove_metadata()
returns trigger
language plpgsql
security definer
as $$
declare
  object_path text;
begin
  object_path := OLD.storage_path;
  if object_path is null then
    return OLD;
  end if;

  -- Remove the metadata row for the object in bucket 'templates'
  delete from storage.objects
  where bucket_id = 'templates'
    and name = object_path;

  return OLD;
end;
$$;

drop trigger if exists on_template_delete_metadata on public.template;
create trigger on_template_delete_metadata
after delete on public.template
for each row
execute function handle_template_delete_remove_metadata();