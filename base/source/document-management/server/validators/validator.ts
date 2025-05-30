import type { Document, DocumentCategory, DocumentCollection, DocumentProperty, DocumentPropertyValue, DocumentType, DocumentValidationDefinition, DocumentValidationExecution, DocumentValidationResultStatus } from '#/document-management/models/index.js';

export type DocumentValidationExecutorContextDocumentData = {
  document: Document,
  collections: DocumentCollection[],
  category: DocumentCategory,
  type: DocumentType,
  properties: DocumentProperty[],
  propertyValues: DocumentPropertyValue[],
};

export type DocumentValidationExecutorContext = {
  execution: DocumentValidationExecution,
  definition: DocumentValidationDefinition,
} & DocumentValidationExecutorContextDocumentData;

export type DocumentValidationExecutorResult = { status: DocumentValidationResultStatus, message?: string | null };

export abstract class DocumentValidationExecutor {
  abstract readonly identifier: string;

  abstract execute(execution: DocumentValidationExecutorContext): Promise<DocumentValidationExecutorResult>;
}
