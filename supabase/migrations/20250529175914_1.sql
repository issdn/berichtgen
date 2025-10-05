CREATE TABLE "llmProvider" (
    "id" uuid PRIMARY KEY NOT NULL,
    "name" text NOT NULL,
    "url" text NOT NULL,
    "owner" text NOT NULL,
    "price" numeric(5, 2) NOT NULL,
    "maxTokens" integer NOT NULL
);

CREATE TABLE "userLLMProvider" (
    "userId" uuid NOT NULL,
    "providerId" uuid NOT NULL,
    "token" text,
    CONSTRAINT "userLLMProvider_userId_providerId_pk" PRIMARY KEY("userId","providerId"),
    CONSTRAINT "userLLMProvider_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action,
    CONSTRAINT "userLLMProvider_providerId_llmProvider_id_fk" FOREIGN KEY ("providerId") REFERENCES "public"."llmProvider"("id") ON DELETE cascade ON UPDATE no action
);

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