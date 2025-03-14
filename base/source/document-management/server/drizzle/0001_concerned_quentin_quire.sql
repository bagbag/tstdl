ALTER TABLE "document_management"."document" ADD COLUMN "validated" boolean NOT NULL DEFAULT true;
ALTER TABLE "document_management"."document" ALTER COLUMN "validated" DROP DEFAULT;
