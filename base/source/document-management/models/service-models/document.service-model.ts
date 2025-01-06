import { EntityMetadata } from '#/orm/entity.js';
import { array, assign, nullable, object, omit, oneOrMany, optional, partial, pick, record, string, unknown, type SchemaOutput } from '#/schema/index.js';

import { DocumentCategory } from '../document-category.model.js';
import { DocumentCollectionDocument } from '../document-collection-document.model.js';
import { DocumentFile } from '../document-file.model.js';
import { DocumentPropertyValueBase } from '../document-property-value.model.js';
import { DocumentProperty } from '../document-property.model.js';
import { DocumentRequestFile } from '../document-request-file.model.js';
import { DocumentRequestTemplate } from '../document-request-template.js';
import { DocumentRequest } from '../document-request.model.js';
import { DocumentRequestsTemplate } from '../document-requests-template.js';
import { DocumentTypeProperty } from '../document-type-property.model.js';
import { DocumentType } from '../document-type.model.js';
import { Document } from '../document.model.js';

export const metadataParameterSchema = optional(partial(pick(EntityMetadata, 'attributes')));
export const metadataParameterObjectSchema = object({ metadata: metadataParameterSchema });

export const setDocumentPropertyParametersSchema = assign(
  pick(DocumentPropertyValueBase, ['documentId', 'propertyId']),
  object({ value: unknown() }),
  metadataParameterObjectSchema
);

export const createDocumentParametersSchema = assign(
  pick(Document, ['typeId', 'addition', 'date', 'expiration']),
  pick(DocumentFile, ['originalFileName']),
  object({
    collectionIds: oneOrMany(string()),
    properties: optional(array(omit(setDocumentPropertyParametersSchema, ['documentId'])))
  }),
  metadataParameterObjectSchema
);

export const updateDocumentParametersSchema = assign(
  pick(Document, ['id']),
  partial(omit(Document, ['id', 'metadata'])),
  object({ properties: optional(array(omit(setDocumentPropertyParametersSchema, ['documentId']))) }),
  metadataParameterObjectSchema
);

export const createDocumentRequestsTemplateParametersSchema = assign(
  pick(DocumentRequestsTemplate, ['label', 'description']),
  metadataParameterObjectSchema
);

export const updateDocumentRequestsTemplateParametersSchema = assign(
  pick(DocumentRequestsTemplate, ['id']),
  partial(omit(DocumentRequestsTemplate, ['id', 'metadata'])),
  metadataParameterObjectSchema
);

export const applyDocumentRequestsTemplateParametersSchema = assign(
  pick(DocumentRequestsTemplate, ['id']),
  object({ collectionIds: array(string()) }),
  metadataParameterObjectSchema
);

export const deleteDocumentRequestsTemplateParametersSchema = assign(
  pick(DocumentRequestsTemplate, ['id']),
  metadataParameterObjectSchema
);

export const createDocumentRequestTemplateParametersSchema = assign(
  pick(DocumentRequestTemplate, ['requestsTemplateId', 'typeId', 'requiredFilesCount', 'comment']),
  metadataParameterObjectSchema
);

export const updateDocumentRequestTemplateParametersSchema = assign(
  pick(DocumentRequestTemplate, ['id']),
  partial(omit(DocumentRequestTemplate, ['id', 'requestsTemplateId', 'metadata'])),
  metadataParameterObjectSchema
);

export const deleteDocumentRequestTemplateParametersSchema = assign(
  pick(DocumentRequestTemplate, ['id']),
  metadataParameterObjectSchema
);

export const createDocumentRequestParametersSchema = assign(
  pick(DocumentRequest, ['typeId', 'requiredFilesCount', 'comment']),
  object({ collectionIds: array(string()) }),
  metadataParameterObjectSchema
);

export const updateDocumentRequestParametersSchema = assign(
  pick(DocumentRequest, ['id']),
  partial(omit(DocumentRequest, ['id', 'metadata'])),
  metadataParameterObjectSchema
);

export const deleteDocumentRequestParametersSchema = assign(
  pick(DocumentRequest, ['id']),
  metadataParameterObjectSchema
);

export const updateDocumentRequestFileParametersSchema = assign(
  pick(DocumentRequestFile, ['id']),
  partial(omit(DocumentRequestFile, ['id', 'requestId', 'fileId', 'createdDocumentId', 'approval', 'metadata'])),
  metadataParameterObjectSchema
);

export const deleteDocumentRequestFileParametersSchema = assign(
  pick(DocumentRequestFile, ['id']),
  metadataParameterObjectSchema
);

