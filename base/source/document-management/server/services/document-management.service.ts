import { and, eq, inArray, ne, notExists, sql } from 'drizzle-orm';
import type { GetSelectTableSelection, SelectResultField } from 'drizzle-orm/query-builders/select.types';
import { P, match } from 'ts-pattern';
import type { RequireExactlyOne, Stringified } from 'type-fest';

import type { GenerationRequest } from '#/ai/index.js';
import { AiService } from '#/ai/index.js';
import type { CancellationSignal } from '#/cancellation/token.js';
import { Enumerable } from '#/enumerable/index.js';
import { BadRequestError } from '#/errors/index.js';
import { TemporaryFile, getMimeType, getMimeTypeExtensions } from '#/file/index.js';
import { type AfterResolve, type AfterResolveContext, Singleton, afterResolve, inject, injectArgument, provide, resolveArgumentType } from '#/injector/index.js';
import { Logger } from '#/logger/logger.js';
import { ObjectStorage } from '#/object-storage/index.js';
import type { NewEntity, Query } from '#/orm/index.js';
import { getEntityMap } from '#/orm/index.js';
import { DatabaseConfig, EntityRepositoryConfig, TRANSACTION_TIMESTAMP, type Transaction, arrayAgg, coalesce, injectRepository, jsonAgg, toJsonb } from '#/orm/server/index.js';
import { getPdfPageCount } from '#/pdf/index.js';
import { Queue } from '#/queue/queue.js';
import { array, boolean, enumeration, integer, nullable, number, object, string } from '#/schema/index.js';
import type { OneOrMany, Record } from '#/types.js';
import { distinct, toArray } from '#/utils/array/index.js';
import { compareByValueSelectionToOrder } from '#/utils/comparison.js';
import { digest } from '#/utils/cryptography.js';
import { currentTimestamp, dateObjectToNumericDate } from '#/utils/date-time.js';
import { groupToMap } from '#/utils/iterable-helpers/index.js';
import { fromEntries, objectEntries } from '#/utils/object/object.js';
import { readBinaryStream } from '#/utils/stream/index.js';
import { tryIgnoreLogAsync } from '#/utils/try-ignore.js';
import { assertBooleanPass, assertDefined, assertDefinedPass, assertNotNullPass, assertNumberPass, assertStringPass, isBoolean, isDefined, isNotNull, isNull, isNumber, isString, isUint8Array, isUndefined } from '#/utils/type-guards.js';
import { millisecondsPerMinute } from '#/utils/units.js';
import { type AddOrArchiveDocumentToOrFromCollectionParameters, type ApplyDocumentRequestsTemplateParameters, type ApproveDocumentRequestFileParameters, type AssignPropertyToTypeParameters, type CategoryAndTypesView, type CreateCollectionParameters, type CreateDocumentCategoryParameters, type CreateDocumentParameters, type CreateDocumentPropertyParameters, type CreateDocumentRequestFileParameters, type CreateDocumentRequestParameters, type CreateDocumentRequestTemplateParameters, type CreateDocumentRequestsTemplateParameters, type CreateDocumentTypeParameters, type DeleteDocumentRequestFileParameters, type DeleteDocumentRequestParameters, type DeleteDocumentRequestTemplateParameters, type DeleteDocumentRequestsTemplateParameters, Document, DocumentCategory, DocumentCollection, DocumentCollectionDocument, DocumentFile, type DocumentManagementData, DocumentProperty, DocumentPropertyDataType, DocumentPropertyValue, type DocumentPropertyValueBase, DocumentRequest, DocumentRequestAssignmentTask, DocumentRequestAssignmentTaskCollection, DocumentRequestAssignmentTaskPropertyValue, DocumentRequestCollection, DocumentRequestFile, DocumentRequestFilePropertyValue, DocumentRequestTemplate, type DocumentRequestView, DocumentRequestsTemplate, type DocumentRequestsTemplateData, type DocumentRequestsTemplateView, DocumentType, DocumentTypeProperty, type DocumentView, type LoadDataCollectionsMetadataParameters, type RejectDocumentRequestFileParameters, type RequestFilesStats, type SetDocumentPropertiesParameters, type UpdateDocumentParameters, type UpdateDocumentRequestFileParameters, type UpdateDocumentRequestParameters, type UpdateDocumentRequestTemplateParameters, type UpdateDocumentRequestsTemplateParameters } from '../../models/index.js';
import { DocumentManagementConfig } from '../module.js';
import { documentCategory, documentProperty, documentRequest, documentRequestAssignmentTask, documentRequestAssignmentTaskCollection, documentRequestAssignmentTaskPropertyValue, documentRequestCollection, documentRequestFile, documentType } from '../schemas.js';
import { DocumentManagementAncillaryService } from './document-management-ancillary.service.js';

export type DocumentServiceArgument = DocumentManagementConfig;

type DocumentInformationExtractionPropertyResult = { propertyId: string, dataType: DocumentPropertyDataType, value: string | number | boolean };

export type DocumentInformationExtractionResult = {
  typeId: string | null,
  title: string,
  subtitle: string | null,
  pages: number | null,
  date: number | null,
  summary: string,
  tags: string[],
  properties: DocumentInformationExtractionPropertyResult[]
};

type ExtractionJobData = RequireExactlyOne<{ documentId: string, requestFileId: string, requestAssignmentTaskId: string }>;
type AssignmentJobData = RequireExactlyOne<{ requestAssignmentTaskId: string }>;

const defaultGenerationOptions = {
  model: 'gemini-2.0-flash',
  generationOptions: {
    maxOutputTokens: 2048,
    temperature: 0.2,
    topP: 0.2
  }
} satisfies Partial<GenerationRequest>;

@Singleton({
  providers: [
    provide(EntityRepositoryConfig, { useValue: { schema: 'document_management' } }),
    { provide: DatabaseConfig, useFactory: (_, context) => context.resolve(DocumentManagementConfig).database ?? context.resolve(DatabaseConfig, undefined, { skipSelf: true }) }
  ]
})
export class DocumentManagementService implements AfterResolve<DocumentServiceArgument, any> {
  readonly #aiService = inject(AiService);

