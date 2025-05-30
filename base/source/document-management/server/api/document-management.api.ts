import { create as createDiffPatch } from 'jsondiffpatch';
import { match, P } from 'ts-pattern';

import { createErrorResponse, type ApiController, type ApiRequestContext, type ApiServerResult } from '#/api/index.js';
import { apiController } from '#/api/server/index.js';
import { CancellationSignal } from '#/cancellation/token.js';
import { documentManagementApiDefinition, type DocumentManagementApiDefinition } from '#/document-management/api/index.js';
import { DocumentRequestCollectionAssignment } from '#/document-management/models/document-request-collection-assignment.model.js';
import type { DocumentManagementData } from '#/document-management/service-models/document-management.view-model.js';
import { ForbiddenError, NotImplementedError } from '#/errors/index.js';
import { HttpServerResponse } from '#/http/index.js';
import { inject } from '#/injector/index.js';
import { Logger } from '#/logger/logger.js';
import { injectRepository } from '#/orm/server/repository.js';
import type { Record } from '#/schema/index.js';
import { ServerSentEventsSource } from '#/sse/server-sent-events-source.js';
import { toArray } from '#/utils/array/index.js';
import { tryIgnoreAsync } from '#/utils/try-ignore.js';
import { isDefined, isUndefined } from '#/utils/type-guards.js';
import { DocumentCategoryTypeService, DocumentFileService, DocumentManagementAuthorizationService, DocumentManagementService, DocumentRequestService, DocumentService } from '../services/index.js';

const jsonDiffPatch = createDiffPatch({
  omitRemovedValues: true,
  arrays: {
    detectMove: true,
    includeValueOnMove: false,
  },
  objectHash(item, index) {
    return ((item as Record<string, unknown>)['id'] as string | undefined) ?? String(index);
  },
});

@apiController(documentManagementApiDefinition)
export class DocumentManagementApiController implements ApiController<DocumentManagementApiDefinition> {
  readonly #authorizationService = inject(DocumentManagementAuthorizationService);
  readonly #documentCategoryTypeService = inject(DocumentCategoryTypeService);
  readonly #documentFileService = inject(DocumentFileService);
  readonly #documentManagementService = inject(DocumentManagementService);
  readonly #documentRequestService = inject(DocumentRequestService);
  readonly #documentRequestCollectionAssignmentRepository = injectRepository(DocumentRequestCollectionAssignment);
  readonly #documentService = inject(DocumentService);
  readonly #cancellationSignal = inject(CancellationSignal);
  readonly #logger = inject(Logger, DocumentManagementApiController.name);

  async loadData(context: ApiRequestContext<DocumentManagementApiDefinition, 'loadData'>): Promise<ApiServerResult<DocumentManagementApiDefinition, 'loadData'>> {
    const token = await context.getToken();

    for (const collectionId of context.parameters.collectionIds) {
      const allowed = await this.#authorizationService.canReadCollection(collectionId, token);

      if (!allowed) {
        throw new ForbiddenError(`You are not allowed to read collection ${collectionId}`);
      }
    }

    return await this.#documentManagementService.loadData(toArray(context.parameters.collectionIds));
  }

  async loadDataStream(context: ApiRequestContext<DocumentManagementApiDefinition, 'loadDataStream'>): Promise<ApiServerResult<DocumentManagementApiDefinition, 'loadDataStream'>> {
    const token = await context.getToken();

    for (const collectionId of context.parameters.collectionIds) {
      const allowed = await this.#authorizationService.canReadCollection(collectionId, token);

      if (!allowed) {
        throw new ForbiddenError(`You are not allowed to read collection ${collectionId}`);
      }
    }

    const stream = this.#documentManagementService.loadDataStream(toArray(context.parameters.collectionIds), this.#cancellationSignal);
    const eventSource = new ServerSentEventsSource();

    void (async () => {
      let lastData: DocumentManagementData | undefined;

      try {
        for await (const data of stream) {
          if (eventSource.closed()) {
            break;
          }

          if (isUndefined(lastData)) {
            await eventSource.sendJson({ name: 'data', data });
          }
          else {
            const delta = jsonDiffPatch.diff(lastData, data);

            if (isDefined(delta)) {
              await eventSource.sendJson({ name: 'delta', data: delta });
            }
          }

          lastData = data;
        }
      }
      catch (error) {
        this.#logger.error(error);

        await tryIgnoreAsync(async () => await eventSource.sendJson({ name: 'error', data: createErrorResponse(error as Error).error }));
        await tryIgnoreAsync(async () => await eventSource.close());
      }
      finally {
        await tryIgnoreAsync(async () => await eventSource.close());
      }
    })();

    return eventSource;
  }

  async loadDocumentRequestsTemplateData(context: ApiRequestContext<DocumentManagementApiDefinition, 'loadDocumentRequestsTemplateData'>): Promise<ApiServerResult<DocumentManagementApiDefinition, 'loadDocumentRequestsTemplateData'>> {
    const token = await context.getToken();
    const allowed = await this.#authorizationService.canReadDocumentRequestsTemplates(token);

    if (!allowed) {
      throw new ForbiddenError('You are not allowed to load document requests template data.');
    }

    return await this.#documentManagementService.loadDocumentRequestsTemplateData();
  }

