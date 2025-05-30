import { match, P } from 'ts-pattern';

import { DocumentApproval, DocumentAssignmentScope, DocumentAssignmentTask, DocumentWorkflowStep, type UpdatableDocumentProperties } from '#/document-management/models/index.js';
import type { CreateDocumentParameters, SetDocumentPropertyParameters } from '#/document-management/service-models/index.js';
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
import { Document } from '../../models/index.js';
import { DocumentCollectionService } from './document-collection.service.js';
import { DocumentFileService } from './document-file.service.js';
import { DocumentPropertyService } from './document-property.service.js';
import { DocumentRequestService } from './document-request.service.js';
import { DocumentWorkflowService } from './document-workflow.service.js';
import { DocumentManagementSingleton } from './singleton.js';

@DocumentManagementSingleton()
export class DocumentService extends Transactional {
  readonly #documentFileService = injectTransactional(DocumentFileService);
  readonly #requestService = injectTransactional(DocumentRequestService);
  readonly #workflowService = injectTransactional(DocumentWorkflowService);
  readonly #documentPropertyService = injectTransactional(DocumentPropertyService);
  readonly #documentCollectionService = injectTransactional(DocumentCollectionService);
  readonly #documentAssignmentTaskRepository = injectRepository(DocumentAssignmentTask);
  readonly #documentAssignmentScopeRepository = injectRepository(DocumentAssignmentScope);
  readonly #logger = inject(Logger, DocumentService.name);

  readonly repository = injectRepository(Document);

  async create({ typeId, title, subtitle, date, summary, tags, approval, comment, originalFileName, assignment, properties, metadata }: TypedOmit<CreateDocumentParameters, 'uploadId'>, contentSource: Uint8Array | ReadableStream<Uint8Array> | { uploadId: string, uploadKey: string }, { createUserId }: { createUserId?: string }): Promise<Document> {
    const document = await this.transaction(async (tx) => {
      const isUpload = isNotUint8Array(contentSource) && isNotReadableStream(contentSource);

      const document = await this.repository.withTransaction(tx).insert({
        typeId: typeId ?? null,
        title: title ?? null,
        subtitle: subtitle ?? null,
        pages: -1,
        date: date ?? null,
        summary: summary ?? null,
        tags: tags ?? null,
        approval: approval ?? DocumentApproval.Pending,
        comment: comment ?? null,
        createUserId: createUserId ?? null,
        originalFileName: originalFileName ?? null,
        mimeType: 'pending',
        hash: 'pending',
        size: -1,
        metadata,
      });

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
        await this.#documentPropertyService.withTransaction(tx).setPropertyValues(document.id, properties);
      }

      await this.withTransaction(tx).createAssignment(document.id, assignment, tx);
      await this.#workflowService.withTransaction(tx).initiateWorkflow(document.id, DocumentWorkflowStep.Classification);

      return document;
    });

    return document;
  }

  async update(id: string, update: Partial<Pick<Document, UpdatableDocumentProperties>> & { properties?: SetDocumentPropertyParameters[] }): Promise<void> {
    await this.transaction(async (tx) => {
      const document = await this.repository.withTransaction(tx).load(id);

      if (document.approval == DocumentApproval.Approved) {
        throw new BadRequestError('Cannot update approved documents.');
      }

      const updateKeyLength = objectKeys(update).length;

      if ((updateKeyLength > 1) || (isUndefined(update.properties) && (updateKeyLength > 0))) {
        await this.repository.withTransaction(tx).update(id, update);
      }

      if (isDefined(update.properties)) {
        await this.#documentPropertyService.withTransaction(tx).setPropertyValues(id, update.properties);
      }
    });
  }

  async getContent(documentOrId: Document | string): Promise<Uint8Array> {
    const document = isString(documentOrId) ? await this.repository.load(documentOrId) : documentOrId;
    return await this.#documentFileService.getContent(document.id);
  }

  getContentStream(documentOrId: Document | string): ReadableStream<Uint8Array> {
    return readableStreamFromPromise(async () => {
      const document = isString(documentOrId) ? await this.repository.load(documentOrId) : documentOrId;
      return this.#documentFileService.getContentStream(document.id);
    });
  }

  async getContentUrl(documentOrId: Document | string, download: boolean = false): Promise<string> {
    const document = isString(documentOrId) ? await this.repository.load(documentOrId) : documentOrId;
    return await this.#documentFileService.getContentUrl(document.id, document.title, download);
  }

  async getPreview(documentOrId: Document | string, page: number = 1): Promise<Uint8Array> {
    const document = isString(documentOrId) ? await this.repository.load(documentOrId) : documentOrId;
    return await this.#documentFileService.getPreview(document.id, page);
  }

  getPreviewStream(documentOrId: Document | string, page: number = 1): ReadableStream<Uint8Array> {
    return readableStreamFromPromise(async () => {
      const document = isString(documentOrId) ? await this.repository.load(documentOrId) : documentOrId;
      return this.#documentFileService.getPreviewStream(document.id, page);
    });
  }

  async getPreviewUrl(documentOrId: Document | string, page: number = 1): Promise<string> {
    const document = isString(documentOrId) ? await this.repository.load(documentOrId) : documentOrId;
    return await this.#documentFileService.getPreviewUrl(document.id, page);
  }

  /**
   * @returns collectionIds from either direct assignment or automatic assignment scope
   */
  private async createAssignment(documentId: string, assignment: CreateDocumentParameters['assignment'], transaction: Transaction): Promise<void> {
    await match(assignment)
      .with({ collections: P.select() }, async (collectionIds) => {
        const collectionIdsArray = toArray(collectionIds);
        await this.#documentCollectionService.withTransaction(transaction).assignDocument(documentId, collectionIdsArray);
      })
      .with({ request: P.select() }, async (requestId) => {
        await this.#requestService.withTransaction(transaction).assignDocument(requestId, documentId);
      })
      .with({ automatic: P.select() }, async ({ target, scope }) => {
        const collectionIdsArray = toArray(scope);
        const assignmentTask = await this.#documentAssignmentTaskRepository.withTransaction(transaction).insert({ documentId: documentId, target });

        for (const collectionId of collectionIdsArray) {
          await this.#documentAssignmentScopeRepository.withTransaction(transaction).insert({ taskId: assignmentTask.id, collectionId });
        }
      })
      .exhaustive();
  }
}