  protected readonly ancillaryService = inject(DocumentManagementAncillaryService);
  protected readonly documentCategoryService = injectRepository(DocumentCategory);
  protected readonly documentCollectionDocumentService = injectRepository(DocumentCollectionDocument);
  protected readonly documentCollectionService = injectRepository(DocumentCollection);
  protected readonly documentFileService = injectRepository(DocumentFile);
  protected readonly documentPropertyService = injectRepository(DocumentProperty);
  protected readonly documentPropertyValueService = injectRepository(DocumentPropertyValue);
  protected readonly documentRequestAssignmentTaskCollectionService = injectRepository(DocumentRequestAssignmentTaskCollection);
  protected readonly documentRequestAssignmentTaskService = injectRepository(DocumentRequestAssignmentTask);
  protected readonly documentRequestCollectionService = injectRepository(DocumentRequestCollection);
  protected readonly documentRequestFilePropertyValueService = injectRepository(DocumentRequestFilePropertyValue);
  protected readonly documentRequestAssignmentTaskPropertyValueService = injectRepository(DocumentRequestAssignmentTaskPropertyValue);
  protected readonly documentRequestFileService = injectRepository(DocumentRequestFile);
  protected readonly documentRequestService = injectRepository(DocumentRequest);
  protected readonly documentRequestsTemplateService = injectRepository(DocumentRequestsTemplate);
  protected readonly documentRequestTemplateService = injectRepository(DocumentRequestTemplate);
  protected readonly documentService = injectRepository(Document);
  protected readonly documentTypePropertyService = injectRepository(DocumentTypeProperty);
  protected readonly documentTypeService = injectRepository(DocumentType);
  protected readonly fileObjectStorage = inject(ObjectStorage, (injectArgument(this, { optional: true }) ?? inject(DocumentManagementConfig)).fileObjectStorageModule);
  protected readonly extractionQueue = inject(Queue<ExtractionJobData>, { name: 'DocumentManagement:extraction', processTimeout: 15 * millisecondsPerMinute });
  protected readonly assignmentQueue = inject(Queue<AssignmentJobData>, { name: 'DocumentManagement:assignment', processTimeout: 15 * millisecondsPerMinute });
  protected readonly logger = inject(Logger, DocumentManagementService.name);

  declare readonly [resolveArgumentType]: DocumentServiceArgument;

  [afterResolve](_: unknown, { cancellationSignal }: AfterResolveContext<any>): void {
    this.processQueues(cancellationSignal);
  }

  processQueues(cancellationSignal: CancellationSignal): void {
    this.extractionQueue.process(
      { concurrency: 1, cancellationSignal },
      async (job) => {
        const [entry] = objectEntries(job.data);
        this.logger.info(`Processing extraction job for ${entry?.[0]} "${entry?.[1]}"`);

        await match(job.data)
          .with({ documentId: P.string.select() }, async (documentId) => this.enrichDocument(documentId))
          .with({ requestFileId: P.string.select() }, async (requestFileId) => this.enrichDocumentRequestFile(requestFileId))
          .with({ requestAssignmentTaskId: P.string.select() }, async (requestAssignmentTaskId) => this.enrichDocumentRequestAssignmentTask(requestAssignmentTaskId))
          .exhaustive();
      },
      this.logger
    );

    this.assignmentQueue.process(
      { concurrency: 1, cancellationSignal },
      async (job) => {
        this.logger.info(`Processing assignment job "${job.data.requestAssignmentTaskId}"`);
        await this.assignDocumentRequest(job.data.requestAssignmentTaskId);
      },
      this.logger
    );
  }

  async resolveNames<const T extends (DocumentCollection | string)[]>(...collectionsOrIds: T): Promise<Stringified<T>> {
    if (collectionsOrIds.length == 0) {
      return [] as Stringified<T>;
    }

    const loadIds = collectionsOrIds.filter((collection) => isString(collection));

    if (loadIds.length == 0) {
      return this.ancillaryService.resolveNames(collectionsOrIds as DocumentCollection[]) as Stringified<T>;
    }

    const loadedCollections = await this.documentCollectionService.loadManyByQuery({ id: { $in: loadIds } });

    const collections = collectionsOrIds.map(
      (collectionOrId) => isString(collectionOrId)
        ? assertDefinedPass(loadedCollections.find((collection) => collection.id == collectionOrId), `Could not load collection "${collectionOrId}".`)
        : collectionOrId
    );

    return this.ancillaryService.resolveNames(collections) as Stringified<T>;
  }

  async resolveNamesMap(...collectionsOrIds: (DocumentCollection | string)[]): Promise<Record<string, string>> {
    const names = await this.resolveNames(...collectionsOrIds);
    const entries = collectionsOrIds.map((collectionOrId, index) => [isString(collectionOrId) ? collectionOrId : collectionOrId.id, names[index]!] as const);

    return fromEntries(entries);
  }

