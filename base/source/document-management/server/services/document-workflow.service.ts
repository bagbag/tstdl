import { match } from 'ts-pattern';

import { BadRequestError } from '#/errors/bad-request.error.js';
import { NotImplementedError } from '#/errors/not-implemented.error.js';
import type { AfterResolveContext } from '#/injector/index.js';
import { inject } from '#/injector/inject.js';
import { afterResolve } from '#/injector/interfaces.js';
import { Logger } from '#/logger/index.js';
import { injectRepository } from '#/orm/server/repository.js';
import { injectTransactional, Transactional } from '#/orm/server/transactional.js';
import { Queue, type Job } from '#/queue/queue.js';
import type { OneOrMany, TypedExclude, TypedExtract } from '#/types/index.js';
import { toArray } from '#/utils/array/array.js';
import { currentTimestamp } from '#/utils/date-time.js';
import { _throw } from '#/utils/throw.js';
import { isNotNull, isNull } from '#/utils/type-guards.js';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { DocumentAssignmentScope } from '../../models/document-assignment-scope.model.js';
import { DocumentAssignmentTask } from '../../models/document-assignment-task.model.js';
import { DocumentWorkflow, DocumentWorkflowFailReason, DocumentWorkflowState, DocumentWorkflowStep } from '../../models/document-workflow.model.js';
import { DocumentApproval } from '../../models/document.model.js';
import { documentWorkflow } from '../schemas.js';
import { DocumentCollectionService } from './document-collection.service.js';
import { DocumentManagementAiService } from './document-management-ai.service.js';
import { DocumentManagementObservationService } from './document-management-observation.service.js';
import { DocumentRequestService } from './document-request.service.js';
import { DocumentService } from './document.service.js';
import { DocumentManagementSingleton } from './singleton.js';

type WorkflowJobData = { workflowId: string };

@DocumentManagementSingleton()
export class DocumentWorkflowService extends Transactional {
  readonly #documentManagementAiService = inject(DocumentManagementAiService);
  readonly #documentCollectionService = injectTransactional(DocumentCollectionService);
  readonly #documentRequestService = injectTransactional(DocumentRequestService);
  readonly #documentAssignmentTaskRepository = injectRepository(DocumentAssignmentTask);
  readonly #documentAssignmentScopeRepository = injectRepository(DocumentAssignmentScope);
  readonly #observationService = inject(DocumentManagementObservationService);
  readonly #queue = inject(Queue<WorkflowJobData>, { name: 'DocumentWorkflow', processTimeout: 5 * 60 * 1000, maxTries: 3 });
  readonly #logger = inject(Logger, DocumentWorkflowService.name);

  private readonly documentService = inject(DocumentService, undefined, { forwardRef: true });

  readonly repository = injectRepository(DocumentWorkflow);

