CREATE TABLE "llmProvider" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"owner" text NOT NULL,
	"price" numeric(5, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "userLLMProvider" (
	"userId" uuid NOT NULL,
	"providerId" uuid NOT NULL,
	"token" text,
	CONSTRAINT "userLLMProvider_userId_providerId_pk" PRIMARY KEY("userId","providerId")
);
--> statement-breakpoint
CREATE TABLE "userTokenCount" (
	"userId" uuid NOT NULL,
	"tokens" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "userTokenCount_userId_pk" PRIMARY KEY("userId")
);
--> statement-breakpoint
ALTER TABLE "userLLMProvider" ADD CONSTRAINT "userLLMProvider_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "userLLMProvider" ADD CONSTRAINT "userLLMProvider_providerId_llmProvider_id_fk" FOREIGN KEY ("providerId") REFERENCES "public"."llmProvider"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "userTokenCount" ADD CONSTRAINT "userTokenCount_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;