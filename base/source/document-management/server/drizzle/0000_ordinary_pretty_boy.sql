CREATE TYPE "document_management"."document_approval" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "document_management"."assignment_target" AS ENUM('collection', 'request');--> statement-breakpoint
CREATE TYPE "document_management"."property_data_type" AS ENUM('text', 'integer', 'decimal', 'boolean', 'date');--> statement-breakpoint
CREATE TYPE "document_management"."request_state" AS ENUM('open', 'fulfilled', 'closed');--> statement-breakpoint
CREATE TYPE "document_management"."validation_execution_state" AS ENUM('pending', 'running', 'completed', 'error');--> statement-breakpoint
CREATE TYPE "document_management"."validation_result_status" AS ENUM('passed', 'failed', 'warning');--> statement-breakpoint
CREATE TYPE "document_management"."workflow_fail_reason" AS ENUM('no-suitable-collection', 'no-suitable-request');--> statement-breakpoint
CREATE TYPE "document_management"."workflow_state" AS ENUM('pending', 'running', 'review', 'completed', 'error', 'failed');--> statement-breakpoint
CREATE TYPE "document_management"."workflow_step" AS ENUM('classification', 'extraction', 'assignment', 'validation');--> statement-breakpoint
CREATE TABLE "document_management"."document" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"type_id" uuid,
	"title" text,
	"subtitle" text,
	"pages" integer,
	"date" date,
	"summary" text,
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
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "document_tenant_id_id_unique" UNIQUE("tenant_id","id")
);
--> statement-breakpoint
CREATE TABLE "document_management"."assignment_scope" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"collection_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"revision_timestamp" timestamp with time zone NOT NULL,
	"create_timestamp" timestamp with time zone NOT NULL,
	"delete_timestamp" timestamp with time zone,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "assignment_scope_task_id_collection_id_unique" UNIQUE("task_id","collection_id")
);
--> statement-breakpoint
CREATE TABLE "document_management"."assignment_task" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"target" "document_management"."assignment_target" NOT NULL,
	"revision" integer NOT NULL,
	"revision_timestamp" timestamp with time zone NOT NULL,
	"create_timestamp" timestamp with time zone NOT NULL,
	"delete_timestamp" timestamp with time zone,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "assignment_task_document_id_unique" UNIQUE("document_id"),
	CONSTRAINT "assignment_task_tenant_id_id_unique" UNIQUE("tenant_id","id")
);
--> statement-breakpoint
CREATE TABLE "document_management"."category" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"parent_id" uuid,
	"label" text NOT NULL,
	"revision" integer NOT NULL,
	"revision_timestamp" timestamp with time zone NOT NULL,
	"create_timestamp" timestamp with time zone NOT NULL,
	"delete_timestamp" timestamp with time zone,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "category_label_unique" UNIQUE("label"),
	CONSTRAINT "category_tenant_id_parent_id_label_unique" UNIQUE("tenant_id","parent_id","label")
);
--> statement-breakpoint
CREATE TABLE "document_management"."collection" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"parent_id" uuid,
	"revision" integer NOT NULL,
	"revision_timestamp" timestamp with time zone NOT NULL,
	"create_timestamp" timestamp with time zone NOT NULL,
	"delete_timestamp" timestamp with time zone,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "collection_tenant_id_id_unique" UNIQUE("tenant_id","id")
);
--> statement-breakpoint
CREATE TABLE "document_management"."collection_assignment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"collection_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"archive_timestamp" timestamp with time zone,
	"revision" integer NOT NULL,
	"revision_timestamp" timestamp with time zone NOT NULL,
	"create_timestamp" timestamp with time zone NOT NULL,
	"delete_timestamp" timestamp with time zone,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "ca_tenant_id_collection_id_document_id_unique" UNIQUE("tenant_id","collection_id","document_id")
);
--> statement-breakpoint
CREATE TABLE "document_management"."property" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"label" text NOT NULL,
	"data_type" "document_management"."property_data_type" NOT NULL,
	"revision" integer NOT NULL,
	"revision_timestamp" timestamp with time zone NOT NULL,
	"create_timestamp" timestamp with time zone NOT NULL,
	"delete_timestamp" timestamp with time zone,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "property_label_unique" UNIQUE("label"),
	CONSTRAINT "property_tenant_id_label_unique" UNIQUE("tenant_id","label")
);
--> statement-breakpoint
CREATE TABLE "document_management"."property_value" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
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
	CONSTRAINT "property_value_tenant_id_document_id_property_id_unique" UNIQUE("tenant_id","document_id","property_id"),
	CONSTRAINT "only_one_value" CHECK (num_nonnulls("document_management"."property_value"."text", "document_management"."property_value"."integer", "document_management"."property_value"."decimal", "document_management"."property_value"."boolean", "document_management"."property_value"."date") = 1)
);
--> statement-breakpoint
CREATE TABLE "document_management"."request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"type_id" uuid,
	"document_id" uuid,
	"comment" text,
	"state" "document_management"."request_state" NOT NULL,
	"revision" integer NOT NULL,
	"revision_timestamp" timestamp with time zone NOT NULL,
	"create_timestamp" timestamp with time zone NOT NULL,
	"delete_timestamp" timestamp with time zone,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "request_document_id_unique" UNIQUE("document_id"),
	CONSTRAINT "request_tenant_id_id_unique" UNIQUE("tenant_id","id")
);
--> statement-breakpoint
CREATE TABLE "document_management"."request_collection_assignment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"request_id" uuid NOT NULL,
	"collection_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"revision_timestamp" timestamp with time zone NOT NULL,
	"create_timestamp" timestamp with time zone NOT NULL,
	"delete_timestamp" timestamp with time zone,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "rca_tenant_id_request_id_collection_id_unique" UNIQUE("tenant_id","request_id","collection_id")
);
--> statement-breakpoint
CREATE TABLE "document_management"."request_template" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
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
CREATE TABLE "document_management"."requests_template" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"label" text NOT NULL,
	"description" text,
	"revision" integer NOT NULL,
	"revision_timestamp" timestamp with time zone NOT NULL,
	"create_timestamp" timestamp with time zone NOT NULL,
	"delete_timestamp" timestamp with time zone,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_management"."tag" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"label" text NOT NULL,
	"revision" integer NOT NULL,
	"revision_timestamp" timestamp with time zone NOT NULL,
	"create_timestamp" timestamp with time zone NOT NULL,
	"delete_timestamp" timestamp with time zone,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "tag_tenant_id_label_unique" UNIQUE("tenant_id","label")
);
--> statement-breakpoint
CREATE TABLE "document_management"."tag_assignment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"revision_timestamp" timestamp with time zone NOT NULL,
	"create_timestamp" timestamp with time zone NOT NULL,
	"delete_timestamp" timestamp with time zone,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "tag_assignment_tenant_id_document_id_tag_id_unique" UNIQUE("tenant_id","document_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "document_management"."type" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"category_id" uuid NOT NULL,
	"label" text NOT NULL,
	"revision" integer NOT NULL,
	"revision_timestamp" timestamp with time zone NOT NULL,
	"create_timestamp" timestamp with time zone NOT NULL,
	"delete_timestamp" timestamp with time zone,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "type_tenant_id_category_id_label_unique" UNIQUE("tenant_id","category_id","label")
);
--> statement-breakpoint
CREATE TABLE "document_management"."type_property" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"type_id" uuid NOT NULL,
	"property_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"revision_timestamp" timestamp with time zone NOT NULL,
	"create_timestamp" timestamp with time zone NOT NULL,
	"delete_timestamp" timestamp with time zone,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "type_property_tenant_id_type_id_property_id_unique" UNIQUE("tenant_id","type_id","property_id")
);
--> statement-breakpoint
CREATE TABLE "document_management"."document_type_validation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"type_id" uuid NOT NULL,
	"validation_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"revision_timestamp" timestamp with time zone NOT NULL,
	"create_timestamp" timestamp with time zone NOT NULL,
	"delete_timestamp" timestamp with time zone,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "document_type_validation_tenant_id_type_id_validation_id_unique" UNIQUE("tenant_id","type_id","validation_id")
);
--> statement-breakpoint
CREATE TABLE "document_management"."validation_definition" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
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
CREATE TABLE "document_management"."validation_execution" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"workflow_id" uuid NOT NULL,
	"definition_id" uuid NOT NULL,
	"state" "document_management"."validation_execution_state" NOT NULL,
	"result_status" "document_management"."validation_result_status",
	"result_message" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"revision" integer NOT NULL,
	"revision_timestamp" timestamp with time zone NOT NULL,
	"create_timestamp" timestamp with time zone NOT NULL,
	"delete_timestamp" timestamp with time zone,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "validation_execution_tenant_id_workflow_id_definition_id_unique" UNIQUE("tenant_id","workflow_id","definition_id"),
	CONSTRAINT "validation_execution_tenant_id_id_unique" UNIQUE("tenant_id","id")
);
--> statement-breakpoint
CREATE TABLE "document_management"."validation_execution_related_document" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"execution_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"revision_timestamp" timestamp with time zone NOT NULL,
	"create_timestamp" timestamp with time zone NOT NULL,
	"delete_timestamp" timestamp with time zone,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "verd_tenant_id_execution_id_document_id_unique" UNIQUE("tenant_id","execution_id","document_id")
);
--> statement-breakpoint
CREATE TABLE "document_management"."workflow" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"step" "document_management"."workflow_step" NOT NULL,
	"state" "document_management"."workflow_state" NOT NULL,
	"fail_reason" "document_management"."workflow_fail_reason",
	"complete_timestamp" timestamp with time zone,
	"complete_user_id" uuid,
	"revision" integer NOT NULL,
	"revision_timestamp" timestamp with time zone NOT NULL,
	"create_timestamp" timestamp with time zone NOT NULL,
	"delete_timestamp" timestamp with time zone,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "workflow_tenant_id_id_unique" UNIQUE("tenant_id","id")
);
--> statement-breakpoint
ALTER TABLE "document_management"."document" ADD CONSTRAINT "document_type_id_type_id_fk" FOREIGN KEY ("type_id") REFERENCES "document_management"."type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."assignment_scope" ADD CONSTRAINT "assignment_scope_task_id_assignment_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "document_management"."assignment_task"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."assignment_scope" ADD CONSTRAINT "assignment_scope_collection_id_collection_id_fk" FOREIGN KEY ("collection_id") REFERENCES "document_management"."collection"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."assignment_scope" ADD CONSTRAINT "assignment_scope_tenantId_collectionId_fkey" FOREIGN KEY ("tenant_id","collection_id") REFERENCES "document_management"."collection"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."assignment_scope" ADD CONSTRAINT "assignment_scope_tenantId_taskId_fkey" FOREIGN KEY ("tenant_id","task_id") REFERENCES "document_management"."assignment_task"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."assignment_task" ADD CONSTRAINT "assignment_task_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "document_management"."document"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."assignment_task" ADD CONSTRAINT "assignment_task_tenantId_documentId_fkey" FOREIGN KEY ("tenant_id","document_id") REFERENCES "document_management"."document"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."category" ADD CONSTRAINT "category_parent_id_category_id_fk" FOREIGN KEY ("parent_id") REFERENCES "document_management"."category"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."collection" ADD CONSTRAINT "collection_parent_id_collection_id_fk" FOREIGN KEY ("parent_id") REFERENCES "document_management"."collection"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."collection_assignment" ADD CONSTRAINT "collection_assignment_collection_id_collection_id_fk" FOREIGN KEY ("collection_id") REFERENCES "document_management"."collection"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."collection_assignment" ADD CONSTRAINT "collection_assignment_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "document_management"."document"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."collection_assignment" ADD CONSTRAINT "collection_assignment_tenantId_documentId_fkey" FOREIGN KEY ("tenant_id","document_id") REFERENCES "document_management"."document"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."collection_assignment" ADD CONSTRAINT "collection_assignment_tenantId_collectionId_fkey" FOREIGN KEY ("tenant_id","collection_id") REFERENCES "document_management"."collection"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."property_value" ADD CONSTRAINT "property_value_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "document_management"."document"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."property_value" ADD CONSTRAINT "property_value_property_id_property_id_fk" FOREIGN KEY ("property_id") REFERENCES "document_management"."property"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."property_value" ADD CONSTRAINT "property_value_tenantId_documentId_fkey" FOREIGN KEY ("tenant_id","document_id") REFERENCES "document_management"."document"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."request" ADD CONSTRAINT "request_type_id_type_id_fk" FOREIGN KEY ("type_id") REFERENCES "document_management"."type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."request" ADD CONSTRAINT "request_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "document_management"."document"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."request" ADD CONSTRAINT "request_tenantId_documentId_fkey" FOREIGN KEY ("tenant_id","document_id") REFERENCES "document_management"."document"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."request_collection_assignment" ADD CONSTRAINT "request_collection_assignment_request_id_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "document_management"."request"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."request_collection_assignment" ADD CONSTRAINT "request_collection_assignment_collection_id_collection_id_fk" FOREIGN KEY ("collection_id") REFERENCES "document_management"."collection"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."request_collection_assignment" ADD CONSTRAINT "request_collection_assignment_tenantId_collectionId_fkey" FOREIGN KEY ("tenant_id","collection_id") REFERENCES "document_management"."collection"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."request_collection_assignment" ADD CONSTRAINT "request_collection_assignment_tenantId_requestId_fkey" FOREIGN KEY ("tenant_id","request_id") REFERENCES "document_management"."request"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."request_template" ADD CONSTRAINT "request_template_requests_template_id_requests_template_id_fk" FOREIGN KEY ("requests_template_id") REFERENCES "document_management"."requests_template"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."request_template" ADD CONSTRAINT "request_template_type_id_type_id_fk" FOREIGN KEY ("type_id") REFERENCES "document_management"."type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."tag_assignment" ADD CONSTRAINT "tag_assignment_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "document_management"."document"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."tag_assignment" ADD CONSTRAINT "tag_assignment_tag_id_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "document_management"."tag"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."tag_assignment" ADD CONSTRAINT "tag_assignment_tenantId_documentId_fkey" FOREIGN KEY ("tenant_id","document_id") REFERENCES "document_management"."document"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."type" ADD CONSTRAINT "type_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "document_management"."category"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."type_property" ADD CONSTRAINT "type_property_type_id_type_id_fk" FOREIGN KEY ("type_id") REFERENCES "document_management"."type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."type_property" ADD CONSTRAINT "type_property_property_id_property_id_fk" FOREIGN KEY ("property_id") REFERENCES "document_management"."property"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."document_type_validation" ADD CONSTRAINT "document_type_validation_type_id_type_id_fk" FOREIGN KEY ("type_id") REFERENCES "document_management"."type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."document_type_validation" ADD CONSTRAINT "document_type_validation_validation_id_validation_definition_id_fk" FOREIGN KEY ("validation_id") REFERENCES "document_management"."validation_definition"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."validation_execution" ADD CONSTRAINT "validation_execution_workflow_id_workflow_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "document_management"."workflow"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."validation_execution" ADD CONSTRAINT "validation_execution_definition_id_validation_definition_id_fk" FOREIGN KEY ("definition_id") REFERENCES "document_management"."validation_definition"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."validation_execution" ADD CONSTRAINT "validation_execution_tenantId_workflowId_fkey" FOREIGN KEY ("tenant_id","workflow_id") REFERENCES "document_management"."workflow"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."validation_execution_related_document" ADD CONSTRAINT "validation_execution_related_document_execution_id_validation_execution_id_fk" FOREIGN KEY ("execution_id") REFERENCES "document_management"."validation_execution"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."validation_execution_related_document" ADD CONSTRAINT "validation_execution_related_document_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "document_management"."document"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."validation_execution_related_document" ADD CONSTRAINT "validation_execution_related_document_tenantId_documentId_fkey" FOREIGN KEY ("tenant_id","document_id") REFERENCES "document_management"."document"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."validation_execution_related_document" ADD CONSTRAINT "validation_execution_related_document_tenantId_executionId_fkey" FOREIGN KEY ("tenant_id","execution_id") REFERENCES "document_management"."validation_execution"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."workflow" ADD CONSTRAINT "workflow_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "document_management"."document"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_management"."workflow" ADD CONSTRAINT "workflow_tenantId_documentId_fkey" FOREIGN KEY ("tenant_id","document_id") REFERENCES "document_management"."document"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "collection_assignment_collection_id_idx" ON "document_management"."collection_assignment" USING btree ("collection_id");--> statement-breakpoint
CREATE INDEX "request_type_id_idx" ON "document_management"."request" USING btree ("type_id");--> statement-breakpoint
CREATE INDEX "request_state_idx" ON "document_management"."request" USING btree ("state");--> statement-breakpoint
CREATE INDEX "request_collection_assignment_collection_id_idx" ON "document_management"."request_collection_assignment" USING btree ("collection_id");--> statement-breakpoint
CREATE INDEX "document_type_validation_type_id_idx" ON "document_management"."document_type_validation" USING btree ("type_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workflow_document_id_idx" ON "document_management"."workflow" USING btree ("document_id") WHERE "document_management"."workflow"."state" <> 'completed';