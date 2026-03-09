CREATE TABLE "userTokenCount" (
    "userId" uuid NOT NULL,
    "tokens" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "userTokenCount_userId_pk" PRIMARY KEY("userId"),
    CONSTRAINT "userTokenCount_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action
);

CREATE TABLE "cart" (
    "userId" uuid  NOT NULL,
    "intentId" text NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "createdAt" timestamp DEFAULT now(),
    CONSTRAINT "cart_userId_pk" PRIMARY KEY("userId"),
    CONSTRAINT "cart_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action
);

CREATE TABLE "template" (
	id uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
	storage_path text NOT NULL,
	thumbnail_path text,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz
);

CREATE INDEX IF NOT EXISTS template_user_id_idx ON "template" (user_id);
