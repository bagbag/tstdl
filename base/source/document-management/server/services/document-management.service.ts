import { AiService } from '#/ai/ai.service.js';
import { getEntityMap } from '#/database/index.js';
import { Enumerable } from '#/enumerable/index.js';
import { BadRequestError } from '#/errors/index.js';
import { getMimeType, getMimeTypeExtensions } from '#/file/index.js';
import { type Resolvable, Singleton, inject, injectArgument, provide, resolveArgumentType } from '#/injector/index.js';
import { ObjectStorage } from '#/object-storage/index.js';
import type { NewEntity, Query } from '#/orm/index.js';
import { DatabaseConfig, EntityRepositoryConfig, type Transaction, injectRepository } from '#/orm/server/index.js';
import { array, enumeration, integer, nullable, object, string } from '#/schema/index.js';
import type { OneOrMany, Record } from '#/types.js';
import { toArray } from '#/utils/array/index.js';
import { assertDefinedPass, assertStringPass, compareByValueSelectionToOrder, currentTimestamp, digest, isBoolean, isDefined, isNotNull, isNull, isNumber, isString, isUint8Array, millisecondsPerMinute } from '#/utils/index.js';
import { groupToMap } from '#/utils/iterable-helpers/index.js';
import { readBinaryStream } from '#/utils/stream/index.js';
import { type AddOrArchiveDocumentToOrFromCollectionParameters, type ApplyDocumentRequestsTemplateParameters, type ApproveDocumentRequestFileParameters, type AssignPropertyToTypeParameters, type CategoryAndTypesView, type CreateCollectionParameters, type CreateDocumentCategoryParameters, type CreateDocumentParameters, type CreateDocumentPropertyParameters, type CreateDocumentRequestFileParameters, type CreateDocumentRequestParameters, type CreateDocumentRequestTemplateParameters, type CreateDocumentRequestsTemplateParameters, type CreateDocumentTypeParameters, type DeleteDocumentRequestFileParameters, type DeleteDocumentRequestParameters, type DeleteDocumentRequestTemplateParameters, type DeleteDocumentRequestsTemplateParameters, Document, DocumentCategory, DocumentCollection, DocumentCollectionDocument, DocumentFile, type DocumentManagementData, DocumentProperty, DocumentPropertyBooleanValue, DocumentPropertyDataType, DocumentPropertyDecimalValue, DocumentPropertyIntegerValue, DocumentPropertyTextValue, DocumentRequest, DocumentRequestCollection, DocumentRequestFile, DocumentRequestTemplate, type DocumentRequestView, DocumentRequestsTemplate, type DocumentRequestsTemplateData, type DocumentRequestsTemplateView, DocumentType, DocumentTypeProperty, type DocumentView, type LoadDataCollectionsMetadataParameters, type RejectDocumentRequestFileParameters, type RequestFilesStats, type SetDocumentPropertiesParameters, type SetDocumentPropertyParameters, type UpdateDocumentParameters, type UpdateDocumentRequestFileParameters, type UpdateDocumentRequestParameters, type UpdateDocumentRequestTemplateParameters, type UpdateDocumentRequestsTemplateParameters } from '../../models/index.js';
import { DocumentManagementConfig } from '../module.js';

export type DocumentServiceArgument = DocumentManagementConfig;

export type DocumentInformationExtractionResult = {
  title: string,
  subtitle: string | null,
  types: DocumentType[],
  summary: string,
  tags: string[],
  date: { year: number, month: number, day: number } | null
};

@Singleton({
  providers: [
    provide(EntityRepositoryConfig, { useValue: { schema: 'document_management' } }),
    { provide: DatabaseConfig, useFactory: (_, context) => context.resolve(DocumentManagementConfig).database ?? context.resolve(DatabaseConfig, undefined, { skipSelf: true }) }
  ]
})
export class DocumentManagementService implements Resolvable<DocumentServiceArgument> {
  readonly #aiService = inject(AiService);