  async loadData(collectionIds: string[], collectionsMetadata?: LoadDataCollectionsMetadataParameters): Promise<DocumentManagementData> {
    return this.documentCollectionService.transaction(async (_, transaction) => {
      const [collections, collectionDocuments, requestCollections, categories, types] = await Promise.all([
        this.documentCollectionService.withTransaction(transaction).loadMany(collectionIds),
        this.documentCollectionDocumentService.withTransaction(transaction).loadManyByQuery({ collectionId: { $in: collectionIds } }),
        this.documentRequestCollectionService.withTransaction(transaction).loadManyByQuery({ collectionId: { $in: collectionIds } }),
        this.documentCategoryService.withTransaction(transaction).loadManyByQuery({}, { order: 'label' }),
        this.documentTypeService.withTransaction(transaction).loadManyByQuery({}, { order: 'label' })
      ]);

      const documentIds = collectionDocuments.map((document) => document.documentId);
      const requestIds = requestCollections.map((requestCollection) => requestCollection.requestId);

      const [documents, requests, requestFiles, propertyValues] = await Promise.all([
        this.documentService.withTransaction(transaction).loadManyByQuery({ id: { $in: documentIds } }, { order: { 'metadata.createTimestamp': 'desc' } }),
        this.documentRequestService.withTransaction(transaction).loadManyByQuery({ id: { $in: requestIds } }, { order: { 'metadata.createTimestamp': 'desc' } }),
        this.documentRequestFileService.withTransaction(transaction).loadManyByQuery({ requestId: { $in: requestIds } }, { order: { 'metadata.createTimestamp': 'desc' } }),
        this.documentPropertyValueService.withTransaction(transaction).loadManyByQuery({ documentId: { $in: documentIds } })
      ]);

      const documentFileIds = documents.map((document) => document.fileId);
      const requestFileIds = requestFiles.map((requestFile) => requestFile.fileId);

      const files = await this.documentFileService.withTransaction(transaction).loadManyByQuery({ id: { $in: [...documentFileIds, ...requestFileIds] } }, { order: { 'metadata.createTimestamp': 'desc' } });

      const requestsFilesMap = groupToMap(requestFiles, (requestFile) => requestFile.requestId);
      const valuesMap = Enumerable.from(propertyValues).groupToMap((value) => value.documentId);

      const collectionViews = collections.toSorted(compareByValueSelectionToOrder(collectionIds, (collection) => collection.id)).map((collection) => ({
        ...collection,
        name: collectionsMetadata?.[collection.id]?.name ?? null,
        group: collectionsMetadata?.[collection.id]?.group ?? null
      }));

      const documentViews = documents.map((document): DocumentView => ({
        ...document,
        collectionAssignments: collectionDocuments.filter((collectionDocument) => collectionDocument.documentId == document.id).map(({ collectionId, archiveTimestamp }) => ({ collectionId, archiveTimestamp })),
        properties: valuesMap.get(document.id) ?? []
      }));

      const requestViews = requests.map((request): DocumentRequestView => ({
        ...request,
        collectionIds: requestCollections.filter((requestCollection) => requestCollection.requestId == request.id).map((requestCollection) => requestCollection.collectionId),
        requestFiles: requestsFilesMap.get(request.id) ?? []
      }));

      return {
        collections: collectionViews,
        documents: documentViews,
        requests: requestViews,
        files,
        categories,
        types
      };
    });
  }

  async loadDocumentRequestsTemplateData(): Promise<DocumentRequestsTemplateData> {
    const [requestsTemplates, requestTemplates] = await Promise.all([
      this.documentRequestsTemplateService.loadManyByQuery({}, { order: 'label' }),
      this.documentRequestTemplateService.loadManyByQuery({})
    ]);

    const templates = requestsTemplates.map((requestsTemplate): DocumentRequestsTemplateView => ({
      ...requestsTemplate,
      requestTemplates: requestTemplates.filter((requestTemplate) => requestTemplate.requestsTemplateId == requestsTemplate.id)
    }));

    return { templates };
  }

  async loadCategoriesAndTypes(): Promise<CategoryAndTypesView> {
    const [categories, types] = await Promise.all([
      this.documentCategoryService.loadManyByQuery({}, { order: 'label' }),
      this.documentTypeService.loadManyByQuery({}, { order: 'label' })
    ]);

    return { categories, types };
  }

  async loadDocument(id: string): Promise<Document> {
    return this.documentService.load(id);
  }

  async loadDocumentFile(id: string): Promise<DocumentFile> {
    return this.documentFileService.load(id);
  }

  async loadType(id: string): Promise<DocumentType> {
    return this.documentTypeService.load(id);
  }

  async getFileContentUrl(fileId: string, title: string | null, download: boolean = false): Promise<string> {
    const file = await this.documentFileService.load(fileId);
    return this.getDocumentFileContentObjectUrl(title ?? fileId, file, download);
  }

  async createCategory(parameters: CreateDocumentCategoryParameters): Promise<DocumentCategory> {
    return this.documentCategoryService.insert(parameters);
  }

  async createType(parameters: CreateDocumentTypeParameters): Promise<DocumentType> {
    return this.documentTypeService.insert(parameters);
  }

  async createCollection(parameters?: CreateCollectionParameters): Promise<DocumentCollection> {
    return this.documentCollectionService.insert(parameters ?? {});
  }

  async collectionHasDocumentByFilter(collectionId: string, filter: Query<Document>): Promise<boolean> {
    const collectionDocuments = await this.documentCollectionDocumentService.loadManyByQuery({ collectionId });
    const documentIds = collectionDocuments.map((cd) => cd.documentId);

    return this.documentService.hasByQuery({ $and: [{ id: { $in: documentIds } }, filter] });
  }

  async getRequestFilesStats(collectionIds: OneOrMany<string>): Promise<RequestFilesStats> {
    const collectionRequests = await this.documentRequestCollectionService.loadManyByQuery({ collectionId: { $in: toArray(collectionIds) } });
    const requestIds = collectionRequests.map((collectionRequest) => collectionRequest.requestId);
    const filteredRequests = await this.documentRequestService.loadManyByQuery({ id: { $in: requestIds }, completed: false });
    const filteredRequestIds = filteredRequests.map((request) => request.id);

    const requiredFilesCount = filteredRequests.reduce((sum, request) => sum + request.requiredFilesCount, 0);

    const [pendingFilesCount, approvedFilesCount] = await Promise.all([
      this.documentRequestFileService.countByQuery({ requestId: { $in: filteredRequestIds }, approval: null }),
      this.documentRequestFileService.countByQuery({ requestId: { $in: filteredRequestIds }, approval: true })
    ]);

    return { requiredFilesCount, requiredFilesLeft: Math.max(0, requiredFilesCount - approvedFilesCount), pendingFilesCount, approvedFilesCount };
  }

  async createDocumentRequestsTemplate(parameters: CreateDocumentRequestsTemplateParameters): Promise<DocumentRequestsTemplate> {
    return this.documentRequestsTemplateService.insert(parameters);
  }

  async updateDocumentRequestsTemplate({ id, label, metadata }: UpdateDocumentRequestsTemplateParameters): Promise<DocumentRequestsTemplate> {
    return this.documentRequestsTemplateService.update(id, { label, metadata });
  }

