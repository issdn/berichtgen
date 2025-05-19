ALTER TABLE "shoppingCart" RENAME TO "cart";--> statement-breakpoint
ALTER TABLE "cart" DROP CONSTRAINT "shoppingCart_userId_users_id_fk";
--> statement-breakpoint
ALTER TABLE "cart" ADD CONSTRAINT "cart_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;