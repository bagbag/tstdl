import { databaseSchema } from '#/orm/server/database-schema.js';

import { Document, DocumentApproval, DocumentAssignmentScope, DocumentAssignmentTarget, DocumentAssignmentTask, DocumentCategory, DocumentCollection, DocumentCollectionAssignment, DocumentProperty, DocumentPropertyDataType, DocumentPropertyValue, DocumentRequest, DocumentRequestCollectionAssignment, DocumentRequestState, DocumentRequestsTemplate, DocumentRequestTemplate, DocumentTag, DocumentTagAssignment, DocumentType, DocumentTypeProperty, DocumentTypeValidation, DocumentValidationDefinition, DocumentValidationExecution, DocumentValidationExecutionRelatedDocument, DocumentValidationExecutionState, DocumentValidationResultStatus, DocumentWorkflow, DocumentWorkflowFailReason, DocumentWorkflowState, DocumentWorkflowStep } from '../models/index.js';

export const documentManagementSchema = databaseSchema('document_management');

export const documentApproval = documentManagementSchema.getEnum(DocumentApproval);
export const documentAssignmentTarget = documentManagementSchema.getEnum(DocumentAssignmentTarget, 'assignment_target');
export const documentPropertyDataType = documentManagementSchema.getEnum(DocumentPropertyDataType, 'property_data_type');
export const documentRequestState = documentManagementSchema.getEnum(DocumentRequestState, 'request_state');
export const documentValidationExecutionState = documentManagementSchema.getEnum(DocumentValidationExecutionState, 'validation_execution_state');
export const documentValidationResultStatus = documentManagementSchema.getEnum(DocumentValidationResultStatus, 'validation_result_status');
export const documentWorkflowFailReason = documentManagementSchema.getEnum(DocumentWorkflowFailReason, 'workflow_fail_reason');
export const documentWorkflowState = documentManagementSchema.getEnum(DocumentWorkflowState, 'workflow_state');
export const documentWorkflowStep = documentManagementSchema.getEnum(DocumentWorkflowStep, 'workflow_step');

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
export const documentTag = documentManagementSchema.getTable(DocumentTag);
export const documentTagAssignment = documentManagementSchema.getTable(DocumentTagAssignment);
export const documentType = documentManagementSchema.getTable(DocumentType);
export const documentTypeProperty = documentManagementSchema.getTable(DocumentTypeProperty);
export const documentTypeValidation = documentManagementSchema.getTable(DocumentTypeValidation);
export const documentValidationDefinition = documentManagementSchema.getTable(DocumentValidationDefinition);
export const documentValidationExecution = documentManagementSchema.getTable(DocumentValidationExecution);
export const documentValidationExecutionRelatedDocument = documentManagementSchema.getTable(DocumentValidationExecutionRelatedDocument);
export const documentWorkflow = documentManagementSchema.getTable(DocumentWorkflow);
