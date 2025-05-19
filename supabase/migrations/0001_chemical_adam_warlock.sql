CREATE TABLE "shoppingCart" (
	"userId" uuid NOT NULL,
	"intentId" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "shoppingCart" ADD CONSTRAINT "shoppingCart_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;