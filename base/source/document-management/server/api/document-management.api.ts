import { match, P } from 'ts-pattern';

import type { ApiController, ApiRequestContext, ApiServerResult } from '#/api/index.js';
import { apiController } from '#/api/server/index.js';
import { CancellationSignal } from '#/cancellation/token.js';
import { ForbiddenError, NotImplementedError } from '#/errors/index.js';
import { HttpServerResponse } from '#/http/index.js';
import { inject } from '#/injector/index.js';
import { Logger } from '#/logger/logger.js';
import { injectRepository } from '#/orm/server/repository.js';
import { toArray } from '#/utils/array/index.js';
import { documentManagementApiDefinition, type DocumentManagementApiDefinition } from '../../api/index.js';
import { DocumentManagementAuthorizationService } from '../../authorization/index.js';
import { DocumentRequestCollectionAssignment } from '../../models/document-request-collection-assignment.model.js';
import { DocumentCategoryTypeService, DocumentFileService, DocumentManagementService, DocumentRequestService, DocumentService, DocumentWorkflowService } from '../services/index.js';

@apiController(documentManagementApiDefinition)
export class DocumentManagementApiController implements ApiController<DocumentManagementApiDefinition> {
  readonly #documentManagementService = inject(DocumentManagementService);
  readonly #authorizationService = inject(DocumentManagementAuthorizationService);
  readonly #documentCategoryTypeService = inject(DocumentCategoryTypeService);
  readonly #documentFileService = inject(DocumentFileService);
  readonly #documentRequestService = inject(DocumentRequestService);
  readonly #documentRequestCollectionAssignmentRepository = injectRepository(DocumentRequestCollectionAssignment);
  readonly #documentService = inject(DocumentService);
  readonly #workflowService = inject(DocumentWorkflowService);
  readonly #cancellationSignal = inject(CancellationSignal);
  readonly #logger = inject(Logger, DocumentManagementApiController.name);

  async loadData(context: ApiRequestContext<DocumentManagementApiDefinition, 'loadData'>): Promise<ApiServerResult<DocumentManagementApiDefinition, 'loadData'>> {
    const token = await context.getToken();
    const tenantId = await this.#authorizationService.getTenantId(token);

    for (const collectionId of context.parameters.collectionIds) {
      const allowed = await this.#authorizationService.canReadCollection(collectionId, token);

      if (!allowed) {
        throw new ForbiddenError(`You are not allowed to read collection ${collectionId}`);
      }
    }

    return await this.#documentManagementService.loadData(tenantId, toArray(context.parameters.collectionIds));
  }

  async *loadDataStream(context: ApiRequestContext<DocumentManagementApiDefinition, 'loadDataStream'>): ApiServerResult<DocumentManagementApiDefinition, 'loadDataStream'> {
    const token = await context.getToken();
    const tenantId = await this.#authorizationService.getTenantId(token);

    for (const collectionId of context.parameters.collectionIds) {
      const allowed = await this.#authorizationService.canReadCollection(collectionId, token);

      if (!allowed) {
        throw new ForbiddenError(`You are not allowed to read collection ${collectionId}`);
      }
    }

    yield* this.#documentManagementService.loadDataStream(tenantId, toArray(context.parameters.collectionIds), this.#cancellationSignal);
  }

  async loadDocumentRequestsTemplateData(context: ApiRequestContext<DocumentManagementApiDefinition, 'loadDocumentRequestsTemplateData'>): Promise<ApiServerResult<DocumentManagementApiDefinition, 'loadDocumentRequestsTemplateData'>> {
    const token = await context.getToken();
    const tenantId = await this.#authorizationService.getTenantId(token);
    const allowed = await this.#authorizationService.canReadDocumentRequestsTemplates(token);

    if (!allowed) {
      throw new ForbiddenError('You are not allowed to load document requests template data.');
    }

    return await this.#documentManagementService.loadDocumentRequestsTemplateData(tenantId);
  }

  async loadAvailableCategories(context: ApiRequestContext<DocumentManagementApiDefinition, 'loadAvailableCategories'>): Promise<ApiServerResult<DocumentManagementApiDefinition, 'loadAvailableCategories'>> {
    const token = await context.getToken();
    const tenantId = await this.#authorizationService.getTenantId(token);

    return await this.#documentCategoryTypeService.loadCategoryViews(tenantId);
  }

