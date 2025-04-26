CREATE TABLE "userTokenCount" (
	"userId" text NOT NULL,
	"tokens" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "userTokenCount_userId_pk" PRIMARY KEY("userId")
);
--> statement-breakpoint
ALTER TABLE "userTokenCount" ADD CONSTRAINT "userTokenCount_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;