  protected readonly documentService = injectRepository(Document);
  protected readonly documentFileService = injectRepository(DocumentFile);
  protected readonly documentCollectionService = injectRepository(DocumentCollection);
  protected readonly documentCategoryService = injectRepository(DocumentCategory);
  protected readonly documentTypeService = injectRepository(DocumentType);
  protected readonly documentRequestService = injectRepository(DocumentRequest);
  protected readonly documentRequestsTemplateService = injectRepository(DocumentRequestsTemplate);
  protected readonly documentRequestTemplateService = injectRepository(DocumentRequestTemplate);
  protected readonly documentRequestCollectionService = injectRepository(DocumentRequestCollection);
  protected readonly documentRequestFileService = injectRepository(DocumentRequestFile);
  protected readonly documentPropertyService = injectRepository(DocumentProperty);
  protected readonly documentTypePropertyService = injectRepository(DocumentTypeProperty);
  protected readonly documentPropertyTextValueService = injectRepository(DocumentPropertyTextValue);
  protected readonly documentPropertyIntegerValueService = injectRepository(DocumentPropertyIntegerValue);
  protected readonly documentPropertyDecimalValueService = injectRepository(DocumentPropertyDecimalValue);
  protected readonly documentPropertyBooleanValueService = injectRepository(DocumentPropertyBooleanValue);
  protected readonly documentCollectionDocumentService = injectRepository(DocumentCollectionDocument);
  protected readonly fileObjectStorage = inject(ObjectStorage, (injectArgument(this, { optional: true }) ?? inject(DocumentManagementConfig)).fileObjectStorageModule);

  declare readonly [resolveArgumentType]: DocumentServiceArgument;

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

      const [documents, requests, requestFiles, textValues, integerValues, decimalValues, booleanValues] = await Promise.all([
        this.documentService.withTransaction(transaction).loadManyByQuery({ id: { $in: documentIds } }, { order: { 'metadata.createTimestamp': 'desc' } }),
        this.documentRequestService.withTransaction(transaction).loadManyByQuery({ id: { $in: requestIds } }, { order: { 'metadata.createTimestamp': 'desc' } }),
        this.documentRequestFileService.withTransaction(transaction).loadManyByQuery({ requestId: { $in: requestIds } }, { order: { 'metadata.createTimestamp': 'desc' } }),
        this.documentPropertyTextValueService.withTransaction(transaction).loadManyByQuery({ documentId: { $in: documentIds } }),
        this.documentPropertyIntegerValueService.withTransaction(transaction).loadManyByQuery({ documentId: { $in: documentIds } }),
        this.documentPropertyDecimalValueService.withTransaction(transaction).loadManyByQuery({ documentId: { $in: documentIds } }),
        this.documentPropertyBooleanValueService.withTransaction(transaction).loadManyByQuery({ documentId: { $in: documentIds } })
      ]);

      const documentFileIds = documents.map((document) => document.fileId);
      const requestFileIds = requestFiles.map((requestFile) => requestFile.fileId);

      const files = await this.documentFileService.withTransaction(transaction).loadManyByQuery({ id: { $in: [...documentFileIds, ...requestFileIds] } }, { order: { 'metadata.createTimestamp': 'desc' } });

      const requestsFilesMap = groupToMap(requestFiles, (requestFile) => requestFile.requestId);
      const valuesMap = Enumerable.from(textValues).concat(integerValues).concat(decimalValues).concat(booleanValues).groupToMap((value) => value.documentId);

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