  async loadContent(context: ApiRequestContext<DocumentManagementApiDefinition, 'loadContent'>): Promise<ApiServerResult<DocumentManagementApiDefinition, 'loadContent'>> {
    const token = await context.getToken();
    const tenantId = await this.#authorizationService.getTenantId(token);
    const allowed = await this.canReadDocument(tenantId, context.parameters.id, token);

    if (!allowed) {
      throw new ForbiddenError(`You are not allowed to load content for document ${context.parameters.id}.`);
    }

    const url = await this.#documentService.getContentUrl(tenantId, context.parameters.id, context.parameters.download);

    return HttpServerResponse.redirect(url);
  }

  async getContentUrl(context: ApiRequestContext<DocumentManagementApiDefinition, 'getContentUrl'>): Promise<ApiServerResult<DocumentManagementApiDefinition, 'getContentUrl'>> {
    const token = await context.getToken();
    const tenantId = await this.#authorizationService.getTenantId(token);
    const allowed = await this.canReadDocument(tenantId, context.parameters.id, token);

    if (!allowed) {
      throw new ForbiddenError(`You are not allowed to get content URL for document ${context.parameters.id}.`);
    }

    return await this.#documentService.getContentUrl(tenantId, context.parameters.id, context.parameters.download);
  }

  async loadPreview(context: ApiRequestContext<DocumentManagementApiDefinition, 'loadPreview'>): Promise<ApiServerResult<DocumentManagementApiDefinition, 'loadPreview'>> {
    const token = await context.getToken();
    const tenantId = await this.#authorizationService.getTenantId(token);
    const allowed = await this.canReadDocument(tenantId, context.parameters.id, token);

    if (!allowed) {
      throw new ForbiddenError(`You are not allowed to get content preview for document ${context.parameters.id}.`);
    }

    const url = await this.#documentService.getPreviewUrl(tenantId, context.parameters.id, context.parameters.page);

    return HttpServerResponse.redirect(url);
  }

  async getPreviewUrl(context: ApiRequestContext<DocumentManagementApiDefinition, 'getPreviewUrl'>): Promise<ApiServerResult<DocumentManagementApiDefinition, 'getPreviewUrl'>> {
    const token = await context.getToken();
    const tenantId = await this.#authorizationService.getTenantId(token);
    const allowed = await this.canReadDocument(tenantId, context.parameters.id, token);

    if (!allowed) {
      throw new ForbiddenError(`You are not allowed to get content preview for document ${context.parameters.id}.`);
    }

    return await this.#documentService.getPreviewUrl(tenantId, context.parameters.id, context.parameters.page);
  }

  async createCategory(context: ApiRequestContext<DocumentManagementApiDefinition, 'createCategory'>): Promise<ApiServerResult<DocumentManagementApiDefinition, 'createCategory'>> {
    const token = await context.getToken();
    const tenantId = await this.#authorizationService.getTenantId(token);
    const allowed = await this.#authorizationService.canManageCategoriesAndTypes(token);

    if (!allowed) {
      throw new ForbiddenError('You are not allowed to create document categories.');
    }

    return await this.#documentCategoryTypeService.createCategory({ tenantId, label: context.parameters.label, parentId: context.parameters.parentId });
  }

  async createType(context: ApiRequestContext<DocumentManagementApiDefinition, 'createType'>): Promise<ApiServerResult<DocumentManagementApiDefinition, 'createType'>> {
    const token = await context.getToken();
    const tenantId = await this.#authorizationService.getTenantId(token);
    const allowed = await this.#authorizationService.canManageCategoriesAndTypes(token);

    if (!allowed) {
      throw new ForbiddenError('You are not allowed to create document types.');
    }

    return await this.#documentCategoryTypeService.createType({ tenantId, label: context.parameters.label, categoryId: context.parameters.categoryId });
  }

  async initiateDocumentUpload(context: ApiRequestContext<DocumentManagementApiDefinition, 'initiateDocumentUpload'>): Promise<ApiServerResult<DocumentManagementApiDefinition, 'initiateDocumentUpload'>> {
    const token = await context.getToken();
    const subject = await this.#authorizationService.getSubject(token);

    return await this.#documentFileService.initiateUpload({ key: subject, contentLength: context.parameters.contentLength });
  }

  async createDocument(context: ApiRequestContext<DocumentManagementApiDefinition, 'createDocument'>): Promise<ApiServerResult<DocumentManagementApiDefinition, 'createDocument'>> {
    const token = await context.getToken();
    const tenantId = await this.#authorizationService.getTenantId(token);
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

    return await this.#documentService.create(tenantId, createParameters, { uploadId, uploadKey: subject }, { createUserId: actionUserId });
  }

