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
);

DROP POLICY IF EXISTS "User can select own userTokenCount" ON "public"."userTokenCount";
CREATE POLICY "User can select own userTokenCount"
ON "public"."userTokenCount"
FOR SELECT
TO authenticated
USING (
  (select auth.uid()) = "public"."userTokenCount"."userId"
);

-- templates

DROP POLICY IF EXISTS "User can access own word templates" ON "public"."template";
CREATE POLICY "User can access own word templates"
ON "public"."template"
FOR ALL
TO authenticated
USING (
  (select auth.uid()) = "public"."template"."user_id"
);

DROP POLICY IF EXISTS "Only authenticated can select any data" ON storage.objects;
CREATE POLICY "Only authenticated can select data"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'templates'
);

DROP POLICY IF EXISTS "Only authenticated can upload data" ON storage.objects;
CREATE POLICY "Only authenticated can upload data"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'templates'
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

-- userMetadata
ALTER TABLE "userMetadata" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."userMetadata" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."userMetadata" TO authenticated;

DROP POLICY IF EXISTS "User can access own metadata" ON "public"."userMetadata";
CREATE POLICY "User can access own metadata"
ON "public"."userMetadata"
FOR ALL
TO authenticated
USING (
  (select auth.uid()) = "public"."userMetadata"."userId"
);