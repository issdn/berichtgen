# Supabase
```sql
create or replace function deduct_user_tokens(user_id uuid, amount int)
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

-- Allow updates by the owner of the row
create policy "Allow user to update their own tokens"
on "userTokenCount"
for update using ("userId" = auth.uid());

create policy "Allow user to read their own token count"
on "userTokenCount"
for select using ("userId" = auth.uid());

-- Enable RLS
alter table "userTokenCount" enable row level security;
```

### types
```
supabase gen types typescript --project-id odbyqfknheshvujhabpp > database.types.ts
```

# stripe

```
stripe listen --forward-to localhost:5173/webhooks/stripe
```