  async createDocumentRequestsTemplate(context: ApiRequestContext<DocumentManagementApiDefinition, 'createDocumentRequestsTemplate'>): Promise<ApiServerResult<DocumentManagementApiDefinition, 'createDocumentRequestsTemplate'>> {
    const token = await context.getToken();
    const tenantId = await this.#authorizationService.getTenantId(token);
    const allowed = await this.#authorizationService.canManageDocumentRequestsTemplates(token);

    if (!allowed) {
      throw new ForbiddenError('You are not allowed to create document requests template.');
    }

    return await this.#documentRequestService.createRequestsTemplate(tenantId, context.parameters);
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

  async updateDocument({ parameters, getToken }: ApiRequestContext<DocumentManagementApiDefinition, 'updateDocument'>): Promise<ApiServerResult<DocumentManagementApiDefinition, 'updateDocument'>> {
    const token = await getToken();
    const tenantId = await this.#authorizationService.getTenantId(token);

    const { id, ...update } = parameters;

    for (const id of [...(update.collections?.assign ?? []), ...(update.collections?.archive ?? [])]) {
      const allowed = await this.#authorizationService.canAssignDocuments(id, token);

      if (!allowed) {
        throw new ForbiddenError('You are not allowed to assign to or archive documents in collection.');
      }
    }

    await this.#documentService.update(tenantId, id, update);

    return 'ok';
  }

  async proceedDocumentWorkflow({ parameters, getToken }: ApiRequestContext<DocumentManagementApiDefinition, 'proceedDocumentWorkflow'>): Promise<ApiServerResult<DocumentManagementApiDefinition, 'proceedDocumentWorkflow'>> {
    const token = await getToken();
    const tenantId = await this.#authorizationService.getTenantId(token);
    const userId = await this.#authorizationService.getSubject(token);

    await this.#workflowService.proceedWorkflow(tenantId, parameters.id, userId);

    return 'ok';
  }

  async testAuthorization({ parameters, getToken }: ApiRequestContext<DocumentManagementApiDefinition, 'testAuthorization'>): Promise<ApiServerResult<DocumentManagementApiDefinition, 'testAuthorization'>> {
    const token = await getToken();

    return await match(parameters)
      .with({ type: 'canReadCollection' }, async (parameters) => await this.#authorizationService.canReadCollection(parameters.collectionId, token))
      .with({ type: 'canCreateDocuments' }, async (parameters) => await this.#authorizationService.canCreateDocuments(parameters.collectionId, token))
      .with({ type: 'canDeleteDocuments' }, async (parameters) => await this.#authorizationService.canDeleteDocuments(parameters.collectionId, token))
      .with({ type: 'canAssignDocuments' }, async (parameters) => await this.#authorizationService.canAssignDocuments(parameters.collectionId, token))
      .with({ type: 'canManageRequests' }, async (parameters) => await this.#authorizationService.canManageRequests(parameters.collectionId, token))
      .with({ type: 'canUpdateDocument' }, async (parameters) => await this.#authorizationService.canUpdateDocument(parameters.documentId, token))
      .with({ type: 'canApproveDocument' }, async (parameters) => await this.#authorizationService.canApproveDocument(parameters.documentId, token))
      .with({ type: 'canRejectDocument' }, async (parameters) => await this.#authorizationService.canRejectDocument(parameters.documentId, token))
      .with({ type: 'canProgressDocumentWorkflow' }, async (parameters) => await this.#authorizationService.canProgressDocumentWorkflow(parameters.documentId, token))
      .with({ type: 'canManageCategoriesAndTypes' }, async () => await this.#authorizationService.canManageCategoriesAndTypes(token))
      .with({ type: 'canReadDocumentRequestsTemplates' }, async () => await this.#authorizationService.canReadDocumentRequestsTemplates(token))
      .with({ type: 'canManageDocumentRequestsTemplates' }, async () => await this.#authorizationService.canManageDocumentRequestsTemplates(token))
      .with({ type: 'canManageValidationDefinitions' }, async () => await this.#authorizationService.canManageValidationDefinitions(token))
      .otherwise(() => {
        throw new NotImplementedError(`Authorization test for type ${parameters.type} is not implemented.`);
      });
  }

  private async canReadDocument(tenantId: string, documentId: string, token?: unknown): Promise<boolean> {
    const relevantCollectionIds = await this.#documentManagementService.getRelevantDocumentCollectionIds(tenantId, documentId);

    for (const collectionId of relevantCollectionIds) {
      const canReadCollection = await this.#authorizationService.canReadCollection(collectionId, token);

      if (canReadCollection) {
        return true;
      }
    }

    return false;
  }
}
