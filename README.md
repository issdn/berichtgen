# Supabase
```sql
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

-- Enable RLS on all tables
ALTER TABLE "cart" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "llmProvider" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "userLLMProvider" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "userTokenCount" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Server can select cart"
ON "public"."cart"
AS PERMISSIVE
FOR UPDATE
TO service_role
USING (true);

CREATE POLICY "Server can update llmProvider"
ON "public"."llmProvider"
AS PERMISSIVE
FOR UPDATE
TO service_role
USING (true);

CREATE POLICY "User can update own userLLMProvider"
ON "public"."userLLMProvider"
AS PERMISSIVE
FOR UPDATE
TO authenticated
using (
  (select auth.uid()) = "public"."userLLMProvider"."userId"
);

CREATE POLICY "User can select own userTokenCount"
ON "public"."userTokenCount"
AS PERMISSIVE
FOR SELECT
using (
  (select auth.uid()) = "public"."userTokenCount"."userId"
);

CREATE POLICY "Server can update userTokenCount"
ON "public"."userTokenCount"
AS PERMISSIVE
FOR UPDATE
TO service_role
USING (true);

-- realtime
ALTER PUBLICATION supabase_realtime ADD TABLE "public"."userTokenCount";
```

### types
```
supabase gen types typescript --project-id odbyqfknheshvujhabpp > database.types.ts
```

# stripe

```
stripe listen --forward-to localhost:5173/webhooks/stripe
```