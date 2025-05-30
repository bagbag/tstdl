CREATE TYPE "document_management"."document_approval" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "document_management"."document_assignment_target" AS ENUM('collection', 'request');--> statement-breakpoint
CREATE TYPE "document_management"."document_property_data_type" AS ENUM('text', 'integer', 'decimal', 'boolean', 'date');--> statement-breakpoint
CREATE TYPE "document_management"."document_request_state" AS ENUM('open', 'fulfilled', 'closed');--> statement-breakpoint
CREATE TYPE "document_management"."document_validation_execution_state" AS ENUM('pending', 'running', 'completed', 'error');--> statement-breakpoint
CREATE TYPE "document_management"."document_validation_result_status" AS ENUM('passed', 'failed', 'warning');--> statement-breakpoint
CREATE TYPE "document_management"."document_workflow_fail_reason" AS ENUM('no-suitable-collection', 'no-suitable-request');--> statement-breakpoint
CREATE TYPE "document_management"."document_workflow_state" AS ENUM('pending', 'running', 'review', 'completed', 'error', 'failed');--> statement-breakpoint
CREATE TYPE "document_management"."document_workflow_step" AS ENUM('classification', 'extraction', 'assignment', 'validation');--> statement-breakpoint
CREATE TABLE "document_management"."document" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type_id" uuid,
	"title" text,
	"subtitle" text,
	"pages" integer,
	"date" date,
	"summary" text,
	"tags" text[],
	"approval" "document_management"."document_approval" NOT NULL,
	"comment" text,
	"original_file_name" text,
	"mime_type" text NOT NULL,
	"hash" text NOT NULL,
	"size" integer NOT NULL,
	"create_user_id" uuid,
	"revision" integer NOT NULL,
	"revision_timestamp" timestamp with time zone NOT NULL,
	"create_timestamp" timestamp with time zone NOT NULL,
	"delete_timestamp" timestamp with time zone,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_management"."document_assignment_scope" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"collection_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"revision_timestamp" timestamp with time zone NOT NULL,
	"create_timestamp" timestamp with time zone NOT NULL,
	"delete_timestamp" timestamp with time zone,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "das_task_id_collection_id_unique" UNIQUE("task_id","collection_id")
);
--> statement-breakpoint
CREATE TABLE "document_management"."document_assignment_task" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"target" "document_management"."document_assignment_target" NOT NULL,
	"revision" integer NOT NULL,
	"revision_timestamp" timestamp with time zone NOT NULL,
	"create_timestamp" timestamp with time zone NOT NULL,
	"delete_timestamp" timestamp with time zone,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "document_assignment_task_document_id_unique" UNIQUE("document_id")
);
--> statement-breakpoint
CREATE TABLE "document_management"."document_category" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid,
	"label" text NOT NULL,
	"revision" integer NOT NULL,
	"revision_timestamp" timestamp with time zone NOT NULL,
	"create_timestamp" timestamp with time zone NOT NULL,
	"delete_timestamp" timestamp with time zone,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "document_category_label_unique" UNIQUE("label")
);
--> statement-breakpoint
CREATE TABLE "document_management"."document_collection" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid,
	"revision" integer NOT NULL,
	"revision_timestamp" timestamp with time zone NOT NULL,
	"create_timestamp" timestamp with time zone NOT NULL,
	"delete_timestamp" timestamp with time zone,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_management"."document_collection_assignment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collection_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"archive_timestamp" timestamp with time zone,
	"revision" integer NOT NULL,
	"revision_timestamp" timestamp with time zone NOT NULL,
	"create_timestamp" timestamp with time zone NOT NULL,
	"delete_timestamp" timestamp with time zone,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "document_collection_assignment_collection_id_document_id_unique" UNIQUE("collection_id","document_id")
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
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "document_property_label_unique" UNIQUE("label")
);
--> statement-breakpoint
CREATE TABLE "document_management"."document_property_value" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"property_id" uuid NOT NULL,
	"text" text,
	"integer" integer,
	"decimal" double precision,
	"boolean" boolean,
	"date" date,
	"revision" integer NOT NULL,
	"revision_timestamp" timestamp with time zone NOT NULL,
	"create_timestamp" timestamp with time zone NOT NULL,
	"delete_timestamp" timestamp with time zone,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "document_property_value_document_id_property_id_unique" UNIQUE("document_id","property_id"),
	CONSTRAINT "only_one_value" CHECK (num_nonnulls("document_management"."document_property_value"."text", "document_management"."document_property_value"."integer", "document_management"."document_property_value"."decimal", "document_management"."document_property_value"."boolean", "document_management"."document_property_value"."date") = 1)
);
--> statement-breakpoint
CREATE TABLE "document_management"."document_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type_id" uuid,
	"document_id" uuid,
	"comment" text,
	"state" "document_management"."document_request_state" NOT NULL,
	"revision" integer NOT NULL,
	"revision_timestamp" timestamp with time zone NOT NULL,
	"create_timestamp" timestamp with time zone NOT NULL,
	"delete_timestamp" timestamp with time zone,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "document_request_document_id_unique" UNIQUE("document_id")
);
--> statement-breakpoint
CREATE TABLE "document_management"."document_request_collection_assignment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"collection_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"revision_timestamp" timestamp with time zone NOT NULL,
	"create_timestamp" timestamp with time zone NOT NULL,
	"delete_timestamp" timestamp with time zone,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "document_request_collection_assignment_request_id_collection_id_unique" UNIQUE("request_id","collection_id")
);
--> statement-breakpoint
CREATE TABLE "document_management"."document_request_submission" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"revision_timestamp" timestamp with time zone NOT NULL,
	"create_timestamp" timestamp with time zone NOT NULL,
	"delete_timestamp" timestamp with time zone,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "document_request_submission_request_id_document_id_unique" UNIQUE("request_id","document_id")
);
--> statement-breakpoint
CREATE TABLE "document_management"."document_request_template" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requests_template_id" uuid NOT NULL,
	"type_id" uuid NOT NULL,
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
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "document_requests_template_label_unique" UNIQUE("label")
);
--> statement-breakpoint
CREATE TABLE "document_management"."document_type" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"label" text NOT NULL,
	"revision" integer NOT NULL,
	"revision_timestamp" timestamp with time zone NOT NULL,
	"create_timestamp" timestamp with time zone NOT NULL,
	"delete_timestamp" timestamp with time zone,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "document_type_category_id_label_unique" UNIQUE("category_id","label")
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
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "document_type_property_type_id_property_id_unique" UNIQUE("type_id","property_id")
);
--> statement-breakpoint
CREATE TABLE "document_management"."document_type_validation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type_id" uuid NOT NULL,
	"validation_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"revision_timestamp" timestamp with time zone NOT NULL,
	"create_timestamp" timestamp with time zone NOT NULL,
	"delete_timestamp" timestamp with time zone,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "document_type_validation_type_id_validation_id_unique" UNIQUE("type_id","validation_id")
);
--> statement-breakpoint
CREATE TABLE "document_management"."document_validation_definition" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier" text NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"configuration" jsonb NOT NULL,
	"revision" integer NOT NULL,
	"revision_timestamp" timestamp with time zone NOT NULL,
	"create_timestamp" timestamp with time zone NOT NULL,
	"delete_timestamp" timestamp with time zone,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_management"."document_validation_execution" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_id" uuid NOT NULL,
	"definition_id" uuid NOT NULL,
	"state" "document_management"."document_validation_execution_state" NOT NULL,
	"result_status" "document_management"."document_validation_result_status",
	"result_message" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"revision" integer NOT NULL,
	"revision_timestamp" timestamp with time zone NOT NULL,
	"create_timestamp" timestamp with time zone NOT NULL,
	"delete_timestamp" timestamp with time zone,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "document_validation_execution_workflow_id_definition_id_unique" UNIQUE("workflow_id","definition_id")
);
--> statement-breakpoint
CREATE TABLE "document_management"."document_validation_execution_related_document" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"execution_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"revision_timestamp" timestamp with time zone NOT NULL,
	"create_timestamp" timestamp with time zone NOT NULL,
	"delete_timestamp" timestamp with time zone,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "dverd_execution_id_document_id_unique" UNIQUE("execution_id","document_id")
);
--> statement-breakpoint
CREATE TABLE "document_management"."document_workflow" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"step" "document_management"."document_workflow_step" NOT NULL,
	"state" "document_management"."document_workflow_state" NOT NULL,
	"fail_reason" "document_management"."document_workflow_fail_reason",
	"complete_timestamp" timestamp with time zone,
	"complete_user_id" uuid,
	"revision" integer NOT NULL,
	"revision_timestamp" timestamp with time zone NOT NULL,
	"create_timestamp" timestamp with time zone NOT NULL,
	"delete_timestamp" timestamp with time zone,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "document_management"."document" ADD CONSTRAINT "document_type_id_document_type_id_fk" FOREIGN KEY ("type_id") REFERENCES "document_management"."document_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."document_assignment_scope" ADD CONSTRAINT "document_assignment_scope_task_id_document_assignment_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "document_management"."document_assignment_task"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."document_assignment_scope" ADD CONSTRAINT "document_assignment_scope_collection_id_document_collection_id_fk" FOREIGN KEY ("collection_id") REFERENCES "document_management"."document_collection"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."document_assignment_task" ADD CONSTRAINT "document_assignment_task_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "document_management"."document"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."document_category" ADD CONSTRAINT "document_category_parent_id_document_category_id_fk" FOREIGN KEY ("parent_id") REFERENCES "document_management"."document_category"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."document_collection" ADD CONSTRAINT "document_collection_parent_id_document_collection_id_fk" FOREIGN KEY ("parent_id") REFERENCES "document_management"."document_collection"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."document_collection_assignment" ADD CONSTRAINT "document_collection_assignment_collection_id_document_collection_id_fk" FOREIGN KEY ("collection_id") REFERENCES "document_management"."document_collection"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."document_collection_assignment" ADD CONSTRAINT "document_collection_assignment_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "document_management"."document"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."document_property_value" ADD CONSTRAINT "document_property_value_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "document_management"."document"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."document_property_value" ADD CONSTRAINT "document_property_value_property_id_document_property_id_fk" FOREIGN KEY ("property_id") REFERENCES "document_management"."document_property"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."document_request" ADD CONSTRAINT "document_request_type_id_document_type_id_fk" FOREIGN KEY ("type_id") REFERENCES "document_management"."document_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."document_request" ADD CONSTRAINT "document_request_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "document_management"."document"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."document_request_collection_assignment" ADD CONSTRAINT "document_request_collection_assignment_request_id_document_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "document_management"."document_request"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."document_request_collection_assignment" ADD CONSTRAINT "document_request_collection_assignment_collection_id_document_collection_id_fk" FOREIGN KEY ("collection_id") REFERENCES "document_management"."document_collection"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."document_request_submission" ADD CONSTRAINT "document_request_submission_request_id_document_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "document_management"."document_request"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."document_request_submission" ADD CONSTRAINT "document_request_submission_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "document_management"."document"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."document_request_template" ADD CONSTRAINT "document_request_template_requests_template_id_document_requests_template_id_fk" FOREIGN KEY ("requests_template_id") REFERENCES "document_management"."document_requests_template"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."document_request_template" ADD CONSTRAINT "document_request_template_type_id_document_type_id_fk" FOREIGN KEY ("type_id") REFERENCES "document_management"."document_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."document_type" ADD CONSTRAINT "document_type_category_id_document_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "document_management"."document_category"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."document_type_property" ADD CONSTRAINT "document_type_property_type_id_document_type_id_fk" FOREIGN KEY ("type_id") REFERENCES "document_management"."document_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."document_type_property" ADD CONSTRAINT "document_type_property_property_id_document_property_id_fk" FOREIGN KEY ("property_id") REFERENCES "document_management"."document_property"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."document_type_validation" ADD CONSTRAINT "document_type_validation_type_id_document_type_id_fk" FOREIGN KEY ("type_id") REFERENCES "document_management"."document_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."document_type_validation" ADD CONSTRAINT "document_type_validation_validation_id_document_validation_definition_id_fk" FOREIGN KEY ("validation_id") REFERENCES "document_management"."document_validation_definition"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."document_validation_execution" ADD CONSTRAINT "document_validation_execution_workflow_id_document_workflow_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "document_management"."document_workflow"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."document_validation_execution" ADD CONSTRAINT "document_validation_execution_definition_id_document_validation_definition_id_fk" FOREIGN KEY ("definition_id") REFERENCES "document_management"."document_validation_definition"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."document_validation_execution_related_document" ADD CONSTRAINT "document_validation_execution_related_document_execution_id_document_validation_execution_id_fk" FOREIGN KEY ("execution_id") REFERENCES "document_management"."document_validation_execution"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."document_validation_execution_related_document" ADD CONSTRAINT "document_validation_execution_related_document_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "document_management"."document"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."document_workflow" ADD CONSTRAINT "document_workflow_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "document_management"."document"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "document_request_state_idx" ON "document_management"."document_request" USING btree ("state");--> statement-breakpoint
CREATE UNIQUE INDEX "document_workflow_document_id_idx" ON "document_management"."document_workflow" USING btree ("document_id") WHERE "document_management"."document_workflow"."state" <> 'completed';