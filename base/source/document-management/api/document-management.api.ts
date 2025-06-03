import { compileClient } from '#/api/client/index.js';
import { defineApi } from '#/api/index.js';
import { ReplaceClass } from '#/injector/decorators.js';
import { array, boolean, literal, number, object, optional, string } from '#/schema/index.js';
import { ServerSentEvents } from '#/sse/server-sent-events.js';
import { policy } from '../authorization/index.js';
import { Document, DocumentCategory, DocumentRequest, DocumentRequestsTemplate, DocumentRequestTemplate, DocumentType } from '../models/index.js';
import { addOrArchiveDocumentToOrFromCollectionParametersSchema, applyDocumentRequestsTemplateParametersSchema, createDocumentCategoryParametersSchema, createDocumentParametersSchema, createDocumentRequestParametersSchema, createDocumentRequestsTemplateParametersSchema, createDocumentRequestTemplateParametersSchema, createDocumentTypeParametersSchema, deleteDocumentRequestParametersSchema, deleteDocumentRequestsTemplateParametersSchema, deleteDocumentRequestTemplateParametersSchema, DocumentCategoryView, DocumentManagementData, DocumentRequestsTemplateData, loadDataParametersSchema, updateDocumentParametersSchema, updateDocumentRequestParametersSchema, updateDocumentRequestsTemplateParametersSchema, updateDocumentRequestTemplateParametersSchema } from '../service-models/index.js';

export type DocumentManagementApiDefinition = typeof documentManagementApiDefinition;

export const documentManagementApiDefinition = defineApi({
  resource: 'document-management',
  endpoints: {
    loadData: {
      resource: 'data',
      method: 'GET',
      parameters: loadDataParametersSchema,
      result: DocumentManagementData,
      credentials: true,
    },
    loadDataStream: {
      resource: 'data/stream',
      method: 'GET',
      parameters: loadDataParametersSchema,
      result: ServerSentEvents,
      credentials: true,
    },
    loadDocumentRequestsTemplateData: {
      resource: 'views/document-requests-template-data',
      method: 'GET',
      result: DocumentRequestsTemplateData,
      credentials: true,
    },
    loadAvailableCategories: {
      resource: 'views/categories',
      method: 'GET',
      result: array(DocumentCategoryView),
      credentials: true,
    },
    loadContent: {
      resource: 'documents/:id/content',
      method: 'GET',
      parameters: object({
        id: string(),
        download: optional(boolean({ coerce: true })),
      }),
      result: Uint8Array,
      credentials: true,
    },
    getContentUrl: {
      resource: 'documents/:id/content/url',
      method: 'GET',
      parameters: object({
        id: string(),
        download: optional(boolean({ coerce: true })),
      }),
      result: string(),
      credentials: true,
    },
    loadPreview: {
      resource: 'documents/:id/preview/:page',
      method: 'GET',
      parameters: object({
        id: string(),
        page: number({ coerce: true }),
      }),
      result: Uint8Array,
      credentials: true,
    },
    getPreviewUrl: {
      resource: 'documents/:id/preview/:page/url',
      method: 'GET',
      parameters: object({
        id: string(),
        page: number({ coerce: true }),
      }),
      result: string(),
      credentials: true,
    },
    createCategory: {
      resource: 'categories',
      method: 'POST',
      parameters: createDocumentCategoryParametersSchema,
      result: DocumentCategory,
      credentials: true,
    },
    createType: {
      resource: 'types',
      method: 'POST',
      parameters: createDocumentTypeParametersSchema,
      result: DocumentType,
      credentials: true,
    },
    initiateDocumentUpload: {
      resource: 'document-uploads',
      method: 'POST',
      parameters: object({
        contentLength: number(),
      }),
      result: object({
        uploadId: string(),
        uploadUrl: string(),
      }),
      credentials: true,
    },
    createDocument: {
      resource: 'documents',
      method: 'POST',
      parameters: createDocumentParametersSchema,
      result: Document,
      credentials: true,
    },
    createDocumentRequestsTemplate: {
      resource: 'document-requests-template',
      method: 'POST',
      parameters: createDocumentRequestsTemplateParametersSchema,
      result: DocumentRequestsTemplate,
      credentials: true,
    },
    updateDocumentRequestsTemplate: {
      resource: 'document-requests-template/:id',
      method: 'PATCH',
      parameters: updateDocumentRequestsTemplateParametersSchema,
      result: DocumentRequestsTemplate,
      credentials: true,
    },
    applyDocumentRequestsTemplate: {
      resource: 'document-requests-template/:id',
      method: 'POST',
      parameters: applyDocumentRequestsTemplateParametersSchema,
      result: literal('ok'),
      credentials: true,
    },
    deleteDocumentRequestsTemplate: {
      resource: 'document-requests-template/:id',
      method: 'DELETE',
      parameters: deleteDocumentRequestsTemplateParametersSchema,
      result: literal('ok'),
      credentials: true,
    },
    createDocumentRequestTemplate: {
      resource: 'document-request-template',
      method: 'POST',
      parameters: createDocumentRequestTemplateParametersSchema,
      result: DocumentRequestTemplate,
      credentials: true,
    },
    updateDocumentRequestTemplate: {
      resource: 'document-request-template/:id',
      method: 'PATCH',
      parameters: updateDocumentRequestTemplateParametersSchema,
      result: DocumentRequestTemplate,
      credentials: true,
    },
    deleteDocumentRequestTemplate: {
      resource: 'document-request-template/:id',
      method: 'DELETE',
      parameters: deleteDocumentRequestTemplateParametersSchema,
      result: literal('ok'),
      credentials: true,
    },
    createDocumentRequest: {
      resource: 'requests',
      method: 'POST',
      parameters: createDocumentRequestParametersSchema,
      result: DocumentRequest,
      credentials: true,
    },
    updateDocumentRequest: {
      resource: 'requests/:id',
      method: 'PATCH',
      parameters: updateDocumentRequestParametersSchema,
      result: literal('ok'),
      credentials: true,
    },
    deleteDocumentRequest: {
      resource: 'requests/:id',
      method: 'DELETE',
      parameters: deleteDocumentRequestParametersSchema,
      result: literal('ok'),
      credentials: true,
    },
    assignDocumentToCollection: {
      resource: 'collections/:collectionId/documents/:documentId',
      method: 'PUT',
      parameters: addOrArchiveDocumentToOrFromCollectionParametersSchema,
      result: literal('ok'),
      credentials: true,
    },
    archiveDocumentInCollection: {
      resource: 'collections/:collectionId/documents/:documentId',
      method: 'DELETE',
      parameters: addOrArchiveDocumentToOrFromCollectionParametersSchema,
      result: literal('ok'),
      credentials: true,
    },
    updateDocument: {
      resource: 'documents/:id',
      method: 'PATCH',
      parameters: updateDocumentParametersSchema,
      result: literal('ok'),
      credentials: true,
    },
    proceedDocumentWorkflow: {
      resource: 'documents/:id/proceed-workflow',
      method: 'POST',
      parameters: object({
        id: string(),
      }),
      result: literal('ok'),
      credentials: true,
    },
    testAuthorization: {
      resource: 'authorization/test',
      method: 'POST',
      parameters: policy,
      result: boolean(),
      credentials: true,
    },
  },
});

const _DocumentManagementApi = compileClient(documentManagementApiDefinition);

@ReplaceClass(_DocumentManagementApi)
export class DocumentManagementApi extends _DocumentManagementApi { }