  async applyDocumentRequestsTemplate({ id, collectionIds, metadata }: ApplyDocumentRequestsTemplateParameters): Promise<void> {
    const requestTemplates = await this.documentRequestTemplateService.loadManyByQuery({ requestsTemplateId: id });

    await this.documentRequestService.transaction(async (_, transaction) => {
      for (const { typeId, requiredFilesCount, comment } of requestTemplates) {
        await this.createDocumentRequest({ typeId, requiredFilesCount, comment, collectionIds, metadata }, transaction);
      }
    });
  }

  async deleteDocumentRequestsTemplate(parameters: DeleteDocumentRequestsTemplateParameters): Promise<DocumentRequestsTemplate> {
    return this.documentRequestsTemplateService.delete(parameters.id);
  }

  async createDocumentRequestTemplate(parameters: CreateDocumentRequestTemplateParameters): Promise<DocumentRequestTemplate> {
    return this.documentRequestTemplateService.insert(parameters);
  }

  async updateDocumentRequestTemplate({ id, typeId, requiredFilesCount, comment, metadata }: UpdateDocumentRequestTemplateParameters): Promise<DocumentRequestTemplate> {
    return this.documentRequestTemplateService.update(id, { typeId, requiredFilesCount, comment, metadata });
  }

  async deleteDocumentRequestTemplate(parameters: DeleteDocumentRequestTemplateParameters): Promise<DocumentRequestTemplate> {
    return this.documentRequestTemplateService.delete(parameters.id);
  }

  async createDocument({ typeId, title, subtitle, pages, date, summary, tags, originalFileName, collectionIds, properties, metadata }: CreateDocumentParameters, content: Uint8Array | ReadableStream<Uint8Array>): Promise<Document> {
    const document = await this.documentService.transaction(async (_, transaction) => {
      const documentFile = await this.createDocumentFile(content, originalFileName, transaction);
      const document = await this.documentService.withTransaction(transaction).insert({ fileId: documentFile.id, typeId, title, subtitle, pages, date, summary, tags, metadata });

      for (const collectionId of toArray(collectionIds)) {
        await this.documentCollectionDocumentService.withTransaction(transaction).insert({ collectionId, documentId: document.id, archiveTimestamp: null });
      }

      if (isDefined(properties)) {
        await this.setPropertyValues({ documentId: document.id, properties }, transaction);
      }

      return document;
    });

    void tryIgnoreLogAsync(async () => this.extractionQueue.enqueue({ documentId: document.id }), this.logger);

    return document;
  }

  async approveDocumentRequestFile({ id, approvalComment, documentMetadata, requestFileMetadata }: ApproveDocumentRequestFileParameters): Promise<Document> {
    return this.documentRequestFileService.transaction(async (_, transaction) => {
      const requestFile = await this.documentRequestFileService.withTransaction(transaction).load(id);
      const requestCollections = await this.documentRequestCollectionService.withTransaction(transaction).loadManyByQuery({ requestId: requestFile.requestId });

      if (requestFile.approval == true) {
        throw new BadRequestError('Document request file already accepted.');
      }

      const request = await this.documentRequestService.withTransaction(transaction).load(requestFile.requestId);

      const document = await this.documentService.withTransaction(transaction).insert({
        fileId: requestFile.fileId,
        typeId: request.typeId,
        title: requestFile.title,
        subtitle: requestFile.subtitle,
        pages: requestFile.pages,
        date: requestFile.date,
        summary: requestFile.summary,
        tags: requestFile.tags,
        metadata: documentMetadata
      });

      for (const { collectionId } of requestCollections) {
        await this.addDocumentToCollection({ collectionId, documentId: document.id }, transaction);
      }

      await this.documentRequestFileService.withTransaction(transaction).update(id, { approval: true, approvalComment, approvalTimestamp: TRANSACTION_TIMESTAMP, createdDocumentId: document.id, metadata: requestFileMetadata });

      return document;
    });
  }

  async rejectDocumentRequestFile({ id, approvalComment, metadata }: RejectDocumentRequestFileParameters): Promise<void> {
    return this.documentRequestFileService.transaction(async (_, transaction) => {
      const requestFile = await this.documentRequestFileService.withTransaction(transaction).load(id);

      if (requestFile.approval == true) {
        throw new BadRequestError('Document request file already accepted.');
      }

      await this.documentRequestFileService.withTransaction(transaction).update(id, { approval: false, approvalComment, approvalTimestamp: TRANSACTION_TIMESTAMP, metadata });
    });
  }

  async updateDocumentRequestFile({ id, title, approvalComment, metadata }: UpdateDocumentRequestFileParameters): Promise<DocumentRequestFile> {
    return this.documentRequestFileService.update(id, { title, approvalComment, metadata });
  }

  async deleteDocumentRequestFile({ id, metadata }: DeleteDocumentRequestFileParameters): Promise<void> {
    const requestFile = await this.documentRequestFileService.load(id);

    if (isNotNull(requestFile.approval)) {
      throw new BadRequestError('Only pending request files can be deleted.');
    }

    await this.documentRequestFileService.delete(id, metadata);
  }

  async createDocumentFile(content: Uint8Array | ReadableStream<Uint8Array>, originalFileName: string | null, transaction?: Transaction): Promise<DocumentFile> {
    const contentAsUint8Array = isUint8Array(content) ? content : await readBinaryStream(content);
    const hash = await digest('SHA-256', contentAsUint8Array).toHex();
    const mimeType = await getMimeType(contentAsUint8Array);

    return this.documentFileService.useTransaction(transaction, async (_, transaction) => {
      const documentFile = await this.documentFileService
        .withTransaction(transaction)
        .insert({
          originalFileName,
          mimeType,
          hash,
          size: contentAsUint8Array.length
        });

      const key = getDocumentFileKey(documentFile.id);
      await this.fileObjectStorage.uploadObject(key, contentAsUint8Array);

      return documentFile;
    });
  }

