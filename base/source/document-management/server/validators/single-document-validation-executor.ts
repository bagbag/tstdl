import { DocumentValidationResultStatus } from '#/document-management/models/document-validation-execution.model.js';
import { boolean, object, optional, string, type SchemaOutput } from '#/schema/index.js';
import { AiValidationDifficulty, AiValidationExecutor } from './ai-validation-executor.js';
import type { DocumentValidationExecutorResult } from './validator.js';

export class SingleDocumentValidationExecutor extends AiValidationExecutor<{ hasMultipleDocuments: boolean; reason?: string; }> {
  override readonly identifier = 'single-document';
  override readonly difficulty = AiValidationDifficulty.MediumLow;

  override schema = object({
    hasMultipleDocuments: boolean(),
    reason: optional(string()),
  });

  override getPrompt(): string {
    return 'Überprüfe ob das Dokument aus mehreren Dokumenten zusammengesetzt ist. Falls ja, begründe in wenigen Worten. Antworte auf deutsch.';
  }

  override getResult(output: SchemaOutput<typeof this['schema']>): DocumentValidationExecutorResult {
    if (output.hasMultipleDocuments) {
      return { status: DocumentValidationResultStatus.Warning, message: output.reason ?? null };
    }

    return { status: DocumentValidationResultStatus.Passed };
  }
}