export const loadDataCollectionMetadataParametersSchema = object({ name: optional(nullable(string())), group: optional(nullable(string())) });
export const loadDataCollectionsMetadataParametersSchema = record(string(), loadDataCollectionMetadataParametersSchema);
export const loadDataParametersSchema = object({ collectionIds: oneOrMany(string()), collectionsMetadata: loadDataCollectionsMetadataParametersSchema });
export const createCollectionParametersSchema = metadataParameterObjectSchema;
export const setDocumentPropertiesParametersSchema = array(setDocumentPropertyParametersSchema);
export const createDocumentCategoryParametersSchema = assign(pick(DocumentCategory, ['label']), metadataParameterObjectSchema);
export const createDocumentTypeParametersSchema = assign(pick(DocumentType, ['categoryId', 'group', 'label']), metadataParameterObjectSchema);
export const createDocumentRequestFileParametersSchema = assign(object({ requestId: string() }), pick(DocumentRequestFile, ['addition']), pick(DocumentFile, ['originalFileName']), metadataParameterObjectSchema);
export const approveDocumentRequestFileParametersSchema = assign(pick(DocumentRequestFile, ['id', 'approvalComment']), object({
  documentMetadata: metadataParameterSchema,
  requestFileMetadata: metadataParameterSchema
}));
export const rejectDocumentRequestFileParametersSchema = assign(pick(DocumentRequestFile, ['id', 'approvalComment']), metadataParameterObjectSchema);
export const createDocumentPropertyParametersSchema = assign(pick(DocumentProperty, ['label', 'dataType']), metadataParameterObjectSchema);
export const assignPropertyToTypeParametersSchema = assign(pick(DocumentTypeProperty, ['typeId', 'propertyId']), metadataParameterObjectSchema);
export const addOrArchiveDocumentToOrFromCollectionParametersSchema = assign(pick(DocumentCollectionDocument, ['collectionId', 'documentId']), metadataParameterObjectSchema);

export type MetadataParameter = SchemaOutput<typeof metadataParameterObjectSchema>;
export type LoadDataCollectionMetadataParameters = SchemaOutput<typeof loadDataCollectionMetadataParametersSchema>;
export type LoadDataCollectionsMetadataParameters = SchemaOutput<typeof loadDataCollectionsMetadataParametersSchema>;
export type LoadDataParameters = SchemaOutput<typeof loadDataParametersSchema>;
export type CreateCollectionParameters = SchemaOutput<typeof createCollectionParametersSchema>;
export type CreateDocumentParameters = SchemaOutput<typeof createDocumentParametersSchema>;
export type ApproveDocumentRequestFileParameters = SchemaOutput<typeof approveDocumentRequestFileParametersSchema>;
export type RejectDocumentRequestFileParameters = SchemaOutput<typeof rejectDocumentRequestFileParametersSchema>;
export type CreateDocumentCategoryParameters = SchemaOutput<typeof createDocumentCategoryParametersSchema>;
export type CreateDocumentTypeParameters = SchemaOutput<typeof createDocumentTypeParametersSchema>;
export type CreateDocumentRequestFileParameters = SchemaOutput<typeof createDocumentRequestFileParametersSchema>;
export type CreateDocumentRequestParameters = SchemaOutput<typeof createDocumentRequestParametersSchema>;
export type CreateDocumentRequestsTemplateParameters = SchemaOutput<typeof createDocumentRequestsTemplateParametersSchema>;
export type UpdateDocumentRequestsTemplateParameters = SchemaOutput<typeof updateDocumentRequestsTemplateParametersSchema>;
export type ApplyDocumentRequestsTemplateParameters = SchemaOutput<typeof applyDocumentRequestsTemplateParametersSchema>;
export type DeleteDocumentRequestsTemplateParameters = SchemaOutput<typeof deleteDocumentRequestsTemplateParametersSchema>;
export type CreateDocumentRequestTemplateParameters = SchemaOutput<typeof createDocumentRequestTemplateParametersSchema>;
export type UpdateDocumentRequestTemplateParameters = SchemaOutput<typeof updateDocumentRequestTemplateParametersSchema>;
export type DeleteDocumentRequestTemplateParameters = SchemaOutput<typeof deleteDocumentRequestTemplateParametersSchema>;
export type CreateDocumentPropertyParameters = SchemaOutput<typeof createDocumentPropertyParametersSchema>;
export type AssignPropertyToTypeParameters = SchemaOutput<typeof assignPropertyToTypeParametersSchema>;
export type SetDocumentPropertyParameters = SchemaOutput<typeof setDocumentPropertyParametersSchema>;
export type SetDocumentPropertiesParameters = SchemaOutput<typeof setDocumentPropertiesParametersSchema>;
export type AddOrArchiveDocumentToOrFromCollectionParameters = SchemaOutput<typeof addOrArchiveDocumentToOrFromCollectionParametersSchema>;
export type UpdateDocumentParameters = SchemaOutput<typeof updateDocumentParametersSchema>;
export type UpdateDocumentRequestParameters = SchemaOutput<typeof updateDocumentRequestParametersSchema>;
export type DeleteDocumentRequestParameters = SchemaOutput<typeof deleteDocumentRequestParametersSchema>;
export type UpdateDocumentRequestFileParameters = SchemaOutput<typeof updateDocumentRequestFileParametersSchema>;
export type DeleteDocumentRequestFileParameters = SchemaOutput<typeof deleteDocumentRequestFileParametersSchema>;
