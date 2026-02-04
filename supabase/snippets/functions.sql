create or replace function add_user_tokens(user_id uuid, amount integer)
returns void
language plpgsql
as $$
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