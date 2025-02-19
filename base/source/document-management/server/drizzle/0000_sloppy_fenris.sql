CREATE TYPE "document_management"."document_property_data_type" AS ENUM('text', 'integer', 'decimal', 'boolean');--> statement-breakpoint
CREATE TABLE "document_management"."document" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_id" uuid NOT NULL,
	"type_id" uuid,
	"addition" text,
	"date" date,
	"expiration" date,
	"revision" integer NOT NULL,
	"revision_timestamp" timestamp with time zone NOT NULL,
	"create_timestamp" timestamp with time zone NOT NULL,
	"delete_timestamp" timestamp with time zone,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_management"."document_category" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label" text NOT NULL,
	"revision" integer NOT NULL,
	"revision_timestamp" timestamp with time zone NOT NULL,
	"create_timestamp" timestamp with time zone NOT NULL,
	"delete_timestamp" timestamp with time zone,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_management"."document_collection" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"revision" integer NOT NULL,
	"revision_timestamp" timestamp with time zone NOT NULL,
	"create_timestamp" timestamp with time zone NOT NULL,
	"delete_timestamp" timestamp with time zone,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_management"."document_collection_document" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collection_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"archive_timestamp" timestamp with time zone,
	"revision" integer NOT NULL,
	"revision_timestamp" timestamp with time zone NOT NULL,
	"create_timestamp" timestamp with time zone NOT NULL,
	"delete_timestamp" timestamp with time zone,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_management"."document_file" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"original_file_name" text,
	"mime_type" text NOT NULL,
	"hash" text NOT NULL,
	"size" integer NOT NULL,
	"revision" integer NOT NULL,
	"revision_timestamp" timestamp with time zone NOT NULL,
	"create_timestamp" timestamp with time zone NOT NULL,
	"delete_timestamp" timestamp with time zone,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_management"."document_property" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label" text NOT NULL,
	"data_type" "document_management"."document_property_data_type" NOT NULL,
	"revision" integer NOT NULL,
	"revision_timestamp" timestamp with time zone NOT NULL,
	"create_timestamp" timestamp with time zone NOT NULL,
	"delete_timestamp" timestamp with time zone,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_management"."document_property_boolean_value" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"property_id" uuid NOT NULL,
	"value" boolean,
	"revision" integer NOT NULL,
	"revision_timestamp" timestamp with time zone NOT NULL,
	"create_timestamp" timestamp with time zone NOT NULL,
	"delete_timestamp" timestamp with time zone,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_management"."document_property_decimal_value" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"property_id" uuid NOT NULL,
	"value" double precision,
	"revision" integer NOT NULL,
	"revision_timestamp" timestamp with time zone NOT NULL,
	"create_timestamp" timestamp with time zone NOT NULL,
	"delete_timestamp" timestamp with time zone,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_management"."document_property_integer_value" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"property_id" uuid NOT NULL,
	"value" integer,
	"revision" integer NOT NULL,
	"revision_timestamp" timestamp with time zone NOT NULL,
	"create_timestamp" timestamp with time zone NOT NULL,
	"delete_timestamp" timestamp with time zone,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_management"."document_property_text_value" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"property_id" uuid NOT NULL,
	"value" text,
	"revision" integer NOT NULL,
	"revision_timestamp" timestamp with time zone NOT NULL,
	"create_timestamp" timestamp with time zone NOT NULL,
	"delete_timestamp" timestamp with time zone,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_management"."document_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type_id" uuid,
	"required_files_count" integer NOT NULL,
	"comment" text,
	"completed" boolean NOT NULL,
	"revision" integer NOT NULL,
	"revision_timestamp" timestamp with time zone NOT NULL,
	"create_timestamp" timestamp with time zone NOT NULL,
	"delete_timestamp" timestamp with time zone,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_management"."document_request_collection" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"collection_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"revision_timestamp" timestamp with time zone NOT NULL,
	"create_timestamp" timestamp with time zone NOT NULL,
	"delete_timestamp" timestamp with time zone,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_management"."document_request_file" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"addition" text,
	"created_document_id" uuid,
	"approval" boolean,
	"approval_comment" text,
	"approval_timestamp" timestamp with time zone,
	"revision" integer NOT NULL,
	"revision_timestamp" timestamp with time zone NOT NULL,
	"create_timestamp" timestamp with time zone NOT NULL,
	"delete_timestamp" timestamp with time zone,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_management"."document_request_template" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requests_template_id" uuid NOT NULL,
	"type_id" uuid,
	"required_files_count" integer NOT NULL,
	"comment" text,
	"revision" integer NOT NULL,
	"revision_timestamp" timestamp with time zone NOT NULL,
	"create_timestamp" timestamp with time zone NOT NULL,
	"delete_timestamp" timestamp with time zone,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_management"."document_requests_template" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"revision" integer NOT NULL,
	"revision_timestamp" timestamp with time zone NOT NULL,
	"create_timestamp" timestamp with time zone NOT NULL,
	"delete_timestamp" timestamp with time zone,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_management"."document_type" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"group" text,
	"label" text NOT NULL,
	"revision" integer NOT NULL,
	"revision_timestamp" timestamp with time zone NOT NULL,
	"create_timestamp" timestamp with time zone NOT NULL,
	"delete_timestamp" timestamp with time zone,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_management"."document_type_property" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type_id" uuid NOT NULL,
	"property_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"revision_timestamp" timestamp with time zone NOT NULL,
	"create_timestamp" timestamp with time zone NOT NULL,
	"delete_timestamp" timestamp with time zone,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "document_management"."document" ADD CONSTRAINT "document_file_id_document_file_id_fk" FOREIGN KEY ("file_id") REFERENCES "document_management"."document_file"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."document" ADD CONSTRAINT "document_type_id_document_type_id_fk" FOREIGN KEY ("type_id") REFERENCES "document_management"."document_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."document_collection_document" ADD CONSTRAINT "document_collection_document_collection_id_document_collection_id_fk" FOREIGN KEY ("collection_id") REFERENCES "document_management"."document_collection"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."document_collection_document" ADD CONSTRAINT "document_collection_document_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "document_management"."document"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."document_property_boolean_value" ADD CONSTRAINT "document_property_boolean_value_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "document_management"."document"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."document_property_boolean_value" ADD CONSTRAINT "document_property_boolean_value_property_id_document_property_id_fk" FOREIGN KEY ("property_id") REFERENCES "document_management"."document_property"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."document_property_decimal_value" ADD CONSTRAINT "document_property_decimal_value_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "document_management"."document"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."document_property_decimal_value" ADD CONSTRAINT "document_property_decimal_value_property_id_document_property_id_fk" FOREIGN KEY ("property_id") REFERENCES "document_management"."document_property"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."document_property_integer_value" ADD CONSTRAINT "document_property_integer_value_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "document_management"."document"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."document_property_integer_value" ADD CONSTRAINT "document_property_integer_value_property_id_document_property_id_fk" FOREIGN KEY ("property_id") REFERENCES "document_management"."document_property"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."document_property_text_value" ADD CONSTRAINT "document_property_text_value_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "document_management"."document"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."document_property_text_value" ADD CONSTRAINT "document_property_text_value_property_id_document_property_id_fk" FOREIGN KEY ("property_id") REFERENCES "document_management"."document_property"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."document_request" ADD CONSTRAINT "document_request_type_id_document_type_id_fk" FOREIGN KEY ("type_id") REFERENCES "document_management"."document_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."document_request_collection" ADD CONSTRAINT "document_request_collection_request_id_document_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "document_management"."document_request"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."document_request_collection" ADD CONSTRAINT "document_request_collection_collection_id_document_collection_id_fk" FOREIGN KEY ("collection_id") REFERENCES "document_management"."document_collection"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."document_request_file" ADD CONSTRAINT "document_request_file_request_id_document_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "document_management"."document_request"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."document_request_file" ADD CONSTRAINT "document_request_file_file_id_document_file_id_fk" FOREIGN KEY ("file_id") REFERENCES "document_management"."document_file"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."document_request_file" ADD CONSTRAINT "document_request_file_created_document_id_document_id_fk" FOREIGN KEY ("created_document_id") REFERENCES "document_management"."document"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."document_request_template" ADD CONSTRAINT "document_request_template_requests_template_id_document_requests_template_id_fk" FOREIGN KEY ("requests_template_id") REFERENCES "document_management"."document_requests_template"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."document_request_template" ADD CONSTRAINT "document_request_template_type_id_document_type_id_fk" FOREIGN KEY ("type_id") REFERENCES "document_management"."document_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."document_type" ADD CONSTRAINT "document_type_category_id_document_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "document_management"."document_category"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."document_type_property" ADD CONSTRAINT "document_type_property_type_id_document_type_id_fk" FOREIGN KEY ("type_id") REFERENCES "document_management"."document_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."document_type_property" ADD CONSTRAINT "document_type_property_property_id_document_property_id_fk" FOREIGN KEY ("property_id") REFERENCES "document_management"."document_property"("id") ON DELETE no action ON UPDATE no action;