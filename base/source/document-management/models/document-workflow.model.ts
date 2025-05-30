import { defineEnum, type EnumType } from '#/enumeration/enumeration.js';
import { References } from '#/orm/decorators.js';
import { Entity } from '#/orm/entity.js';
import { Index, Timestamp, Uuid } from '#/orm/types.js';
import { Enumeration } from '#/schema/index.js';
import { DocumentManagementTable } from './document-management-table.js';
import { Document } from './document.model.js';

export const DocumentWorkflowStep = defineEnum('DocumentWorkflowStep', {
  Classification: 'classification',
  Extraction: 'extraction',
  Assignment: 'assignment',
  Validation: 'validation',
});

export type DocumentWorkflowStep = EnumType<typeof DocumentWorkflowStep>;

export const DocumentWorkflowState = defineEnum('DocumentWorkflowState', {
  Pending: 'pending',
  Running: 'running',
  Review: 'review',
  Completed: 'completed',

  /** Unexpected error happened */
  Error: 'error',

  /**
   * Something didn't work out
   * @see {@link DocumentWorkflowFailReason} */
  Failed: 'failed',
});

export type DocumentWorkflowState = EnumType<typeof DocumentWorkflowState>;

export const DocumentWorkflowFailReason = defineEnum('DocumentWorkflowFailReason', {
  NoSuitableCollection: 'no-suitable-collection',
  NoSuitableRequest: 'no-suitable-request',
});

export type DocumentWorkflowFailReason = EnumType<typeof DocumentWorkflowFailReason>;

@DocumentManagementTable()
@Index<DocumentWorkflow>(['documentId'], { unique: true, where: () => ({ state: { $neq: DocumentWorkflowState.Completed } }) })
export class DocumentWorkflow extends Entity {
  declare static readonly entityName: 'DocumentWorkflow';

  @Uuid()
  @References(() => Document)
  documentId: Uuid;

  @Enumeration(DocumentWorkflowStep)
  step: DocumentWorkflowStep;

  @Enumeration(DocumentWorkflowState)
  state: DocumentWorkflowState;

  @Enumeration(DocumentWorkflowFailReason, { nullable: true })
  failReason: DocumentWorkflowFailReason | null;

  @Timestamp({ nullable: true })
  completeTimestamp: Timestamp | null;

  @Uuid({ nullable: true })
  completeUserId: Uuid | null;
}