  async createDocument({ typeId, title, date, expiration, originalFileName, collectionIds, properties, metadata }: CreateDocumentParameters, content: Uint8Array | ReadableStream<Uint8Array>): Promise<Document> {
    return this.documentService.transaction(async (_, transaction) => {
      const documentFile = await this.createDocumentFile(content, originalFileName, transaction);
      const document = await this.documentService.withTransaction(transaction).insert({ fileId: documentFile.id, typeId, title, date, expiration, metadata });

      for (const collectionId of toArray(collectionIds)) {
        await this.documentCollectionDocumentService.withTransaction(transaction).insert({ collectionId, documentId: document.id, archiveTimestamp: null });
      }

      if (isDefined(properties)) {
        const mappedProperties = properties.map((property): SetDocumentPropertyParameters => ({ ...property, documentId: document.id }));
        await this.setDocumentProperties(mappedProperties, transaction);
      }

      return document;
    });
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
        date: null,
        expiration: null,
        metadata: documentMetadata
      });

      for (const { collectionId } of requestCollections) {
        await this.addDocumentToCollection({ collectionId, documentId: document.id }, transaction);
      }

      await this.documentRequestFileService.withTransaction(transaction).update(id, { approval: true, approvalComment, approvalTimestamp: currentTimestamp(), createdDocumentId: document.id, metadata: requestFileMetadata });

      return document;
    });
  }

  async rejectDocumentRequestFile({ id, approvalComment, metadata }: RejectDocumentRequestFileParameters): Promise<void> {
    return this.documentRequestFileService.transaction(async (_, transaction) => {
      const requestFile = await this.documentRequestFileService.withTransaction(transaction).load(id);

      if (requestFile.approval == true) {
        throw new BadRequestError('Document request file already accepted.');
      }

      await this.documentRequestFileService.withTransaction(transaction).update(id, { approval: false, approvalComment, approvalTimestamp: currentTimestamp(), metadata });
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

  async createDocumentFile(content: Uint8Array | ReadableStream<Uint8Array>, originalFileName: string | null, dbTransaction?: Transaction): Promise<DocumentFile> {
    return this.documentFileService.useTransaction(dbTransaction, async (_, transaction) => {
      const contentAsUint8Array = isUint8Array(content) ? content : await readBinaryStream(content);
      const hash = await digest('SHA-256', contentAsUint8Array).toHex();
      const mimeType = await getMimeType(contentAsUint8Array);

      const documentFile = await this.documentFileService.withTransaction(transaction).insert({
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

  async createDocumentRequestFile({ requestId, title, originalFileName, metadata }: CreateDocumentRequestFileParameters, content: Uint8Array | ReadableStream<Uint8Array>): Promise<DocumentRequestFile> {
    return this.documentRequestFileService.transaction(async (_, transaction) => {
      const [request, existingRequestFiles] = await Promise.all([
        this.documentRequestService.withTransaction(transaction).load(requestId),
        this.documentRequestFileService.withTransaction(transaction).loadManyByQuery({ requestId })
      ]);

      const filesCountLeft = (request.completed ? 0 : request.requiredFilesCount) - existingRequestFiles.reduce((sum, requestFile) => sum + ((requestFile.approval != false) ? 1 : 0), 0);

      if (filesCountLeft <= 0) {
        throw new BadRequestError('Maximum amount of allowed files reached.');
      }

      const file = await this.createDocumentFile(content, originalFileName, transaction);
      return this.documentRequestFileService.withTransaction(transaction).insert({ requestId, fileId: file.id, title, createdDocumentId: null, approval: null, approvalComment: null, approvalTimestamp: null, metadata });
    });
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

  async updateDocument(parameters: UpdateDocumentParameters, transaction?: Transaction): Promise<void> {
    const { id: documentId, properties: propertyUpdates, ...update } = parameters;

    await this.documentService.useTransaction(transaction, async (repository, tx) => {
      await repository.update(documentId, update);

      if (isDefined(propertyUpdates)) {
        const mappedPropertyUpdates = propertyUpdates.map((property): SetDocumentPropertyParameters => ({ documentId, ...property }));
        await this.setDocumentProperties(mappedPropertyUpdates, tx);
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

  async setDocumentProperties(setDocumentPropertyItems: SetDocumentPropertiesParameters, transaction?: Transaction): Promise<void> {
    if ((setDocumentPropertyItems.length == 0)) {
      return;
    }

    await this.documentPropertyService.useTransaction(transaction, async (_, tx) => {
      const propertyIds = setDocumentPropertyItems.map((property) => property.propertyId);

      const properties = await this.documentPropertyService.withTransaction(tx).loadManyByQuery({ id: { $in: propertyIds } });
      const propertiesMap = getEntityMap(properties);

      for (const { documentId, propertyId, value, metadata } of setDocumentPropertyItems) {
        const property = assertDefinedPass(propertiesMap.get(propertyId));

        validatePropertyValue(propertyId, property.dataType, value);

        const propertyValueService = this.getDocumentPropertyValueService(property.dataType);
        await propertyValueService.withTransaction(tx).upsert(['documentId', 'propertyId'], { documentId, propertyId, value: value as any, metadata }, undefined);
      }
    });
  }

  async addDocumentToCollection(parameters: AddOrArchiveDocumentToOrFromCollectionParameters, transaction?: Transaction): Promise<void> {
    await this.documentCollectionDocumentService.withOptionalTransaction(transaction).upsert(['collectionId', 'documentId'], { ...parameters, archiveTimestamp: null });
  }

  async archiveDocument({ collectionId, documentId, metadata }: AddOrArchiveDocumentToOrFromCollectionParameters): Promise<void> {
    await this.documentCollectionDocumentService.updateByQuery({ collectionId, documentId }, { archiveTimestamp: currentTimestamp(), metadata });
  }

  async createProperty(parameters: CreateDocumentPropertyParameters): Promise<DocumentProperty> {
    return this.documentPropertyService.insert(parameters);
  }

  async assignPropertyToType(parameters: AssignPropertyToTypeParameters): Promise<void> {
    await this.documentTypePropertyService.insert(parameters);
  }

  protected async extractDocumentInformation(): Promise<DocumentInformationExtractionResult> {
    const file = await this.#aiService.processFile({ path: '', mimeType: '' });
    const types = await this.documentTypeService.loadAll();

    const typeLabels = types.map((type) => type.label);

    const generationSchema = object({
      documentTitle: string(),
      documentSubtitle: nullable(string()),
      documentTypes: array(enumeration(typeLabels as [string, ...string[]])),
      documentSummary: string(),
      documentTags: array(string()),
      documentDate: nullable(object({ year: integer(), month: integer(), day: integer() }))
    });

    const generation = await this.#aiService.generate({
      model: 'gemini-2.0-flash',
      generationOptions: {
        maxOutputTokens: 2048,
        temperature: 0.2,
        topP: 0.2
      },
      generationSchema,
      contents: [
        {
          role: 'user', parts: [
            { file: file.file },
            {
              text: `Extrahiere den Inhalt des Dokuments in das angegebenen JSON Schema.

Gib in der summary ausführlich an, welche Informationen in dem Dokument vorkommen (ohne konkrete Werte).
Erstelle bis zu 7 möglichst spezifische Tags ohne allgemeinen Worte.
Antworte auf deutsch.`
            }
          ]
        }
      ]
    });

    const resultJson = JSON.parse(assertStringPass(generation.text, 'No text generated.'));
    const result = generationSchema.parse(resultJson);

    result.documentTags = result.documentTags.filter((tag) => (tag != result.documentTitle) && (tag != result.documentSubtitle));

    return {
      title: result.documentTitle,
      subtitle: result.documentSubtitle,
      types: result.documentTypes.map((typeLabel) => types.find((type) => type.label == typeLabel)).filter(isDefined),
      summary: result.documentSummary,
      tags: result.documentTags,
      date: result.documentDate
    };
  }

  protected getDocumentPropertyValueService(dataType: DocumentPropertyDataType) {
    switch (dataType) {
      case DocumentPropertyDataType.Text:
        return this.documentPropertyTextValueService;

      case DocumentPropertyDataType.Integer:
        return this.documentPropertyIntegerValueService;

      case DocumentPropertyDataType.Decimal:
        return this.documentPropertyDecimalValueService;

      case DocumentPropertyDataType.Boolean:
        return this.documentPropertyBooleanValueService;

      default:
        throw new BadRequestError('Unknown property data type.');
    }
  }

  protected async getDocumentFileContentObjectUrl(title: string, file: DocumentFile, download: boolean): Promise<string> {
    const key = getDocumentFileKey(file.id);
    const fileExtension = getMimeTypeExtensions(file.mimeType)[0] ?? 'bin';
    const disposition = download ? 'attachment' : 'inline';
    const filename = `${title}.${fileExtension}`;

    return this.fileObjectStorage.getDownloadUrl(key, currentTimestamp() + (5 * millisecondsPerMinute), {
      'Response-Content-Type': file.mimeType,
      'Response-Content-Disposition': `${disposition}; filename="${encodeURIComponent(filename)}"`
    });
  }
}

function getDocumentFileKey(id: string): string {
  return `${id.slice(0, 2)}/${id.slice(0, 4)}/${id}`;
}

const validators: Record<DocumentPropertyDataType, (value: unknown) => boolean> = {
  [DocumentPropertyDataType.Text]: (value) => isString(value) || isNull(value),
  [DocumentPropertyDataType.Integer]: (value) => isNumber(value) || isNull(value),
  [DocumentPropertyDataType.Decimal]: (value) => isNumber(value) || isNull(value),
  [DocumentPropertyDataType.Boolean]: (value) => isBoolean(value) || isNull(value)
};

function validatePropertyValue(propertyId: string, dataType: DocumentPropertyDataType, value: unknown): void {
  const valid = validators[dataType](value);

  if (!valid) {
    throw new BadRequestError(`Invalid value for data type ${dataType} for property ${propertyId}.`);
  }
}
