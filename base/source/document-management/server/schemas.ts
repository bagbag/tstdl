import { databaseSchema } from '#/orm/server/database-schema.js';
import { DocumentCategory } from '../models/document-category.model.js';
import { DocumentCollectionDocument } from '../models/document-collection-document.model.js';
import { DocumentCollection } from '../models/document-collection.model.js';
import { DocumentFile } from '../models/document-file.model.js';
import { DocumentPropertyValue, DocumentRequestAssignmentTaskPropertyValue, DocumentRequestFilePropertyValue } from '../models/document-property-value.model.js';
import { DocumentProperty, DocumentPropertyDataType } from '../models/document-property.model.js';
import { DocumentRequestAssignmentTaskCollection } from '../models/document-request-assignment-task-collection.model.js';
import { DocumentRequestAssignmentTask } from '../models/document-request-assignment-task.model.js';
import { DocumentRequestCollection } from '../models/document-request-collection.model.js';
import { DocumentRequestFile } from '../models/document-request-file.model.js';
import { DocumentRequestTemplate } from '../models/document-request-template.js';
import { DocumentRequest } from '../models/document-request.model.js';
import { DocumentRequestsTemplate } from '../models/document-requests-template.js';
import { DocumentTypeProperty } from '../models/document-type-property.model.js';
import { DocumentType } from '../models/document-type.model.js';
import { Document } from '../models/document.model.js';

export const documentManagementSchema = databaseSchema('document_management');

export const dataType = documentManagementSchema.getEnum(DocumentPropertyDataType, 'DocumentPropertyDataType');

export const document = documentManagementSchema.getTable(Document);
export const documentCategory = documentManagementSchema.getTable(DocumentCategory);
export const documentCollection = documentManagementSchema.getTable(DocumentCollection);
export const documentCollectionDocument = documentManagementSchema.getTable(DocumentCollectionDocument);
export const documentFile = documentManagementSchema.getTable(DocumentFile);
export const documentProperty = documentManagementSchema.getTable(DocumentProperty);
export const documentPropertyValue = documentManagementSchema.getTable(DocumentPropertyValue);
export const documentRequest = documentManagementSchema.getTable(DocumentRequest);
export const documentRequestAssignmentTask = documentManagementSchema.getTable(DocumentRequestAssignmentTask);
export const documentRequestAssignmentTaskCollection = documentManagementSchema.getTable(DocumentRequestAssignmentTaskCollection);
export const documentRequestAssignmentTaskPropertyValue = documentManagementSchema.getTable(DocumentRequestAssignmentTaskPropertyValue);
export const documentRequestCollection = documentManagementSchema.getTable(DocumentRequestCollection);
export const documentRequestFile = documentManagementSchema.getTable(DocumentRequestFile);
export const documentRequestFilePropertyValue = documentManagementSchema.getTable(DocumentRequestFilePropertyValue);
export const documentRequestsTemplate = documentManagementSchema.getTable(DocumentRequestsTemplate);
export const documentRequestTemplate = documentManagementSchema.getTable(DocumentRequestTemplate);
export const documentType = documentManagementSchema.getTable(DocumentType);
export const documentTypeProperty = documentManagementSchema.getTable(DocumentTypeProperty);