  async loadAvailableCategories(context: ApiRequestContext<DocumentManagementApiDefinition, 'loadAvailableCategories'>): Promise<ApiServerResult<DocumentManagementApiDefinition, 'loadAvailableCategories'>> {
    const token = await context.getToken();
    return await this.#documentCategoryTypeService.loadCategoryViews();
  }

  async loadContent(context: ApiRequestContext<DocumentManagementApiDefinition, 'loadContent'>): Promise<ApiServerResult<DocumentManagementApiDefinition, 'loadContent'>> {
    const token = await context.getToken();
    const allowed = await this.#authorizationService.canReadDocument(context.parameters.id, token);

    if (!allowed) {
      throw new ForbiddenError(`You are not allowed to load content for document ${context.parameters.id}.`);
    }

    const url = await this.#documentService.getContentUrl(context.parameters.id, context.parameters.download);

    return HttpServerResponse.redirect(url);
  }

  async getContentUrl(context: ApiRequestContext<DocumentManagementApiDefinition, 'getContentUrl'>): Promise<ApiServerResult<DocumentManagementApiDefinition, 'getContentUrl'>> {
    const token = await context.getToken();
    const allowed = await this.#authorizationService.canReadDocument(context.parameters.id, token);

    if (!allowed) {
      throw new ForbiddenError(`You are not allowed to get content URL for document ${context.parameters.id}.`);
    }

    return await this.#documentService.getContentUrl(context.parameters.id, context.parameters.download);
  }

  async loadPreview(context: ApiRequestContext<DocumentManagementApiDefinition, 'loadPreview'>): Promise<ApiServerResult<DocumentManagementApiDefinition, 'loadPreview'>> {
    const token = await context.getToken();
    const allowed = await this.#authorizationService.canReadDocument(context.parameters.id, token);

    if (!allowed) {
      throw new ForbiddenError(`You are not allowed to get content preview for document ${context.parameters.id}.`);
    }

    const url = await this.#documentService.getPreviewUrl(context.parameters.id, context.parameters.page);

    return HttpServerResponse.redirect(url);
  }

  async getPreviewUrl(context: ApiRequestContext<DocumentManagementApiDefinition, 'getPreviewUrl'>): Promise<ApiServerResult<DocumentManagementApiDefinition, 'getPreviewUrl'>> {
    const token = await context.getToken();
    const allowed = await this.#authorizationService.canReadDocument(context.parameters.id, token);

    if (!allowed) {
      throw new ForbiddenError(`You are not allowed to get content preview for document ${context.parameters.id}.`);
    }

    return await this.#documentService.getPreviewUrl(context.parameters.id, context.parameters.page);
  }

  async createCategory(context: ApiRequestContext<DocumentManagementApiDefinition, 'createCategory'>): Promise<ApiServerResult<DocumentManagementApiDefinition, 'createCategory'>> {
    const token = await context.getToken();
    const allowed = await this.#authorizationService.canManageCategoriesAndTypes(token);

    if (!allowed) {
      throw new ForbiddenError('You are not allowed to create document categories.');
    }

    return await this.#documentCategoryTypeService.createCategory(context.parameters.label, context.parameters.parentId);
  }

  async createType(context: ApiRequestContext<DocumentManagementApiDefinition, 'createType'>): Promise<ApiServerResult<DocumentManagementApiDefinition, 'createType'>> {
    const token = await context.getToken();
    const allowed = await this.#authorizationService.canManageCategoriesAndTypes(token);

    if (!allowed) {
      throw new ForbiddenError('You are not allowed to create document types.');
    }

    return await this.#documentCategoryTypeService.createType(context.parameters.label, context.parameters.categoryId);
  }

  async initiateDocumentUpload(context: ApiRequestContext<DocumentManagementApiDefinition, 'initiateDocumentUpload'>): Promise<ApiServerResult<DocumentManagementApiDefinition, 'initiateDocumentUpload'>> {
    const token = await context.getToken();
    const subject = await this.#authorizationService.getSubject(token);

    return await this.#documentFileService.initiateUpload({ key: subject, contentLength: context.parameters.contentLength });
  }

