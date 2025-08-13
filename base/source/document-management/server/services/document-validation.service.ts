import type { CancellationSignal } from '#/cancellation/token.js';
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
import type { Type } from '#/types/index.js';
import { currentTimestamp } from '#/utils/date-time.js';
import { isNull, isUndefined } from '#/utils/type-guards.js';
import { millisecondsPerMinute } from '#/utils/units.js';
import { DocumentWorkflowStep } from '../../models/document-workflow.model.js';
import { Document, DocumentCategory, DocumentCollection, DocumentCollectionAssignment, DocumentProperty, DocumentPropertyValue, DocumentType, DocumentTypeProperty, DocumentTypeValidation, DocumentValidationDefinition, DocumentValidationExecution, DocumentValidationExecutionRelatedDocument, DocumentValidationExecutionState, DocumentValidationResultStatus } from '../../models/index.js';
import type { DocumentValidationExecutor, DocumentValidationExecutorContext, DocumentValidationExecutorContextDocumentData } from '../validators/index.js';
import { DocumentWorkflowService } from './document-workflow.service.js';
import { DocumentManagementSingleton } from './singleton.js';

type ValidationJobData = { tenantId: string, executionId: string };

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
        await this.processValidationExecution(job.data.tenantId, job.data.executionId);
      },
      this.#logger,
    );
  }

  async startValidationWorkflow(tenantId: string, documentId: string): Promise<void> {
    const document = await this.#documentService.loadByQuery({ tenantId, id: documentId });

    if (isNull(document.typeId)) {
      throw new BadRequestError('Document has no type');
    }

    const workflow = await this.#documentWorkflowService.initiateWorkflow(document.tenantId, documentId, DocumentWorkflowStep.Validation);

    const typeValidations = await this.#documentTypeValidationService.loadManyByQuery({ tenantId: { $or: [null, tenantId] }, typeId: document.typeId });

    for (const typeValidation of typeValidations) {
      const validationDefinition = await this.#validationDefinitionService.loadByQuery({ tenantId: { $or: [null, tenantId] }, id: typeValidation.validationId });

      const execution = await this.#validationExecutionService.insert({
        tenantId: document.tenantId,
        definitionId: validationDefinition.id,
        workflowId: workflow.id,
        state: DocumentValidationExecutionState.Pending,
        resultStatus: null,
        resultMessage: null,
        startedAt: null,
        completedAt: null,
      });

      await this.#queue.enqueue({ tenantId, executionId: execution.id });
    }
  }

  async setExecutionRunning(tenantId: string, executionId: string): Promise<void> {
    await this.#validationExecutionService.updateByQuery({ tenantId, executionId }, { state: DocumentValidationExecutionState.Running, resultStatus: null, resultMessage: null, startedAt: currentTimestamp(), completedAt: null });
  }

  async setExecutionCompleted(tenantId: string, executionId: string, status: DocumentValidationResultStatus, message: string | null): Promise<void> {
    await this.#validationExecutionService.updateByQuery({ tenantId, executionId }, { state: DocumentValidationExecutionState.Completed, resultStatus: status, resultMessage: message, completedAt: currentTimestamp() });
  }

  async setExecutionError(tenantId: string, executionId: string, reason: string | null): Promise<void> {
    await this.#validationExecutionService.updateByQuery({ tenantId, executionId }, { state: DocumentValidationExecutionState.Error, resultStatus: DocumentValidationResultStatus.Failed, resultMessage: reason, completedAt: currentTimestamp() });
  }

  async loadRelatedDocument(tenantId: string, executionId: string, documentId: string): Promise<DocumentValidationExecutorContextDocumentData> {
    const execution = await this.#validationExecutionService.loadByQuery({ tenantId, id: executionId });
    const workflow = await this.#documentWorkflowService.repository.loadByQuery({ tenantId, id: execution.workflowId });
    const documentData = await this.loadDocumentData(tenantId, documentId);

    await this.#validationExecutionRelatedDocumentService.upsert(['executionId', 'documentId'], { tenantId, executionId, documentId: workflow.documentId });

    return documentData;
  }

  async loadDocumentData(tenantId: string, documentId: string): Promise<DocumentValidationExecutorContextDocumentData> {
    const document = await this.#documentService.loadByQuery({ tenantId, id: documentId });

    if (isNull(document.typeId)) {
      throw new Error('Document has no type');
    }

    const [documentCollections, documentTypeProperties, type] = await Promise.all([
      this.#documentCollectionAssignmentRepository.loadManyByQuery({ tenantId, documentId: document.id }),
      this.#documentTypePropertyService.loadManyByQuery({ tenantId: { $or: [null, tenantId] }, typeId: document.typeId }),
      this.#documentTypeService.loadByQuery({ tenantId: { $or: [null, tenantId] }, id: document.typeId }),
    ]);

    const documentCollectionIds = getEntityIds(documentCollections);
    const documentPropertyIds = getEntityIds(documentTypeProperties);

    const [collections, category, properties, propertyValues] = await Promise.all([
      this.#documentManagementService.loadManyByQuery({ tenantId, id: { $in: documentCollectionIds } }),
      this.#documentCategoryService.loadByQuery({ tenantId: { $or: [null, tenantId] }, id: type.categoryId }),
      this.#documentPropertyService.loadManyByQuery({ tenantId: { $or: [null, tenantId] }, id: { $in: documentPropertyIds } }),
      this.#documentPropertyValueService.loadManyByQuery({ tenantId, documentId: document.id }),
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

  protected async loadDocumentValidationExecutorContext(tenantId: string, executionId: string): Promise<DocumentValidationExecutorContext> {
    const execution = await this.#validationExecutionService.loadByQuery({ tenantId, id: executionId });

    const [definition, workflow] = await Promise.all([
      this.#validationDefinitionService.loadByQuery({ tenantId, id: execution.definitionId }),
      this.#documentWorkflowService.repository.loadByQuery({ tenantId, id: execution.workflowId }),
    ]);

    const documentData = await this.loadDocumentData(tenantId, workflow.documentId);

    return {
      execution,
      definition,
      ...documentData,
    };
  }

  async processValidationExecution(tenantId: string, executionId: string): Promise<void> {
    const context = await this.loadDocumentValidationExecutorContext(tenantId, executionId);
    const executor = this.#executorMap.get(context.definition.identifier);

    if (isUndefined(executor)) {
      await this.setExecutionError(tenantId, executionId, `Invalid validation identifier`);
      return;
    }

    try {
      await this.setExecutionRunning(tenantId, executionId);
      const result = await executor.execute(context);
      await this.setExecutionCompleted(tenantId, executionId, result.status, result.message ?? null);
    }
    catch (error) {
      this.#logger.error(error);
      await this.setExecutionError(tenantId, executionId, 'Internal error');
    }
  }
}

export function registerDocumentValidationExecutor(...executors: Type<DocumentValidationExecutor>[]): void {
  for (const executor of executors) {
    Injector.register(DOCUMENT_VALIDATION_EXECUTORS, { useToken: executor }, { multi: true });
  }
}
