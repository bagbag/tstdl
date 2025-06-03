import { literal, object, string, union, type SchemaOutput } from '#/schema/index.js';

export const policy = union(
  object({ type: literal('canReadCollection'), collectionId: string() }),
  object({ type: literal('canCreateDocuments'), collectionId: string() }),
  object({ type: literal('canDeleteDocuments'), collectionId: string() }),
  object({ type: literal('canAssignDocuments'), collectionId: string() }),
  object({ type: literal('canManageRequests'), collectionId: string() }),
  object({ type: literal('canUpdateDocument'), documentId: string() }),
  object({ type: literal('canApproveDocument'), documentId: string() }),
  object({ type: literal('canRejectDocument'), documentId: string() }),
  object({ type: literal('canProgressDocumentWorkflow'), documentId: string() }),
  object({ type: literal('canManageCategoriesAndTypes') }),
  object({ type: literal('canReadDocumentRequestsTemplates') }),
  object({ type: literal('canManageDocumentRequestsTemplates') }),
  object({ type: literal('canManageValidationDefinitions') }),
);

export type Policy = SchemaOutput<typeof policy>;
