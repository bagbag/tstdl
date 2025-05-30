import type { CancellationSignal } from '#/cancellation/token.js';
import { DocumentWorkflowStep } from '#/document-management/models/document-workflow.model.js';
import { Document, DocumentCategory, DocumentCollection, DocumentCollectionAssignment, DocumentProperty, DocumentPropertyValue, DocumentType, DocumentTypeProperty, DocumentTypeValidation, DocumentValidationDefinition, DocumentValidationExecution, DocumentValidationExecutionRelatedDocument, DocumentValidationExecutionState, DocumentValidationResultStatus } from '#/document-management/models/index.js';
import { BadRequestError } from '#/errors/bad-request.error.js';
import { inject, injectAll } from '#/injector/inject.js';
import { Injector } from '#/injector/injector.js';
import { afterResolve } from '#/injector/interfaces.js';
import { injectionToken } from '#/injector/token.js';
import type { AfterResolveContext } from '#/injector/types.js';
import { Logger } from '#/logger/logger.js';
import { injectRepository } from '#/orm/server/repository.js';
import { getEntityIds } from '#/orm/utils.js';
import { Queue } from '#/queue/queue.js';
import type { Type } from '#/types.js';
import { currentTimestamp } from '#/utils/date-time.js';
import { isNull, isUndefined } from '#/utils/type-guards.js';
import { millisecondsPerMinute } from '#/utils/units.js';
import type { DocumentValidationExecutor, DocumentValidationExecutorContext, DocumentValidationExecutorContextDocumentData } from '../validators/index.js';
import { DocumentWorkflowService } from './document-workflow.service.js';
import { DocumentManagementSingleton } from './singleton.js';

type ValidationJobData = { executionId: string };

const DOCUMENT_VALIDATION_EXECUTORS = injectionToken<DocumentValidationExecutor>('DocumentValidationExecutors');

@DocumentManagementSingleton()
export class DocumentValidationService {
  readonly #documentManagementService = injectRepository(DocumentCollection);
  readonly #documentCollectionAssignmentRepository = injectRepository(DocumentCollectionAssignment);
  readonly #documentService = injectRepository(Document);
  readonly #documentCategoryService = injectRepository(DocumentCategory);
  readonly #documentTypeService = injectRepository(DocumentType);
  readonly #documentTypePropertyService = injectRepository(DocumentTypeProperty);
  readonly #documentPropertyService = injectRepository(DocumentProperty);
  readonly #documentPropertyValueService = injectRepository(DocumentPropertyValue);
  readonly #documentWorkflowService = inject(DocumentWorkflowService);
  readonly #validationDefinitionService = injectRepository(DocumentValidationDefinition);
  readonly #validationExecutionService = injectRepository(DocumentValidationExecution);
  readonly #validationExecutionRelatedDocumentService = injectRepository(DocumentValidationExecutionRelatedDocument);
  readonly #documentTypeValidationService = injectRepository(DocumentTypeValidation);
  readonly #queue = inject(Queue<ValidationJobData>, { name: 'DocumentManagement: validation', processTimeout: 5 * millisecondsPerMinute, maxTries: 3 });
  readonly #executors = injectAll(DOCUMENT_VALIDATION_EXECUTORS);
  readonly #logger = inject(Logger, DocumentValidationService.name);
  readonly #executorMap = new Map(this.#executors.map((executor) => [executor.identifier, executor]));

  [afterResolve](_: unknown, { cancellationSignal }: AfterResolveContext<any>): void {
    this.processQueue(cancellationSignal);
  }

