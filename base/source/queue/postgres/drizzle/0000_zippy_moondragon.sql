CREATE TABLE "queue"."job" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"queue" text NOT NULL,
	"tag" text,
	"priority" integer NOT NULL,
	"enqueue_timestamp" timestamp with time zone NOT NULL,
	"tries" integer NOT NULL,
	"last_dequeue_timestamp" timestamp with time zone,
	"data" jsonb NOT NULL,
	CONSTRAINT "job_queue_tag_unique" UNIQUE("queue","tag")
);
