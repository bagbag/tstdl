import { EntityMetadata } from '#/orm/entity.js';
import { array, assign, boolean, enumeration, never, nullable, number, object, omit, oneOrMany, optional, partial, pick, string, union, type SchemaOutput } from '#/schema/index.js';
import { Document, DocumentAssignmentTarget, DocumentCategory, DocumentCollection, DocumentCollectionAssignment, DocumentProperty, DocumentPropertyValue, DocumentRequest, DocumentRequestsTemplate, DocumentRequestTemplate, DocumentType, DocumentTypeProperty } from '../models/index.js';

export const metadataParameterSchema = optional(partial(pick(EntityMetadata, 'attributes')));
export const metadataParameterObjectSchema = object({ metadata: metadataParameterSchema });

export const setDocumentPropertyParametersSchema = assign(
  pick(DocumentPropertyValue, ['propertyId']),
  object({ value: union(string(), number(), boolean(), nullable(never())) }),
  metadataParameterObjectSchema,
);

export const updateDocumentCollectionsParametersSchema = object({
  assign: optional(array(string())),
  archive: optional(array(string())),
});

export const createDocumentParametersSchema = assign(
  partial(pick(Document, ['typeId', 'title', 'subtitle', 'date', 'summary', 'approval', 'comment', 'originalFileName'])),
  object({
    uploadId: string(),
    assignment: union(
      object({ collections: oneOrMany(string(), { minimum: 1 }) }),
      object({ request: string() }),
      object({
        automatic: object({
          /** collection ids to assign in */
          scope: oneOrMany(string(), { minimum: 1 }),
          target: enumeration(DocumentAssignmentTarget),
        }),
      }),
    ),
    tags: array(string()),
    properties: optional(array(setDocumentPropertyParametersSchema)),
  }),
  metadataParameterObjectSchema,
);

export const updateDocumentParametersSchema = assign(
  pick(Document, ['id']),
  partial(pick(Document, ['title', 'subtitle', 'date', 'comment', 'typeId'])),
  object({
    tags: optional(array(string())),
    properties: optional(array(setDocumentPropertyParametersSchema)),
    collections: optional(updateDocumentCollectionsParametersSchema),
  }),
  metadataParameterObjectSchema,
);

export const approveDocumentParametersSchema = assign(
  pick(Document, ['id', 'comment']),
  metadataParameterObjectSchema,
);

export const rejectDocumentParametersSchema = assign(
  pick(Document, ['id', 'comment']),
  metadataParameterObjectSchema,
);

export const createDocumentRequestsTemplateParametersSchema = assign(
  pick(DocumentRequestsTemplate, ['label', 'description']),
  metadataParameterObjectSchema,
);

export const updateDocumentRequestsTemplateParametersSchema = assign(
  pick(DocumentRequestsTemplate, ['id']),
  partial(omit(DocumentRequestsTemplate, ['id', 'metadata'])),
  metadataParameterObjectSchema,
);

export const applyDocumentRequestsTemplateParametersSchema = assign(
  pick(DocumentRequestsTemplate, ['id']),
  object({ collectionIds: array(string()) }),
  metadataParameterObjectSchema,
);

export const deleteDocumentRequestsTemplateParametersSchema = assign(
  pick(DocumentRequestsTemplate, ['id']),
  metadataParameterObjectSchema,
);

export const createDocumentRequestTemplateParametersSchema = assign(
  pick(DocumentRequestTemplate, ['requestsTemplateId', 'typeId', 'comment']),
  metadataParameterObjectSchema,
);

export const updateDocumentRequestTemplateParametersSchema = assign(
  pick(DocumentRequestTemplate, ['id']),
  partial(omit(DocumentRequestTemplate, ['id', 'requestsTemplateId', 'metadata'])),
  metadataParameterObjectSchema,
);

export const deleteDocumentRequestTemplateParametersSchema = assign(
  pick(DocumentRequestTemplate, ['id']),
  metadataParameterObjectSchema,
);

export const createDocumentRequestParametersSchema = assign(
  pick(DocumentRequest, ['typeId', 'comment']),
  object({ collectionIds: array(string()) }),
  metadataParameterObjectSchema,
);

export const updateDocumentRequestParametersSchema = assign(
  pick(DocumentRequest, ['id']),
  partial(pick(DocumentRequest, ['typeId', 'comment'])),
  metadataParameterObjectSchema,
);

export const deleteDocumentRequestParametersSchema = assign(
  pick(DocumentRequest, ['id']),
  metadataParameterObjectSchema,
);

export const loadDataParametersSchema = object({ collectionIds: oneOrMany(string()) });
export const createCollectionParametersSchema = assign(pick(DocumentCollection, ['parentId']), metadataParameterObjectSchema);
export const setDocumentPropertiesParametersSchema = object({
  documentId: string(),
  properties: array(setDocumentPropertyParametersSchema),
});
export const createDocumentCategoryParametersSchema = assign(pick(DocumentCategory, ['parentId', 'label']), metadataParameterObjectSchema);
export const createDocumentTypeParametersSchema = assign(pick(DocumentType, ['categoryId', 'label']), metadataParameterObjectSchema);
export const approveDocumentRequestParametersSchema = assign(pick(DocumentRequest, ['id', 'comment']), object({
  documentMetadata: metadataParameterSchema,
  requestMetadata: metadataParameterSchema,
}));
export const rejectDocumentRequestParametersSchema = assign(pick(DocumentRequest, ['id', 'comment']), metadataParameterObjectSchema);
export const createDocumentPropertyParametersSchema = assign(pick(DocumentProperty, ['label', 'dataType']), metadataParameterObjectSchema);
export const assignPropertyToTypeParametersSchema = assign(pick(DocumentTypeProperty, ['typeId', 'propertyId']), metadataParameterObjectSchema);
export const addOrArchiveDocumentToOrFromCollectionParametersSchema = assign(pick(DocumentCollectionAssignment, ['collectionId', 'documentId']), metadataParameterObjectSchema);

export type MetadataParameter = SchemaOutput<typeof metadataParameterObjectSchema>;
export type LoadDataParameters = SchemaOutput<typeof loadDataParametersSchema>;
export type CreateCollectionParameters = SchemaOutput<typeof createCollectionParametersSchema>;
export type CreateDocumentParameters = SchemaOutput<typeof createDocumentParametersSchema>;
export type ApproveDocumentRequestParameters = SchemaOutput<typeof approveDocumentRequestParametersSchema>;
export type RejectDocumentRequestParameters = SchemaOutput<typeof rejectDocumentRequestParametersSchema>;
export type CreateDocumentCategoryParameters = SchemaOutput<typeof createDocumentCategoryParametersSchema>;
export type CreateDocumentTypeParameters = SchemaOutput<typeof createDocumentTypeParametersSchema>;
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
export type UpdateDocumentCollectionsParameters = SchemaOutput<typeof updateDocumentCollectionsParametersSchema>;
export type SetDocumentPropertiesParameters = SchemaOutput<typeof setDocumentPropertiesParametersSchema>;
export type AddOrArchiveDocumentToOrFromCollectionParameters = SchemaOutput<typeof addOrArchiveDocumentToOrFromCollectionParametersSchema>;
export type UpdateDocumentParameters = SchemaOutput<typeof updateDocumentParametersSchema>;
export type UpdateDocumentRequestParameters = SchemaOutput<typeof updateDocumentRequestParametersSchema>;
export type DeleteDocumentRequestParameters = SchemaOutput<typeof deleteDocumentRequestParametersSchema>;