  [afterResolve](_: unknown, { cancellationSignal }: AfterResolveContext<any>): void {
    if (this.isInTransaction) {
      return;
    }

    this.#queue.process(
      { concurrency: 5, cancellationSignal },
      async (job) => await this.processWorkflowJob(job),
      this.#logger,
    );
  }

  async loadLatestWorkflow(tenantId: string, documentId: string): Promise<DocumentWorkflow> {
    return await this.repository.loadByQuery({ tenantId, documentId }, { order: { 'metadata.createTimestamp': 'desc' } });
  }

  async loadLatestWorkflows(tenantId: string, documentIds: string[]): Promise<DocumentWorkflow[]> {
    const latestWorkflows = await this.repository.session
      .selectDistinctOn([documentWorkflow.documentId])
      .from(documentWorkflow)
      .where(and(
        eq(documentWorkflow.tenantId, tenantId),
        inArray(documentWorkflow.documentId, documentIds)
      ))
      .orderBy(documentWorkflow.documentId, desc(documentWorkflow.createTimestamp));

    return await this.repository.mapManyToEntity(latestWorkflows);
  }

  async loadWorkflows(tenantId: string, documentId: OneOrMany<string>): Promise<DocumentWorkflow[]> {
    return await this.repository.loadManyByQuery({ tenantId, documentId: { $in: toArray(documentId) } }, { order: { 'documentId': 'asc', 'metadata.createTimestamp': 'desc' } });
  }

  async proceedWorkflow(tenantId: string, documentId: string, userId: string): Promise<void> {
    await this.transaction(async (tx) => {
      const workflow = await this.withTransaction(tx).loadLatestWorkflow(tenantId, documentId);

      if (workflow.state != DocumentWorkflowState.Review) {
        throw new BadRequestError('Current workflow is not in review state.');
      }

      if (isNotNull(workflow.completeUserId)) {
        throw new BadRequestError('Latest workflow is already completed.');
      }

      await this.repository.withTransaction(tx).update(workflow.id, { state: DocumentWorkflowState.Completed, completeUserId: userId });

      await match(workflow.step)
        .with(DocumentWorkflowStep.Classification, () => _throw(new BadRequestError('Proceeding from classification occurs automatically.')))
        .with(DocumentWorkflowStep.Extraction, async () => await this.withTransaction(tx).initiateWorkflow(tenantId, documentId, DocumentWorkflowStep.Assignment))
        .with(DocumentWorkflowStep.Assignment, async () => await this.withTransaction(tx).initiateWorkflow(tenantId, documentId, DocumentWorkflowStep.Validation))
        .with(DocumentWorkflowStep.Validation, () => { /* nothing to do */ })
        .exhaustive();

      this.#observationService.documentChange(workflow.id, tx);
    });
  }

  async initiateWorkflow(tenantId: string, documentId: string, step: DocumentWorkflowStep): Promise<DocumentWorkflow> {
    const workflow = await this.repository.insert({ tenantId, documentId, step, state: 'pending', failReason: null, completeTimestamp: null, completeUserId: null });
    await this.#queue.enqueue({ workflowId: workflow.id });

    this.#observationService.documentChange(workflow.id, this.session);

    return workflow;
  }

  private async setWorkflowState(id: string, state: TypedExclude<DocumentWorkflowState, 'failed'>): Promise<void>;
  private async setWorkflowState(id: string, state: TypedExtract<DocumentWorkflowState, 'failed'>, reason: DocumentWorkflowFailReason): Promise<void>;
  private async setWorkflowState(id: string, state: DocumentWorkflowState, failReason: DocumentWorkflowFailReason | null = null): Promise<void> {
    await this.repository.update(id, { state, completeTimestamp: (state == DocumentWorkflowState.Completed) ? currentTimestamp() : undefined, failReason });
    this.#observationService.workflowChange(id, this.session);
  }

  private async processWorkflowJob(job: Job<WorkflowJobData>): Promise<void> {
    const workflow = await this.repository.load(job.data.workflowId);

    this.#logger.verbose(`Processing workflow "${workflow.step}" for document "${workflow.documentId}"`);

    try {
      await this.setWorkflowState(workflow.id, DocumentWorkflowState.Running);

      await match(workflow.step)
        .with(DocumentWorkflowStep.Classification, async () => await this.processClassificationWorkflow(workflow))
        .with(DocumentWorkflowStep.Extraction, async () => await this.processExtractionWorkflow(workflow))
        .with(DocumentWorkflowStep.Assignment, async () => await this.processAssignmentWorkflow(workflow))
        .with(DocumentWorkflowStep.Validation, async () => await this.processValidationWorkflow(workflow))
        .exhaustive();

      if (workflow.step == DocumentWorkflowStep.Classification) {
        // no need for after classification review. Automatically start extraction.

        await this.setWorkflowState(workflow.id, DocumentWorkflowState.Completed);
        await this.initiateWorkflow(workflow.tenantId, workflow.documentId, DocumentWorkflowStep.Extraction);
      }
      else {
        await this.setWorkflowState(workflow.id, DocumentWorkflowState.Review);
      }
    }
    catch (error) {
      const isLastTry = job.tries >= this.#queue.maxTries;

      if (isLastTry) {
        await this.repository.update(workflow.id, { state: DocumentWorkflowState.Error });
        this.#observationService.documentChange(workflow.id, this.session);
      }

      throw error;
    }
  }

  private async processClassificationWorkflow(workflow: DocumentWorkflow): Promise<void> {
    const typeId = await this.#documentManagementAiService.classifyDocumentType(workflow.tenantId, workflow.documentId);
    await this.documentService.repository.update(workflow.documentId, { typeId, approval: DocumentApproval.Pending });
    this.#observationService.documentChange(workflow.documentId, this.session);
  }

  private async processExtractionWorkflow(workflow: DocumentWorkflow): Promise<void> {
    const extraction = await this.#documentManagementAiService.extractDocumentInformation(workflow.tenantId, workflow.documentId);
    await this.documentService.update(workflow.tenantId, workflow.documentId, extraction);
  }

  private async processAssignmentWorkflow(workflow: DocumentWorkflow): Promise<void> {
    const [document, assignmentTask] = await Promise.all([
      this.documentService.repository.loadByQuery({ tenantId: workflow.tenantId, id: workflow.documentId }),
      this.#documentAssignmentTaskRepository.loadByQuery({ tenantId: workflow.tenantId, documentId: workflow.documentId }),
    ]);

    const assignmentScopes = await this.#documentAssignmentScopeRepository.loadManyByQuery({ tenantId: workflow.tenantId, taskId: assignmentTask.id });

    const collectionIds = assignmentScopes.map((scope) => scope.collectionId);

    await match(assignmentTask.target)
      .with('collection', async () => {
        const suitableCollectionIds = await this.#documentManagementAiService.findSuitableCollectionsForDocument(document, collectionIds);

        if (suitableCollectionIds.length == 0) {
          await this.setWorkflowState(workflow.id, DocumentWorkflowState.Failed, DocumentWorkflowFailReason.NoSuitableCollection);
          return;
        }

        await this.#documentCollectionService.assignDocument(document, suitableCollectionIds);
      })
      .with('request', async () => {
        const suitableRequestId = await this.#documentManagementAiService.findSuitableRequestForDocument(document, collectionIds);

        if (isNull(suitableRequestId)) {
          await this.setWorkflowState(workflow.id, DocumentWorkflowState.Failed, DocumentWorkflowFailReason.NoSuitableRequest);
          return;
        }

        await this.#documentRequestService.assignDocument(document, suitableRequestId);
      })
      .exhaustive();
  }

  private async processValidationWorkflow(_workflow: DocumentWorkflow): Promise<void> {
    throw new NotImplementedError();
  }
}