  async createDocumentRequestFile({ requestId, title, subtitle, date, summary, tags, originalFileName, metadata }: CreateDocumentRequestFileParameters, content: Uint8Array | ReadableStream<Uint8Array>): Promise<DocumentRequestFile> {
    const documentRequestFile = await this.documentRequestFileService.transaction(async (_, transaction) => {
      const [request, existingRequestFiles] = await Promise.all([
        this.documentRequestService.withTransaction(transaction).load(requestId),
        this.documentRequestFileService.withTransaction(transaction).loadManyByQuery({ requestId })
      ]);

      const filesCountLeft = (request.completed ? 0 : request.requiredFilesCount) - existingRequestFiles.reduce((sum, requestFile) => sum + ((requestFile.approval != false) ? 1 : 0), 0);

      if (filesCountLeft <= 0) {
        throw new BadRequestError('Maximum amount of allowed files reached.');
      }

      const file = await this.createDocumentFile(content, originalFileName, transaction);

      return await this.documentRequestFileService
        .withTransaction(transaction)
        .insert({
          requestId,
          fileId: file.id,
          title,
          subtitle,
          pages: null,
          date,
          summary,
          tags,
          createdDocumentId: null,
          approval: null,
          approvalComment: null,
          approvalTimestamp: null,
          metadata
        });
    });

    void tryIgnoreLogAsync(async () => this.extractionQueue.enqueue({ requestFileId: documentRequestFile.id }), this.logger);

    return documentRequestFile;
  }

  async createDocumentRequest(parameters: CreateDocumentRequestParameters, transaction?: Transaction): Promise<DocumentRequest> {
    if (parameters.collectionIds.length == 0) {
      throw new BadRequestError('No target collectionId specified.');
    }

    return this.documentRequestService.useTransaction(transaction, async (_, tx) => {
      const request = await this.documentRequestService.withTransaction(tx).insert({ ...parameters, completed: false });

      const newDocumentRequestCollections = parameters.collectionIds.map((collectionId): NewEntity<DocumentRequestCollection> => ({ requestId: request.id, collectionId }));
      await this.documentRequestCollectionService.withTransaction(tx).insertMany(newDocumentRequestCollections);

      return request;
    });
  }

  async createDocumentRequestAssignmentTask({ originalFileName, collectionIds }: { originalFileName: string, collectionIds: string[] }, content: Uint8Array | ReadableStream<Uint8Array>): Promise<DocumentRequestAssignmentTask> {
    if (collectionIds.length == 0) {
      throw new BadRequestError('No target collectionId specified.');
    }

    const file = await this.createDocumentFile(content, originalFileName);

    return this.documentRequestAssignmentTaskService.transaction(async (_, transaction) => {
      const task = await this.documentRequestAssignmentTaskService.withTransaction(transaction).insert({
        fileId: file.id,
        assignedRequestFileId: null,
        typeId: null,
        title: null,
        subtitle: null,
        pages: null,
        date: null,
        summary: null,
        tags: null,
        assignmentTries: 0
      });

      const newTaksCollections = collectionIds.map((collectionId): NewEntity<DocumentRequestAssignmentTaskCollection> => ({ requestAssignmentTaskId: task.id, collectionId }));
      await this.documentRequestAssignmentTaskCollectionService.withTransaction(transaction).insertMany(newTaksCollections);
      void tryIgnoreLogAsync(async () => this.extractionQueue.enqueue({ requestAssignmentTaskId: task.id }), this.logger);

      return task;
    });
  }

  async updateDocument(parameters: UpdateDocumentParameters, transaction?: Transaction): Promise<void> {
    const { id: documentId, properties: propertyUpdates, ...update } = parameters;

    await this.documentService.useTransaction(transaction, async (repository, tx) => {
      await repository.update(documentId, update);

      if (isDefined(propertyUpdates)) {
        await this.setPropertyValues({ documentId, properties: propertyUpdates }, tx);
      }
    });
  }

  async updateDocumentRequest(parameters: UpdateDocumentRequestParameters, transaction?: Transaction): Promise<void> {
    const { id: documentRequestId, ...update } = parameters;

    const requestFiles = await this.documentRequestFileService.withOptionalTransaction(transaction).loadManyByQuery({ requestId: parameters.id });

    if (parameters.completed == true) {
      const hasCreatedDocument = requestFiles.some((requestFile) => isNotNull(requestFile.createdDocumentId));

      if (!hasCreatedDocument) {
        throw new BadRequestError('Cannot complete requests which has no approved files.');
      }
    }

    await this.documentRequestService.withOptionalTransaction(transaction).update(documentRequestId, update);
  }

  async deleteDocumentRequest({ id, metadata }: DeleteDocumentRequestParameters, transaction?: Transaction): Promise<void> {
    const requestFiles = await this.documentRequestFileService.loadManyByQuery({ requestId: id });
    const hasCreatedDocument = requestFiles.some((requestFile) => isNotNull(requestFile.createdDocumentId));

    if (hasCreatedDocument) {
      throw new BadRequestError('Cannot delete requests which has approved files.');
    }

    await this.documentRequestService.withOptionalTransaction(transaction).delete(id, metadata);
  }

