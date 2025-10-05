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

DROP POLICY IF EXISTS "User can access own word templates" ON "public"."template";
CREATE POLICY "User can access own word templates"
ON "public"."template"
FOR ALL
TO authenticated
USING (
  (select auth.uid()) = "public"."template"."userId"
);

-- ONE TIME ONLY
-- ALTER PUBLICATION supabase_realtime ADD TABLE "public"."userTokenCount";
```

Prune carts
Supabase Integrations -> Cron 0 0 * * 1
```sql
DELETE FROM cart WHERE "createdAt" < NOW() - INTERVAL '7 days';
```

### types
```ps1
supabase gen types typescript --project-id odbyqfknheshvujhabpp > database.types.ts
```

### stripe

```ps1
stripe listen --forward-to localhost:5173/webhooks/stripe
```