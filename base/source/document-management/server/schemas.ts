
import { databaseSchema } from '#/orm/server/database-schema.js';
import { DocumentCategory } from '../models/document-category.model.js';
import { DocumentCollectionDocument } from '../models/document-collection-document.model.js';
import { DocumentCollection } from '../models/document-collection.model.js';
import { DocumentFile } from '../models/document-file.model.js';
import { DocumentPropertyBooleanValue, DocumentPropertyDecimalValue, DocumentPropertyIntegerValue, DocumentPropertyTextValue } from '../models/document-property-value.model.js';
import { DocumentProperty, DocumentPropertyDataType } from '../models/document-property.model.js';
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
