import { Array, Enumeration, Property, string, StringProperty, Union } from '#/schema/index.js';
import type { TypedOmit } from '#/types.js';
import { Document, DocumentAssignmentTarget, DocumentAssignmentTask, DocumentCategory, DocumentCollection, DocumentCollectionAssignment, DocumentPropertyDataType, DocumentRequest, DocumentTag, DocumentType, DocumentTypeProperty, DocumentValidationExecution, DocumentWorkflow, type DocumentProperty } from '../models/index.js';

export class DocumentCollectionView extends DocumentCollection {
  @StringProperty({ nullable: true })
  name: string;

  @StringProperty({ nullable: true })
  group: string | null;
}

export class LightDocumentPropertyValueView {
  @StringProperty()
  propertyId: string;

  @Union(String, Number, Boolean, { nullable: true })
  value: string | number | boolean | null;
}

export class DocumentPropertyValueView {
  @StringProperty()
  documentId: string;

  @StringProperty()
  propertyId: string;

  @StringProperty()
  label: string;

  @Enumeration(DocumentPropertyDataType)
  dataType: DocumentPropertyDataType;

  @Union(String, Number, Boolean, { nullable: true })
  value: string | number | boolean | null;
}

export class DocumentCollectionAssignmentView implements TypedOmit<DocumentCollectionAssignment, 'id' | 'tenantId' | 'documentId' | 'metadata'> {
  @StringProperty()
  collectionId: string;

  @StringProperty({ nullable: true })
  archiveTimestamp: number | null;
}

export class DocumentAssignmentTaskView implements TypedOmit<DocumentAssignmentTask, 'id' | 'tenantId' | 'documentId' | 'metadata'> {
  @Enumeration(DocumentAssignmentTarget)
  target: DocumentAssignmentTarget;

  @Array(string())
  scope: string[];
}

export class DocumentAssignmentView {
  @Array(DocumentCollectionAssignmentView)
  collections: DocumentCollectionAssignmentView[];

  @Property(DocumentAssignmentTaskView, { nullable: true })
  assignmentTask: DocumentAssignmentTaskView | null;
}

export class DocumentView extends Document {
  @Property(DocumentAssignmentView)
  assignment: DocumentAssignmentView;

  @Array(string())
  tagIds: string[];

  @Array(LightDocumentPropertyValueView)
  properties: LightDocumentPropertyValueView[];

  /** available as long as the document is neither approved nor rejected */
  @Array(DocumentWorkflow)
  workflows: DocumentWorkflow[];

  @Array(DocumentValidationExecution)
  validations: DocumentValidationExecution[];
}

export class DocumentRequestView extends DocumentRequest {
  @Array(String)
  collectionIds: string[];
}

export class DocumentPropertyView implements TypedOmit<DocumentProperty, 'metadata'> {
  @StringProperty()
  id: string;

  @StringProperty({ nullable: true })
  tenantId: string | null;

  @StringProperty()
  label: string;

  @Enumeration(DocumentPropertyDataType)
  dataType: DocumentPropertyDataType;

  @Array(String)
  typeIds: string[];
}

export class DocumentManagementData {
  @Array(DocumentCollectionView)
  collections: DocumentCollectionView[];

  @Array(DocumentView)
  documents: DocumentView[];

  @Array(DocumentRequestView)
  requests: DocumentRequestView[];

  @Array(DocumentCategory)
  categories: DocumentCategory[];

  @Array(DocumentType)
  types: DocumentType[];

  @Array(DocumentTag)
  tags: DocumentTag[];

  @Array(DocumentTypeProperty)
  properties: DocumentPropertyView[];
}
