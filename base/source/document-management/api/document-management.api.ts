import { compileClient, defineApi } from '#/api/index.js';
import { ReplaceClass } from '#/injector/decorators.js';
import { boolean, literal, nullable, object, optional, string } from '#/schema/index.js';
import { megabyte } from '#/utils/units.js';
import { CategoryAndTypesView, Document, DocumentCategory, DocumentCollection, DocumentManagementData, DocumentRequest, DocumentRequestFile, DocumentRequestTemplate, DocumentRequestsTemplate, DocumentRequestsTemplateData, DocumentType, addOrArchiveDocumentToOrFromCollectionParametersSchema, applyDocumentRequestsTemplateParametersSchema, approveDocumentRequestFileParametersSchema, createCollectionParametersSchema, createDocumentCategoryParametersSchema, createDocumentParametersSchema, createDocumentRequestFileParametersSchema, createDocumentRequestParametersSchema, createDocumentRequestTemplateParametersSchema, createDocumentRequestsTemplateParametersSchema, createDocumentTypeParametersSchema, deleteDocumentRequestFileParametersSchema, deleteDocumentRequestParametersSchema, deleteDocumentRequestTemplateParametersSchema, deleteDocumentRequestsTemplateParametersSchema, loadDataParametersSchema, rejectDocumentRequestFileParametersSchema, updateDocumentParametersSchema, updateDocumentRequestFileParametersSchema, updateDocumentRequestParametersSchema, updateDocumentRequestTemplateParametersSchema, updateDocumentRequestsTemplateParametersSchema } from '../models/index.js';

export type DocumentManagementApiDefinition = typeof documentManagementApiDefinition;

