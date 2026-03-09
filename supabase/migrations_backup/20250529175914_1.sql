CREATE TABLE "userTokenCount" (
    "userId" uuid NOT NULL,
    "tokens" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "userTokenCount_userId_pk" PRIMARY KEY("userId"),
    CONSTRAINT "userTokenCount_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action
);

CREATE TABLE "cart" (
    "userId" uuid NOT NULL,
    "intentId" text NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "createdAt" timestamp DEFAULT now(),
    CONSTRAINT "cart_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action
);