  async createDocument(context: ApiRequestContext<DocumentManagementApiDefinition, 'createDocument'>): Promise<ApiServerResult<DocumentManagementApiDefinition, 'createDocument'>> {
    const token = await context.getToken();
    const subject = await this.#authorizationService.getSubject(token);
    const { uploadId, ...createParameters } = context.parameters;

    const [collectionIds, requiresAssign] = await match(context.parameters.assignment)
      .with({ collections: P.select() }, (collectionIds) => [toArray(collectionIds), true] as const)
      .with({ request: P.select() }, async (requestId) => {
        const assignments = await this.#documentRequestCollectionAssignmentRepository.loadManyByQuery({ requestId });
        const collectionIds = assignments.map((assignment) => assignment.collectionId);

        return [collectionIds, true] as const;
      })
      .with({ automatic: P.select() }, ({ scope }) => [toArray(scope), false] as const)
      .exhaustive();

    for (const collectionId of collectionIds) {
      const createDocumentsAllowed = await this.#authorizationService.canCreateDocuments(collectionId, token);

      if (!createDocumentsAllowed) {
        throw new ForbiddenError(`You are not allowed to create documents in collection ${collectionId}.`);
      }

      if (requiresAssign) {
        const assignDocumentsAllowed = await this.#authorizationService.canAssignDocuments(collectionId, token);

        if (!assignDocumentsAllowed) {
          throw new ForbiddenError(`You are not allowed to assign documents in collection ${collectionId}.`);
        }
      }
    }

    const actionUserId = await this.#authorizationService.getSubject(token);

    return await this.#documentService.create(createParameters, { uploadId, uploadKey: subject }, { createUserId: actionUserId });
  }

  async createDocumentRequestsTemplate(context: ApiRequestContext<DocumentManagementApiDefinition, 'createDocumentRequestsTemplate'>): Promise<ApiServerResult<DocumentManagementApiDefinition, 'createDocumentRequestsTemplate'>> {
    const token = await context.getToken();
    const allowed = await this.#authorizationService.canManageDocumentRequestsTemplates(token);

    if (!allowed) {
      throw new ForbiddenError('You are not allowed to create document requests template.');
    }

    return await this.#documentRequestService.createRequestsTemplate(context.parameters);
  }

  async updateDocumentRequestsTemplate(_context: ApiRequestContext<DocumentManagementApiDefinition, 'updateDocumentRequestsTemplate'>): Promise<ApiServerResult<DocumentManagementApiDefinition, 'updateDocumentRequestsTemplate'>> {
    throw new NotImplementedError();
  }

  async applyDocumentRequestsTemplate(_context: ApiRequestContext<DocumentManagementApiDefinition, 'applyDocumentRequestsTemplate'>): Promise<ApiServerResult<DocumentManagementApiDefinition, 'applyDocumentRequestsTemplate'>> {
    throw new NotImplementedError();
  }

  async deleteDocumentRequestsTemplate(_context: ApiRequestContext<DocumentManagementApiDefinition, 'deleteDocumentRequestsTemplate'>): Promise<ApiServerResult<DocumentManagementApiDefinition, 'deleteDocumentRequestsTemplate'>> {
    throw new NotImplementedError();
  }

  async createDocumentRequestTemplate(_context: ApiRequestContext<DocumentManagementApiDefinition, 'createDocumentRequestTemplate'>): Promise<ApiServerResult<DocumentManagementApiDefinition, 'createDocumentRequestTemplate'>> {
    throw new NotImplementedError();
  }

  async updateDocumentRequestTemplate(_context: ApiRequestContext<DocumentManagementApiDefinition, 'updateDocumentRequestTemplate'>): Promise<ApiServerResult<DocumentManagementApiDefinition, 'updateDocumentRequestTemplate'>> {
    throw new NotImplementedError();
  }

  async deleteDocumentRequestTemplate(_context: ApiRequestContext<DocumentManagementApiDefinition, 'deleteDocumentRequestTemplate'>): Promise<ApiServerResult<DocumentManagementApiDefinition, 'deleteDocumentRequestTemplate'>> {
    throw new NotImplementedError();
  }

  async createDocumentRequest(_context: ApiRequestContext<DocumentManagementApiDefinition, 'createDocumentRequest'>): Promise<ApiServerResult<DocumentManagementApiDefinition, 'createDocumentRequest'>> {
    throw new NotImplementedError();
  }

  async updateDocumentRequest(_context: ApiRequestContext<DocumentManagementApiDefinition, 'updateDocumentRequest'>): Promise<ApiServerResult<DocumentManagementApiDefinition, 'updateDocumentRequest'>> {
    throw new NotImplementedError();
  }

  async deleteDocumentRequest(_context: ApiRequestContext<DocumentManagementApiDefinition, 'deleteDocumentRequest'>): Promise<ApiServerResult<DocumentManagementApiDefinition, 'deleteDocumentRequest'>> {
    throw new NotImplementedError();
  }

  async assignDocumentToCollection(_context: ApiRequestContext<DocumentManagementApiDefinition, 'assignDocumentToCollection'>): Promise<ApiServerResult<DocumentManagementApiDefinition, 'assignDocumentToCollection'>> {
    throw new NotImplementedError();
  }

  async archiveDocumentInCollection(_context: ApiRequestContext<DocumentManagementApiDefinition, 'archiveDocumentInCollection'>): Promise<ApiServerResult<DocumentManagementApiDefinition, 'archiveDocumentInCollection'>> {
    throw new NotImplementedError();
  }

  async updateDocument(_context: ApiRequestContext<DocumentManagementApiDefinition, 'updateDocument'>): Promise<ApiServerResult<DocumentManagementApiDefinition, 'updateDocument'>> {
    throw new NotImplementedError();
  }
}
