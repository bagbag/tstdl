import { databaseSchema } from '#/orm/server/database-schema.js';

import { Document, DocumentApproval, DocumentAssignmentScope, DocumentAssignmentTarget, DocumentAssignmentTask, DocumentCategory, DocumentCollection, DocumentCollectionAssignment, DocumentProperty, DocumentPropertyDataType, DocumentPropertyValue, DocumentRequest, DocumentRequestCollectionAssignment, DocumentRequestState, DocumentRequestsTemplate, DocumentRequestTemplate, DocumentType, DocumentTypeProperty, DocumentTypeValidation, DocumentValidationDefinition, DocumentValidationExecution, DocumentValidationExecutionRelatedDocument, DocumentValidationExecutionState, DocumentValidationResultStatus, DocumentWorkflow, DocumentWorkflowFailReason, DocumentWorkflowState, DocumentWorkflowStep } from '../models/index.js';

export const documentManagementSchema = databaseSchema('document_management');

export const aocumentApproval = documentManagementSchema.getEnum(DocumentApproval);
export const documentAssignmentCollectionTarget = documentManagementSchema.getEnum(DocumentAssignmentTarget);
export const documentPropertyDataType = documentManagementSchema.getEnum(DocumentPropertyDataType);
export const documentRequestState = documentManagementSchema.getEnum(DocumentRequestState);
export const documentValidationExecutionState = documentManagementSchema.getEnum(DocumentValidationExecutionState);
export const documentValidationResultStatus = documentManagementSchema.getEnum(DocumentValidationResultStatus);
export const documentWorkflowFailReason = documentManagementSchema.getEnum(DocumentWorkflowFailReason);
export const documentWorkflowState = documentManagementSchema.getEnum(DocumentWorkflowState);
export const documentWorkflowStep = documentManagementSchema.getEnum(DocumentWorkflowStep);

export const document = documentManagementSchema.getTable(Document);
export const documentAssignmentScope = documentManagementSchema.getTable(DocumentAssignmentScope);
export const documentAssignmentTask = documentManagementSchema.getTable(DocumentAssignmentTask);
export const documentCategory = documentManagementSchema.getTable(DocumentCategory);
export const documentCollection = documentManagementSchema.getTable(DocumentCollection);
export const documentCollectionAssignment = documentManagementSchema.getTable(DocumentCollectionAssignment);
export const documentProperty = documentManagementSchema.getTable(DocumentProperty);
export const documentPropertyValue = documentManagementSchema.getTable(DocumentPropertyValue);
export const documentRequest = documentManagementSchema.getTable(DocumentRequest);
export const documentRequestCollectionAssignment = documentManagementSchema.getTable(DocumentRequestCollectionAssignment);
export const documentRequestsTemplate = documentManagementSchema.getTable(DocumentRequestsTemplate);
export const documentRequestTemplate = documentManagementSchema.getTable(DocumentRequestTemplate);
export const documentType = documentManagementSchema.getTable(DocumentType);
export const documentTypeProperty = documentManagementSchema.getTable(DocumentTypeProperty);
export const documentTypeValidation = documentManagementSchema.getTable(DocumentTypeValidation);
export const documentValidationDefinition = documentManagementSchema.getTable(DocumentValidationDefinition);
export const documentValidationExecution = documentManagementSchema.getTable(DocumentValidationExecution);
export const documentValidationExecutionRelatedDocument = documentManagementSchema.getTable(DocumentValidationExecutionRelatedDocument);
export const documentWorkflow = documentManagementSchema.getTable(DocumentWorkflow);
