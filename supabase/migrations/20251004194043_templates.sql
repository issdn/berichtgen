CREATE TABLE "template" (
    "userId" uuid  NOT NULL,
    "file" bytea NOT NULL,
    "name" text NOT NULL,
    CONSTRAINT "template_userId_name_pk" PRIMARY KEY("userId", "name"),
    CONSTRAINT "template_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action
);