  async setPropertyValues({ documentId, requestFileId, requestAssignmentTaskId, properties: items }: SetDocumentPropertiesParameters, transaction?: Transaction): Promise<void> {
    if ((items.length == 0)) {
      return;
    }

    if ((Number(isDefined(documentId)) + Number(isDefined(requestFileId)) + Number(isDefined(requestAssignmentTaskId))) != 1) {
      throw new BadRequestError('Exactly one of documentId, requestFileId or requestAssignmentTaskId must be specified.');
    }

    await this.documentPropertyService.useTransaction(transaction, async (_, tx) => {
      const propertyIds = items.map((property) => property.propertyId);

      const properties = await this.documentPropertyService.withTransaction(tx).loadManyByQuery({ id: { $in: propertyIds } });
      const propertiesMap = getEntityMap(properties);

      const propertyItems = items.map(({ propertyId, value, metadata }) => {
        const property = assertDefinedPass(propertiesMap.get(propertyId));

        validatePropertyValue(propertyId, property.dataType, value);

        return {
          propertyId,
          text: (property.dataType == 'text') ? assertStringPass(value) : null,
          integer: (property.dataType == 'integer') ? assertNumberPass(value) : null,
          decimal: (property.dataType == 'decimal') ? assertNumberPass(value) : null,
          boolean: (property.dataType == 'boolean') ? assertBooleanPass(value) : null,
          date: (property.dataType == 'date') ? assertNumberPass(value) : null,
          metadata
        } satisfies NewEntity<DocumentPropertyValueBase>;
      });

      if (isDefined(documentId)) {
        await this.documentPropertyValueService.withTransaction(tx)
          .upsertMany(['documentId', 'propertyId'], propertyItems.map((propertyItem) => ({ ...propertyItem, documentId })));
      }
      else if (isDefined(requestFileId)) {
        await this.documentRequestFilePropertyValueService.withTransaction(tx)
          .upsertMany(['requestFileId', 'propertyId'], propertyItems.map((propertyItem) => ({ ...propertyItem, requestFileId })));
      }
      else if (isDefined(requestAssignmentTaskId)) {
        await this.documentRequestAssignmentTaskPropertyValueService.withTransaction(tx)
          .upsertMany(['requestAssignmentTaskId', 'propertyId'], propertyItems.map((propertyItem) => ({ ...propertyItem, requestAssignmentTaskId })));
      }
    });
  }

  async addDocumentToCollection(parameters: AddOrArchiveDocumentToOrFromCollectionParameters, transaction?: Transaction): Promise<void> {
    await this.documentCollectionDocumentService.withOptionalTransaction(transaction).upsert(['collectionId', 'documentId'], { ...parameters, archiveTimestamp: null });
  }

  async archiveDocument({ collectionId, documentId, metadata }: AddOrArchiveDocumentToOrFromCollectionParameters): Promise<void> {
    await this.documentCollectionDocumentService.updateByQuery({ collectionId, documentId }, { archiveTimestamp: TRANSACTION_TIMESTAMP, metadata });
  }

  async createProperty(parameters: CreateDocumentPropertyParameters): Promise<DocumentProperty> {
    return this.documentPropertyService.insert(parameters);
  }

  async assignPropertyToType(parameters: AssignPropertyToTypeParameters): Promise<void> {
    await this.documentTypePropertyService.insert(parameters);
  }

  protected async enrichDocument(documentId: string): Promise<void> {
    const document = await this.documentService.load(documentId);

    const { properties, ...extractionResult } = await this.extractFileInformation(document.fileId, document.typeId);

    await this.documentService.transaction(async (documentService, transaction) => {
      await documentService.update(document.id, extractionResult);
      await this.setPropertyValues({ documentId, properties: properties }, transaction);
    });
  }

  protected async enrichDocumentRequestFile(requestFileId: string): Promise<void> {
    const requestFile = await this.documentRequestFileService.load(requestFileId);
    const request = await this.documentRequestService.load(requestFile.requestId);

    const { properties, typeId: _, ...extractionResult } = await this.extractFileInformation(requestFile.fileId, request.typeId);

    await this.documentRequestFileService.transaction(async (documentRequestFileService, transaction) => {
      await documentRequestFileService.update(requestFile.id, extractionResult);
      await this.setPropertyValues({ requestFileId, properties: properties }, transaction);
    });
  }

  protected async enrichDocumentRequestAssignmentTask(requestAssignmentTaskId: string): Promise<void> {
    const task = await this.documentRequestAssignmentTaskService.load(requestAssignmentTaskId);

    const { properties, ...extractionResult } = await this.extractFileInformation(task.fileId);

    await this.documentRequestAssignmentTaskService.transaction(async (documentRequestAssignmentTaskService, transaction) => {
      await documentRequestAssignmentTaskService.update(task.id, extractionResult);
      await this.setPropertyValues({ requestAssignmentTaskId, properties: properties }, transaction);
    });

    void tryIgnoreLogAsync(async () => this.assignmentQueue.enqueue({ requestAssignmentTaskId }), this.logger);
  }

