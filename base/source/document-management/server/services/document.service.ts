import { match, P } from 'ts-pattern';

import { BadRequestError } from '#/errors/bad-request.error.js';
import { inject } from '#/injector/inject.js';
import { Logger } from '#/logger/logger.js';
import { injectTransactional, Transactional, type Transaction } from '#/orm/server/index.js';
import { injectRepository } from '#/orm/server/repository.js';
import { getPdfPageCount } from '#/pdf/utils.js';
import type { TypedOmit } from '#/types.js';
import { toArray } from '#/utils/array/index.js';
import { objectKeys } from '#/utils/object/object.js';
import { readableStreamFromPromise } from '#/utils/stream/from-promise.js';
import { tryIgnoreLogAsync } from '#/utils/try-ignore.js';
import { isDefined, isNotReadableStream, isNotUint8Array, isString, isUndefined } from '#/utils/type-guards.js';
import { Document, DocumentApproval, DocumentAssignmentScope, DocumentAssignmentTask, DocumentType, DocumentWorkflowStep, type UpdatableDocumentProperties } from '../../models/index.js';
import type { CreateDocumentParameters, SetDocumentPropertyParameters, UpdateDocumentCollectionsParameters } from '../../service-models/index.js';
import { DocumentCollectionService } from './document-collection.service.js';
import { DocumentFileService } from './document-file.service.js';
import { DocumentManagementObservationService } from './document-management-observation.service.js';
import { DocumentPropertyService } from './document-property.service.js';
import { DocumentRequestService } from './document-request.service.js';
import { DocumentTagService } from './document-tag.service.js';
import { DocumentWorkflowService } from './document-workflow.service.js';
import { DocumentManagementSingleton } from './singleton.js';

@DocumentManagementSingleton()
export class DocumentService extends Transactional {
  readonly #documentFileService = injectTransactional(DocumentFileService);
  readonly #documentTagService = injectTransactional(DocumentTagService);
  readonly #requestService = injectTransactional(DocumentRequestService);
  readonly #workflowService = injectTransactional(DocumentWorkflowService);
  readonly #documentPropertyService = injectTransactional(DocumentPropertyService);
  readonly #collectionService = injectTransactional(DocumentCollectionService);
  readonly #documentTypeRepository = injectRepository(DocumentType);
  readonly #documentAssignmentTaskRepository = injectRepository(DocumentAssignmentTask);
  readonly #documentAssignmentScopeRepository = injectRepository(DocumentAssignmentScope);
  readonly #observationService = inject(DocumentManagementObservationService);
  readonly #logger = inject(Logger, DocumentService.name);

  readonly repository = injectRepository(Document);

