import type { TypedOmit } from '#/types.js';
import { assertDefinedPass } from '#/utils/type-guards.js';
import type { DocumentCollectionAssignment } from '../../models/index.js';
import type { DocumentAssignmentTaskView, DocumentAssignmentView, DocumentCollectionAssignmentView } from '../document-management.view-model.js';
import type { EnrichedDocumentCollection } from './enriched-document-collection.view.js';
import type { EnrichedDocumentManagementData } from './enriched-document-management-data.view.js';
import type { EnrichedDocument } from './enriched-document.view.js';

export class EnrichedDocumentCollectionAssignment implements TypedOmit<DocumentCollectionAssignment, 'id' | 'tenantId' | 'collectionId' | 'documentId' | 'metadata'> {
  readonly #data: EnrichedDocumentManagementData;
  readonly #assignment: DocumentCollectionAssignmentView;

  get collection(): EnrichedDocumentCollection {
    return assertDefinedPass(this.#data.maps.collections.get(this.#assignment.collectionId));
  }

  readonly document: EnrichedDocument;
  readonly archiveTimestamp: number | null;

  constructor(data: EnrichedDocumentManagementData, assignment: DocumentCollectionAssignmentView, document: EnrichedDocument) {
    this.#data = data;
    this.#assignment = assignment;
    this.document = document;
    this.archiveTimestamp = assignment.archiveTimestamp;
  }
}

export class EnrichedDocumentAssignment implements TypedOmit<DocumentAssignmentView, 'collections' | 'assignmentTask'> {
  readonly #collections: EnrichedDocumentCollectionAssignment[];
  readonly #document: EnrichedDocument;

  get collections(): EnrichedDocumentCollectionAssignment[] {
    return this.#collections;
  }

  get document(): EnrichedDocument {
    return this.#document;
  }

  readonly assignmentTask: DocumentAssignmentTaskView | null;

  constructor(data: EnrichedDocumentManagementData, document: EnrichedDocument, assignment: DocumentAssignmentView) {
    this.#document = document;
    this.#collections = assignment.collections.map((assignment) => new EnrichedDocumentCollectionAssignment(data, assignment, document));
    this.assignmentTask = assignment.assignmentTask;
  }
}
