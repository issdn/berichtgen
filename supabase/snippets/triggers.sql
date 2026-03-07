create or replace function handle_storage_delete_remove_template_metadata()
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

drop trigger if exists on_storage_delete_template_metadata on storage.objects;
create trigger on_storage_delete_template_metadata
after delete on storage.objects
for each row
when (OLD.bucket_id = 'templates')
execute function handle_storage_delete_remove_template_metadata();