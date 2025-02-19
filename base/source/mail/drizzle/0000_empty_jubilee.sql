CREATE TABLE "mail"."mail_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"template" text,
	"data" jsonb NOT NULL,
	"send_result" jsonb,
	"errors" text[],
	"revision" integer NOT NULL,
	"revision_timestamp" timestamp with time zone NOT NULL,
	"create_timestamp" timestamp with time zone NOT NULL,
	"delete_timestamp" timestamp with time zone,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL
);
