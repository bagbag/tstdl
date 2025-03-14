ALTER TABLE "queue"."job" DROP CONSTRAINT "job_queue_tag_unique";--> statement-breakpoint
CREATE INDEX "job_queue_tag_idx" ON "queue"."job" USING btree ("queue","tag");