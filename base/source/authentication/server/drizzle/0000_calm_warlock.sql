CREATE TABLE "authentication"."credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject" text NOT NULL,
	"hash_version" integer NOT NULL,
	"salt" "bytea" NOT NULL,
	"hash" "bytea" NOT NULL,
	"revision" integer NOT NULL,
	"revision_timestamp" timestamp with time zone NOT NULL,
	"create_timestamp" timestamp with time zone NOT NULL,
	"delete_timestamp" timestamp with time zone,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "credentials_subject_unique" UNIQUE("subject")
);
--> statement-breakpoint
CREATE TABLE "authentication"."session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject" text NOT NULL,
	"begin" timestamp with time zone NOT NULL,
	"end" timestamp with time zone NOT NULL,
	"refresh_token_hash_version" integer NOT NULL,
	"refresh_token_salt" "bytea" NOT NULL,
	"refresh_token_hash" "bytea" NOT NULL,
	"revision" integer NOT NULL,
	"revision_timestamp" timestamp with time zone NOT NULL,
	"create_timestamp" timestamp with time zone NOT NULL,
	"delete_timestamp" timestamp with time zone,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL
);
