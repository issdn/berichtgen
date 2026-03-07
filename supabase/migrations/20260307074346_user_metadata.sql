CREATE TABLE "userMetadata" (
    "userId" uuid PRIMARY KEY NOT NULL,
    "fullName" text,
    "ausbildungsberuf" text,
    "abteilung" text,
    CONSTRAINT "userMetadata_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action
);

CREATE INDEX IF NOT EXISTS user_metadata_user_id_idx ON "userMetadata" ("userId");
