
import { databaseSchema } from '#/orm/database-schema.js';
import { DocumentCategory } from './document-category.model.js';
import { DocumentCollectionDocument } from './document-collection-document.model.js';
import { DocumentCollection } from './document-collection.model.js';
import { DocumentFile } from './document-file.model.js';
import { DocumentPropertyBooleanValue, DocumentPropertyDecimalValue, DocumentPropertyIntegerValue, DocumentPropertyTextValue } from './document-property-value.model.js';
import { DocumentProperty, DocumentPropertyDataType } from './document-property.model.js';
import { DocumentRequestCollection } from './document-request-collection.model.js';
import { DocumentRequestFile } from './document-request-file.model.js';
import { DocumentRequestTemplate } from './document-request-template.js';
import { DocumentRequest } from './document-request.model.js';
import { DocumentRequestsTemplate } from './document-requests-template.js';
import { DocumentTypeProperty } from './document-type-property.model.js';
import { DocumentType } from './document-type.model.js';
import { Document } from './document.model.js';

export const documentManagementSchema = databaseSchema('document_management');

export const dataType = documentManagementSchema.getEnum(DocumentPropertyDataType, 'DocumentPropertyDataType');

export const documentCategory = documentManagementSchema.getTable(DocumentCategory);
export const documentCollectionDocument = documentManagementSchema.getTable(DocumentCollectionDocument);
export const documentCollection = documentManagementSchema.getTable(DocumentCollection);
export const documentFile = documentManagementSchema.getTable(DocumentFile);
export const documentPropertyTextValue = documentManagementSchema.getTable(DocumentPropertyTextValue);
export const documentPropertyIntegerValue = documentManagementSchema.getTable(DocumentPropertyIntegerValue);
export const documentPropertyDecimalValue = documentManagementSchema.getTable(DocumentPropertyDecimalValue);
export const documentPropertyBooleanValue = documentManagementSchema.getTable(DocumentPropertyBooleanValue);
export const documentProperty = documentManagementSchema.getTable(DocumentProperty);
export const documentRequestCollection = documentManagementSchema.getTable(DocumentRequestCollection);
export const documentRequestFile = documentManagementSchema.getTable(DocumentRequestFile);
export const documentRequestTemplate = documentManagementSchema.getTable(DocumentRequestTemplate);
export const documentRequest = documentManagementSchema.getTable(DocumentRequest);
export const documentRequestsTemplate = documentManagementSchema.getTable(DocumentRequestsTemplate);
export const documentTypeProperty = documentManagementSchema.getTable(DocumentTypeProperty);
export const documentType = documentManagementSchema.getTable(DocumentType);
export const document = documentManagementSchema.getTable(Document);