  async create(tenantId: string, { typeId, title, subtitle, date, summary, tags, approval, comment, originalFileName, assignment, properties, metadata }: TypedOmit<CreateDocumentParameters, 'uploadId'>, contentSource: Uint8Array | ReadableStream<Uint8Array> | { uploadId: string, uploadKey: string }, { createUserId }: { createUserId?: string }): Promise<Document> {
    const document = await this.transaction(async (tx) => {
      const isUpload = isNotUint8Array(contentSource) && isNotReadableStream(contentSource);

      if (isString(typeId)) {
        // verify that the type exists for the tenant
        await this.#documentTypeRepository.loadByQuery({ tenantId: { $or: [null, tenantId] }, id: typeId });
      }

      const document = await this.repository.withTransaction(tx).insert({
        tenantId,
        typeId: typeId ?? null,
        title: title ?? null,
        subtitle: subtitle ?? null,
        pages: -1,
        date: date ?? null,
        summary: summary ?? null,
        approval: approval ?? DocumentApproval.Pending,
        comment: comment ?? null,
        createUserId: createUserId ?? null,
        originalFileName: originalFileName ?? null,
        mimeType: 'pending',
        hash: 'pending',
        size: -1,
        metadata,
      });

      if (isDefined(tags)) {
        await this.#documentTagService.withTransaction(tx).assignTags(document, tags);
      }

      const [documentMetadata, content] = isUpload
        ? await this.#documentFileService.withTransaction(tx).store(document.id, contentSource)
        : [await this.#documentFileService.withTransaction(tx).store(document.id, contentSource), contentSource] as const;

      const pages = documentMetadata.mimeType.includes('pdf') ? await tryIgnoreLogAsync(this.#logger, async () => await getPdfPageCount(content), null) : null;

      await this.repository.withTransaction(tx).update(document.id, {
        mimeType: documentMetadata.mimeType,
        hash: documentMetadata.hash,
        size: documentMetadata.size,
        pages,
      });

      if (isDefined(properties)) {
        await this.#documentPropertyService.withTransaction(tx).setPropertyValues(document, properties);
      }

      await this.withTransaction(tx).createAssignment(document, assignment, tx);
      await this.#workflowService.withTransaction(tx).initiateWorkflow(tenantId, document.id, DocumentWorkflowStep.Classification);

      return document;
    });

    this.#observationService.documentChange(document.id);

    return document;
  }

  async update(tenantId: string, id: string, update: Partial<Pick<Document, UpdatableDocumentProperties>> & { tags?: string[], properties?: SetDocumentPropertyParameters[], collections?: UpdateDocumentCollectionsParameters }): Promise<void> {
    await this.transaction(async (tx) => {
      const document = await this.repository.withTransaction(tx).loadByQuery({ tenantId, id });

      if (document.approval == DocumentApproval.Approved) {
        throw new BadRequestError('Cannot update approved documents.');
      }

      const updateKeyLength = objectKeys(update).length;

      if ((updateKeyLength > 1) || (isUndefined(update.properties) && (updateKeyLength > 0))) {
        await this.repository.withTransaction(tx).update(id, update);
      }

      if (isDefined(update.tags)) {
        await this.#documentTagService.withTransaction(tx).assignTags(document, update.tags);
      }

      if (isDefined(update.properties)) {
        await this.#documentPropertyService.withTransaction(tx).setPropertyValues(document, update.properties);
      }

      if (isDefined(update.collections)) {
        const { assign, archive } = update.collections;

        if (isDefined(assign)) {
          await this.#collectionService.withTransaction(tx).assignDocument(document, assign);
        }

        if (isDefined(archive)) {
          await this.#collectionService.withTransaction(tx).archiveDocument(document, archive);
        }
      }

      this.#observationService.documentChange(id, tx);
    });
  }

  async getContent(tenantId: string, documentId: string): Promise<Uint8Array> {
    const document = await this.repository.loadByQuery({ tenantId, id: documentId });
    return await this.#documentFileService.getContent(document);
  }

  getContentStream(tenantId: string, documentId: string): ReadableStream<Uint8Array> {
    return readableStreamFromPromise(async () => {
      const document = await this.repository.loadByQuery({ tenantId, id: documentId });
      return this.#documentFileService.getContentStream(document);
    });
  }

  async getContentUrl(tenantId: string, documentId: string, download: boolean = false): Promise<string> {
    const document = await this.repository.loadByQuery({ tenantId, id: documentId });
    return await this.#documentFileService.getContentUrl(document, download);
  }

  async getPreview(tenantId: string, documentId: string, page: number = 1): Promise<Uint8Array> {
    const document = await this.repository.loadByQuery({ tenantId, id: documentId });
    return await this.#documentFileService.getPreview(document, page);
  }

  getPreviewStream(tenantId: string, documentId: string, page: number = 1): ReadableStream<Uint8Array> {
    return readableStreamFromPromise(async () => {
      const document = await this.repository.loadByQuery({ tenantId, id: documentId });
      return this.#documentFileService.getPreviewStream(document, page);
    });
  }

  async getPreviewUrl(tenantId: string, documentId: string, page: number = 1): Promise<string> {
    const document = await this.repository.loadByQuery({ tenantId, id: documentId });
    return await this.#documentFileService.getPreviewUrl(document, page);
  }

  /**
   * @returns collectionIds from either direct assignment or automatic assignment scope
   */
  private async createAssignment(document: Document, assignment: CreateDocumentParameters['assignment'], transaction: Transaction): Promise<void> {
    await match(assignment)
      .with({ collections: P.select() }, async (collectionIds) => {
        const collectionIdsArray = toArray(collectionIds);
        await this.#collectionService.withTransaction(transaction).assignDocument(document, collectionIdsArray);
      })
      .with({ request: P.select() }, async (requestId) => {
        await this.#requestService.withTransaction(transaction).assignDocument(document, requestId);
      })
      .with({ automatic: P.select() }, async ({ target, scope }) => {
        const collectionIdsArray = toArray(scope);

        const assignmentTask = await this.#documentAssignmentTaskRepository.withTransaction(transaction).insert({ tenantId: document.tenantId, documentId: document.id, target });

        for (const collectionId of collectionIdsArray) {
          await this.#documentAssignmentScopeRepository.withTransaction(transaction).insert({ tenantId: document.tenantId, taskId: assignmentTask.id, collectionId });
        }
      })
      .exhaustive();

    this.#observationService.documentChange(document.id, this.session);
  }
}