  processQueue(cancellationSignal: CancellationSignal): void {
    this.#queue.process(
      { concurrency: 5, cancellationSignal },
      async (job) => {
        this.#logger.verbose(`Processing validation execution "${job.data.executionId}"`);
        await this.processValidationExecution(job.data.executionId);
      },
      this.#logger,
    );
  }

  async startValidationWorkflow(documentId: string): Promise<void> {
    const document = await this.#documentService.load(documentId);

    if (isNull(document.typeId)) {
      throw new BadRequestError('Document has no type');
    }

    const workflow = await this.#documentWorkflowService.initiateWorkflow(documentId, DocumentWorkflowStep.Validation);

    const typeValidations = await this.#documentTypeValidationService.loadManyByQuery({ typeId: document.typeId });

    for (const typeValidation of typeValidations) {
      const validationDefinition = await this.#validationDefinitionService.load(typeValidation.validationId);

      const execution = await this.#validationExecutionService.insert({
        definitionId: validationDefinition.id,
        workflowId: workflow.id,
        state: DocumentValidationExecutionState.Pending,
        resultStatus: null,
        resultMessage: null,
        startedAt: null,
        completedAt: null,
      });

      await this.#queue.enqueue({ executionId: execution.id });
    }
  }

  async setExecutionRunning(executionId: string): Promise<void> {
    await this.#validationExecutionService.update(executionId, { state: DocumentValidationExecutionState.Running, resultStatus: null, resultMessage: null, startedAt: currentTimestamp(), completedAt: null });
  }

  async setExecutionCompleted(executionId: string, status: DocumentValidationResultStatus, message: string | null): Promise<void> {
    await this.#validationExecutionService.update(executionId, { state: DocumentValidationExecutionState.Completed, resultStatus: status, resultMessage: message, completedAt: currentTimestamp() });
  }

  async setExecutionError(executionId: string, reason: string | null): Promise<void> {
    await this.#validationExecutionService.update(executionId, { state: DocumentValidationExecutionState.Error, resultStatus: DocumentValidationResultStatus.Failed, resultMessage: reason, completedAt: currentTimestamp() });
  }

  async loadRelatedDocument(executionId: string, documentId: string): Promise<DocumentValidationExecutorContextDocumentData> {
    const execution = await this.#validationExecutionService.load(executionId);
    const workflow = await this.#documentWorkflowService.repository.load(execution.workflowId);
    const documentData = await this.loadDocumentData(documentId);

    await this.#validationExecutionRelatedDocumentService.upsert(['executionId', 'documentId'], { executionId, documentId: workflow.documentId });

    return documentData;
  }

  async loadDocumentData(documentId: string): Promise<DocumentValidationExecutorContextDocumentData> {
    const document = await this.#documentService.load(documentId);

    if (isNull(document.typeId)) {
      throw new Error('Document has no type');
    }

    const [documentCollections, documentTypeProperties] = await Promise.all([
      this.#documentCollectionAssignmentRepository.loadManyByQuery({ documentId: document.id }),
      this.#documentTypePropertyService.loadManyByQuery({ typeId: document.typeId }),
    ]);

    const documentCollectionIds = getEntityIds(documentCollections);
    const documentPropertyIds = getEntityIds(documentTypeProperties);

    const [collections, category, type, properties, propertyValues] = await Promise.all([
      this.#documentManagementService.loadManyByQuery({ id: { $in: documentCollectionIds } }),
      this.#documentCategoryService.load(document.typeId),
      this.#documentTypeService.load(document.typeId),
      this.#documentPropertyService.loadManyByQuery({ id: { $in: documentPropertyIds } }),
      this.#documentPropertyValueService.loadManyByQuery({ documentId: document.id }),
    ]);

    return {
      document,
      collections,
      category,
      type,
      properties,
      propertyValues,
    };
  }

  protected async loadDocumentValidationExecutorContext(executionId: string): Promise<DocumentValidationExecutorContext> {
    const execution = await this.#validationExecutionService.load(executionId);

    const [definition, workflow] = await Promise.all([
      this.#validationDefinitionService.load(execution.definitionId),
      this.#documentWorkflowService.repository.load(execution.workflowId),
    ]);

    const documentData = await this.loadDocumentData(workflow.documentId);

    return {
      execution,
      definition,
      ...documentData,
    };
  }

  async processValidationExecution(executionId: string): Promise<void> {
    const context = await this.loadDocumentValidationExecutorContext(executionId);
    const executor = this.#executorMap.get(context.definition.identifier);

    if (isUndefined(executor)) {
      await this.setExecutionError(executionId, `Invalid validation identifier`);
      return;
    }

    try {
      await this.setExecutionRunning(executionId);
      const result = await executor.execute(context);
      await this.setExecutionCompleted(executionId, result.status, result.message ?? null);
    }
    catch (error) {
      this.#logger.error(error);
      await this.setExecutionError(executionId, 'Internal error');
    }
  }
}

export function registerDocumentValidationExecutor(...executors: Type<DocumentValidationExecutor>[]): void {
  for (const executor of executors) {
    Injector.register(DOCUMENT_VALIDATION_EXECUTORS, { useToken: executor }, { multi: true });
  }
}