export const documentManagementApiDefinition = defineApi({
  resource: 'document-management',
  endpoints: {
    loadData: {
      resource: 'data',
      method: 'GET',
      parameters: loadDataParametersSchema,
      result: DocumentManagementData,
      credentials: true
    },
    loadDocumentRequestsTemplateData: {
      resource: 'views/document-requests-template-data',
      method: 'GET',
      result: DocumentRequestsTemplateData,
      credentials: true
    },
    loadAvailableCategoriesAndTypes: {
      resource: 'views/categories-and-types',
      method: 'GET',
      result: CategoryAndTypesView,
      credentials: true
    },
    loadFileContent: {
      resource: 'files/:id/content',
      method: 'GET',
      parameters: object({
        id: string(),
        title: nullable(string()),
        download: optional(boolean({ coerce: true }))
      }),
      result: Uint8Array,
      credentials: true
    },
    getFileContentUrl: {
      resource: 'files/:id/content/url',
      method: 'GET',
      parameters: object({
        id: string(),
        title: nullable(string()),
        download: optional(boolean({ coerce: true }))
      }),
      result: string(),
      credentials: true
    },
    createCategory: {
      resource: 'categories',
      method: 'POST',
      parameters: createDocumentCategoryParametersSchema,
      result: DocumentCategory,
      credentials: true
    },
    createType: {
      resource: 'types',
      method: 'POST',
      parameters: createDocumentTypeParametersSchema,
      result: DocumentType,
      credentials: true
    },
    createCollection: {
      resource: 'collections',
      method: 'POST',
      parameters: createCollectionParametersSchema,
      result: DocumentCollection,
      credentials: true
    },
    createDocument: {
      resource: 'documents',
      method: 'POST',
      parameters: createDocumentParametersSchema,
      body: Uint8Array,
      maxBytes: 50 * megabyte,
      result: Document,
      credentials: true
    },
    createDocumentRequestsTemplate: {
      resource: 'document-requests-template',
      method: 'POST',
      parameters: createDocumentRequestsTemplateParametersSchema,
      result: DocumentRequestsTemplate,
      credentials: true
    },
    updateDocumentRequestsTemplate: {
      resource: 'document-requests-template/:id',
      method: 'PATCH',
      parameters: updateDocumentRequestsTemplateParametersSchema,
      result: DocumentRequestsTemplate,
      credentials: true
    },
    applyDocumentRequestsTemplate: {
      resource: 'document-requests-template/:id',
      method: 'POST',
      parameters: applyDocumentRequestsTemplateParametersSchema,
      result: literal('ok'),
      credentials: true
    },
    deleteDocumentRequestsTemplate: {
      resource: 'document-requests-template/:id',
      method: 'DELETE',
      parameters: deleteDocumentRequestsTemplateParametersSchema,
      result: literal('ok'),
      credentials: true
    },
    createDocumentRequestTemplate: {
      resource: 'document-request-template',
      method: 'POST',
      parameters: createDocumentRequestTemplateParametersSchema,
      result: DocumentRequestTemplate,
      credentials: true
    },
    updateDocumentRequestTemplate: {
      resource: 'document-request-template/:id',
      method: 'PATCH',
      parameters: updateDocumentRequestTemplateParametersSchema,
      result: DocumentRequestTemplate,
      credentials: true
    },
    deleteDocumentRequestTemplate: {
      resource: 'document-request-template/:id',
      method: 'DELETE',
      parameters: deleteDocumentRequestTemplateParametersSchema,
      result: literal('ok'),
      credentials: true
    },
    createDocumentRequestFile: {
      resource: 'requests/:requestId/files',
      method: 'POST',
      parameters: createDocumentRequestFileParametersSchema,
      body: Uint8Array,
      result: DocumentRequestFile,
      maxBytes: 50 * megabyte,
      credentials: true
    },
    approveDocumentRequestFile: {
      resource: 'request-files/:id/create-document',
      method: 'POST',
      parameters: approveDocumentRequestFileParametersSchema,
      result: Document,
      credentials: true
    },
    rejectDocumentRequestFile: {
      resource: 'request-files/:id/reject',
      method: 'POST',
      parameters: rejectDocumentRequestFileParametersSchema,
      result: literal('ok'),
      credentials: true
    },
    updateDocumentRequestFile: {
      resource: 'request-files/:id',
      method: 'PATCH',
      parameters: updateDocumentRequestFileParametersSchema,
      result: DocumentRequestFile,
      credentials: true
    },
    deleteDocumentRequestFile: {
      resource: 'request-files/:id',
      method: 'DELETE',
      parameters: deleteDocumentRequestFileParametersSchema,
      result: literal('ok'),
      credentials: true
    },
    createDocumentRequest: {
      resource: 'requests',
      method: 'POST',
      parameters: createDocumentRequestParametersSchema,
      result: DocumentRequest,
      credentials: true
    },
    updateDocumentRequest: {
      resource: 'requests/:id',
      method: 'PATCH',
      parameters: updateDocumentRequestParametersSchema,
      result: literal('ok'),
      credentials: true
    },
    deleteDocumentRequest: {
      resource: 'requests/:id',
      method: 'DELETE',
      parameters: deleteDocumentRequestParametersSchema,
      result: literal('ok'),
      credentials: true
    },
    addDocumentToCollection: {
      resource: 'collections/:collectionId/documents/:documentId',
      method: 'PUT',
      parameters: addOrArchiveDocumentToOrFromCollectionParametersSchema,
      result: literal('ok'),
      credentials: true
    },
    archiveDocument: {
      resource: 'collections/:collectionId/documents/:documentId',
      method: 'DELETE',
      parameters: addOrArchiveDocumentToOrFromCollectionParametersSchema,
      result: literal('ok'),
      credentials: true
    },
    updateDocument: {
      resource: 'documents/:id',
      method: 'PATCH',
      parameters: updateDocumentParametersSchema,
      result: literal('ok'),
      credentials: true
    }
  }
});

const _DocumentManagementApi = compileClient(documentManagementApiDefinition);

@ReplaceClass(_DocumentManagementApi)
export class DocumentManagementApi extends _DocumentManagementApi { }