  protected async assignDocumentRequest(requestAssignmentTaskId: string): Promise<void> {
    const session = this.documentRequestAssignmentTaskCollectionService.session;

    const requestAssignmentTaskProperties = session.$with('requestAssignmentTaskProperty').as(
      session
        .select({
          requestAssignmentTaskId: documentRequestAssignmentTaskPropertyValue.requestAssignmentTaskId,
          propertyId: documentRequestAssignmentTaskPropertyValue.propertyId,
          label: documentProperty.label,
          value: coalesce(
            toJsonb(documentRequestAssignmentTaskPropertyValue.text),
            toJsonb(documentRequestAssignmentTaskPropertyValue.integer),
            toJsonb(documentRequestAssignmentTaskPropertyValue.decimal),
            toJsonb(documentRequestAssignmentTaskPropertyValue.boolean),
            toJsonb(documentRequestAssignmentTaskPropertyValue.date)
          ).as('value')
        })
        .from(documentRequestAssignmentTaskPropertyValue)
        .innerJoin(documentProperty, eq(documentProperty.id, documentRequestAssignmentTaskPropertyValue.propertyId))
    );

    const [task] = await session
      .with(requestAssignmentTaskProperties)
      .select({
        fileId: documentRequestAssignmentTask.fileId,
        collectionIds: arrayAgg(documentRequestAssignmentTaskCollection.collectionId),
        typeCategory: documentCategory.label,
        typeGroup: documentType.group,
        typeLabel: documentType.label,
        title: documentRequestAssignmentTask.title,
        subtitle: documentRequestAssignmentTask.subtitle,
        pages: documentRequestAssignmentTask.pages,
        date: documentRequestAssignmentTask.date,
        summary: documentRequestAssignmentTask.summary,
        tags: documentRequestAssignmentTask.tags,
        assignmentTries: documentRequestAssignmentTask.assignmentTries,
        properties: sql<SelectResultField<GetSelectTableSelection<typeof requestAssignmentTaskProperties>>[]>`coalesce(${jsonAgg(requestAssignmentTaskProperties)} FILTER (WHERE ${requestAssignmentTaskProperties.propertyId} IS NOT NULL), '[]'::json)`
      })
      .from(documentRequestAssignmentTask)
      .innerJoin(documentRequestAssignmentTaskCollection, eq(documentRequestAssignmentTaskCollection.requestAssignmentTaskId, documentRequestAssignmentTask.id))
      .innerJoin(documentType, eq(documentType.id, documentRequestAssignmentTask.typeId))
      .innerJoin(documentCategory, eq(documentCategory.id, documentType.categoryId))
      .leftJoin(requestAssignmentTaskProperties, eq(requestAssignmentTaskProperties.requestAssignmentTaskId, documentRequestAssignmentTask.id))
      .where(eq(documentRequestAssignmentTask.id, requestAssignmentTaskId))
      .groupBy(
        documentRequestAssignmentTask.fileId,
        requestAssignmentTaskProperties.label,
        documentCategory.label,
        documentType.group,
        documentType.label,
        documentRequestAssignmentTask.title,
        documentRequestAssignmentTask.subtitle,
        documentRequestAssignmentTask.pages,
        documentRequestAssignmentTask.date,
        documentRequestAssignmentTask.summary,
        documentRequestAssignmentTask.tags,
        documentRequestAssignmentTask.assignmentTries
      );

    assertDefined(task);

    if (task.assignmentTries >= 3) {
      this.logger.error(`Ignoring assignment task "${requestAssignmentTaskId}" because max tries are reached.`);
      return;
    }

    const requestsWithoutFiles = await session
      .select({
        id: documentRequest.id,
        collectionIds: arrayAgg(documentRequestCollection.collectionId),
        documentCategory: documentCategory.label,
        documentGroup: documentType.group,
        documentType: documentType.label,
        comment: documentRequest.comment
      })
      .from(documentRequest)
      .innerJoin(documentRequestCollection, eq(documentRequestCollection.requestId, documentRequest.id))
      .innerJoin(documentType, eq(documentType.id, documentRequest.typeId))
      .innerJoin(documentCategory, eq(documentCategory.id, documentType.categoryId))
      .where(
        and(
          inArray(documentRequestCollection.collectionId, task.collectionIds),
          notExists(
            session
              .select()
              .from(documentRequestFile)
              .where(
                and(
                  eq(documentRequestFile.requestId, documentRequest.id),
                  ne(documentRequestFile.approval, false)
                )
              )
          )
        )
      )
      .groupBy(documentRequest.id, documentCategory.label, documentType.group, documentType.label, documentRequest.comment);

    const requestsCollectionIds = distinct(requestsWithoutFiles.flatMap((request) => request.collectionIds));

    const collectionNamesMap = await this.resolveNamesMap(...requestsCollectionIds);

    const requests = requestsWithoutFiles.map((request) => ({
      id: request.id,
      collections: request.collectionIds.map((collectionId) => assertDefinedPass(collectionNamesMap[collectionId])),
      documentCategory: request.documentCategory,
      documentGroup: request.documentGroup ?? undefined,
      documentType: request.documentType,
      comment: request.comment ?? undefined
    }));

    const propertyEntries = task.properties.map((property) => [property.label, assertNotNullPass(property.value)] as const);

    type Context = {
      file: {
        documentCategory: string,
        documentGroup?: string,
        documentType: string,
        properties: Record<string, string | number | boolean>
      },
      requests: {
        id: string,
        collections: string[], // names
        documentCategory: string,
        documentGroup?: string,
        documentType: string,
        comment?: string
      }[]
    };

    const context: Context = {
      file: {
        documentCategory: task.typeCategory,
        documentGroup: task.typeGroup ?? undefined,
        documentType: task.typeLabel,
        properties: fromEntries(propertyEntries)
      },
      requests
    };

    const result = await this.#aiService.generate({
      ...defaultGenerationOptions,
      generationOptions: {
        maxOutputTokens: 100,
        temperature: 0,
        topP: 0.2
      },
      generationSchema: object({ requestId: nullable(string()) }),
      contents: [{
        role: 'user',
        parts: [
          {
            text: `<context>
${JSON.stringify(context, null, 2)}
</context>

Ordne die Datei unter "file" der passenden Anforderungen unter "requests" zu. Gib es als JSON im angegebenen Schema aus. Wenn keine Anforderung passt, setze requestId auf null.`
          }
        ]
      }]
    });

    await this.documentRequestAssignmentTaskService.update(requestAssignmentTaskId, { assignmentTries: sql`${documentRequestAssignmentTask.assignmentTries} + 1` });

    if (isNull(result.json.requestId)) {
      return;
    }

    await this.documentRequestFileService.transaction(async (_, transaction) => {
      const requestFile = await this.documentRequestFileService.withTransaction(transaction).insert({
        requestId: result.json.requestId!,
        fileId: task.fileId,
        title: task.title,
        subtitle: task.subtitle,
        pages: task.pages,
        date: task.date,
        summary: task.summary,
        tags: task.tags,
        createdDocumentId: null,
        approval: null,
        approvalComment: null,
        approvalTimestamp: null
      });

      await this.setPropertyValues({ requestFileId: requestFile.id, properties: task.properties }, transaction);
    });
  }

  protected async extractFileInformation(fileId: string, assumeTypeId?: string | null): Promise<DocumentInformationExtractionResult> {
    const file = await this.documentFileService.load(fileId);
    const fileContentStream = this.getDocumentFileContentStream(fileId);
    await using tmpFile = await TemporaryFile.from(fileContentStream);

    const filePart = await this.#aiService.processFile({ path: tmpFile.path, mimeType: file.mimeType });

    const pages = file.mimeType.includes('pdf')
      ? await tryIgnoreLogAsync(async () => getPdfPageCount(tmpFile.path), this.logger, null)
      : null;

    const types = await this.documentTypeService.session
      .select({
        typeId: documentType.id,
        categoryLabel: documentCategory.label,
        typeGroup: documentType.group,
        typeLabel: documentType.label
      })
      .from(documentType)
      .leftJoin(documentCategory, eq(documentCategory.id, documentType.categoryId))
      .where(isString(assumeTypeId) ? eq(documentType.id, assumeTypeId) : undefined);

    const typeLabelEntries = types.map((type) => ({ id: type.typeId, label: `${type.categoryLabel} | ${type.typeGroup} | ${type.typeLabel}` }));
    const typeLabels = typeLabelEntries.map(({ label }) => label);

    const documentTypeGeneration = await this.#aiService.generate({
      ...defaultGenerationOptions,
      generationSchema: object({
        documentType: enumeration(typeLabels as [string, ...string[]])
      }),
      contents: [
        {
          role: 'user',
          parts: [
            { file: filePart.file },
            { text: `Klassifiziere den Inhalt des Dokuments in das angegebenen JSON Schema.` }
          ]
        }
      ]
    });

    const typeId = typeLabelEntries.find((entry) => entry.label == documentTypeGeneration.json.documentType)?.id;

    const typeProperties = isDefined(typeId) ? await this.documentTypePropertyService.loadManyByQuery({ typeId }) : undefined;
    const propertyIds = typeProperties?.map((property) => property.propertyId);
    const properties = isDefined(propertyIds) ? await this.documentPropertyService.loadManyByQuery({ id: { $in: propertyIds } }) : undefined;

    const propertiesSchemaEntries = properties?.map((property) => {
      const schema = match(property.dataType)
        .with('text', () => nullable(string()))
        .with('integer', () => nullable(integer()))
        .with('decimal', () => nullable(number()))
        .with('boolean', () => nullable(boolean()))
        .with('date', () => nullable(object({ year: integer(), month: integer(), day: integer() })))
        .exhaustive();

      return [property.label, schema] as const;
    });

    const generationSchema = object({
      documentTitle: string(),
      documentSubtitle: nullable(string()),
      documentSummary: string(),
      documentTags: array(string()),
      documentDate: nullable(object({ year: integer(), month: integer(), day: integer() })),
      ...(
        (isUndefined(propertiesSchemaEntries) || (propertiesSchemaEntries.length == 0))
          ? {}
          : { documentProperties: object(fromEntries(propertiesSchemaEntries)) }
      )
    });

    const { json: extraction } = await this.#aiService.generate({
      model: 'gemini-2.0-flash',
      generationOptions: {
        maxOutputTokens: 2048,
        temperature: 0.2,
        topP: 0.2
      },
      generationSchema,
      contents: [
        {
          role: 'user',
          parts: [
            { file: filePart.file },
            {
              text: `Extrahiere den Inhalt des Dokuments in das angegebenen JSON Schema.

Gib in der summary ausführlich an, welche Informationen in dem Dokument vorkommen(ohne konkrete Werte).
Erstelle bis zu 7 möglichst spezifische Tags.
Antworte auf deutsch.`
            }
          ]
        }
      ]
    });

    const filteredDocumentTags = extraction.documentTags.filter((tag) => (tag != extraction.documentTitle) && (tag != extraction.documentSubtitle));
    const date = isNotNull(extraction.documentDate) ? dateObjectToNumericDate(extraction.documentDate) : null;
    const parsedProperties = isUndefined(extraction.documentProperties)
      ? []
      : objectEntries(extraction.documentProperties)
        .map(([propertyLabel, rawValue]): DocumentInformationExtractionPropertyResult | null => {
          if (isNull(rawValue)) {
            return null;
          }

          const property = assertDefinedPass(properties?.find((property) => property.label == propertyLabel));

          const value = match(rawValue)
            .with({ year: P.number }, (val) => dateObjectToNumericDate(val))
            .otherwise((val) => val);

          return { propertyId: property.id, dataType: property.dataType, value };
        })
        .filter(isNotNull);

    return {
      typeId: typeId ?? null,
      title: extraction.documentTitle,
      subtitle: extraction.documentSubtitle,
      pages,
      date,
      summary: extraction.documentSummary,
      tags: filteredDocumentTags,
      properties: parsedProperties
    };
  }

  protected async getDocumentFileContent(fileId: string): Promise<Uint8Array> {
    const key = getDocumentFileKey(fileId);
    return this.fileObjectStorage.getContent(key);
  }

  protected getDocumentFileContentStream(fileId: string): ReadableStream<Uint8Array> {
    const key = getDocumentFileKey(fileId);
    return this.fileObjectStorage.getContentStream(key);
  }

  protected async getDocumentFileContentObjectUrl(title: string, file: DocumentFile, download: boolean): Promise<string> {
    const key = getDocumentFileKey(file.id);
    const fileExtension = getMimeTypeExtensions(file.mimeType)[0] ?? 'bin';
    const disposition = download ? 'attachment' : 'inline';
    const filename = `${title}.${fileExtension}`;

    return this.fileObjectStorage.getDownloadUrl(key, currentTimestamp() + (5 * millisecondsPerMinute), {
      'Response-Content-Type': file.mimeType,
      'Response-Content-Disposition': `${disposition}; filename = "${encodeURIComponent(filename)}"`
    });
  }
}

function getDocumentFileKey(id: string): string {
  return `${id.slice(0, 2)} /${id.slice(0, 4)}/${id} `;
}

const validators: Record<DocumentPropertyDataType, (value: unknown) => boolean> = {
  [DocumentPropertyDataType.Text]: (value) => isString(value) || isNull(value),
  [DocumentPropertyDataType.Integer]: (value) => isNumber(value) || isNull(value),
  [DocumentPropertyDataType.Decimal]: (value) => isNumber(value) || isNull(value),
  [DocumentPropertyDataType.Boolean]: (value) => isBoolean(value) || isNull(value),
  [DocumentPropertyDataType.Date]: (value) => isNumber(value) || isNull(value)
};

function validatePropertyValue(propertyId: string, dataType: DocumentPropertyDataType, value: unknown): void {
  const valid = validators[dataType](value);

  if (!valid) {
    throw new BadRequestError(`Invalid value for data type ${dataType} for property ${propertyId}.`);
  }
}
