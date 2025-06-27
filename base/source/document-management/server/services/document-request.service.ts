import { and, count, isNotNull as dbIsNotNull, isNull as dbIsNull, eq, inArray, sql } from 'drizzle-orm';

import { BadRequestError } from '#/errors/index.js';
import { inject } from '#/injector/inject.js';
import type { NewEntity } from '#/orm/index.js';
import { Transactional, injectRepository } from '#/orm/server/index.js';
import type { OneOrMany } from '#/types.js';
import { toArray } from '#/utils/array/index.js';
import { assertDefinedPass, isNotNull } from '#/utils/type-guards.js';
import { DocumentApproval, DocumentRequest, DocumentRequestCollectionAssignment, DocumentRequestState, DocumentRequestTemplate, DocumentRequestsTemplate, type Document } from '../../models/index.js';
import type { RequestStats } from '../../service-models/index.js';
import { document, documentRequest, documentRequestCollectionAssignment } from '../schemas.js';
import { DocumentManagementObservationService } from './document-management-observation.service.js';
import { DocumentManagementSingleton } from './singleton.js';

@DocumentManagementSingleton()
export class DocumentRequestService extends Transactional {
  readonly #documentRequestCollectionAssignmentRepository = injectRepository(DocumentRequestCollectionAssignment);
  readonly #documentRequestRepository = injectRepository(DocumentRequest);
  readonly #documentRequestTemplateRepository = injectRepository(DocumentRequestTemplate);
  readonly #documentRequestsTemplateRepository = injectRepository(DocumentRequestsTemplate);
  readonly #observationService = inject(DocumentManagementObservationService);

  async getRequestStats(tenantId: string, collectionIds: OneOrMany<string>): Promise<RequestStats> {
    const relevantRequests = this.session.$with('relevant_requests').as(
      this.session.selectDistinct({ id: documentRequest.id })
        .from(documentRequest)
        .innerJoin(documentRequestCollectionAssignment, eq(documentRequestCollectionAssignment.requestId, documentRequest.id))
        .where(and(
          eq(documentRequest.tenantId, tenantId),
          eq(documentRequestCollectionAssignment.tenantId, tenantId),
          inArray(documentRequestCollectionAssignment.collectionId, toArray(collectionIds))
        )),
    );

    const [result] = await this.session.with(relevantRequests)
      .select({
        total: count(sql`${documentRequest.id})`),
        documentPending: count(sql`CASE WHEN ${eq(documentRequest.state, DocumentRequestState.Open)} AND ${dbIsNull(documentRequest.documentId)}  THEN 1 END`),
        approvalPending: count(sql`CASE WHEN ${eq(documentRequest.state, DocumentRequestState.Open)} AND ${dbIsNotNull(documentRequest.documentId)} AND ${eq(document.approval, DocumentApproval.Pending)} THEN 1 END`),
        approvals: count(sql`CASE WHEN ${eq(documentRequest.state, DocumentRequestState.Closed)} AND ${dbIsNotNull(documentRequest.documentId)} AND ${eq(document.approval, DocumentApproval.Approved)} THEN 1 END`),
        rejections: count(sql`CASE WHEN ${eq(documentRequest.state, DocumentRequestState.Closed)} AND ${dbIsNotNull(documentRequest.documentId)} AND ${eq(document.approval, DocumentApproval.Rejected)} THEN 1 END`),
        closedWithoutDocument: count(sql`CASE WHEN ${eq(documentRequest.state, DocumentRequestState.Closed)} AND ${dbIsNull(documentRequest.documentId)} THEN 1 END`),
      })
      .from(documentRequest)
      .leftJoin(document, eq(document.id, documentRequest.documentId))
      .where(inArray(documentRequest.id, this.session.select({ id: relevantRequests.id }).from(relevantRequests)));

    return assertDefinedPass(result);
  }

  async createRequestsTemplate(tenantId: string | null, parameters: Pick<DocumentRequestsTemplate, 'label' | 'description'>): Promise<DocumentRequestsTemplate> {
    return await this.#documentRequestsTemplateRepository.insert({ ...parameters, tenantId });
  }

  async updateRequestsTemplate(tenantId: string | null, id: string, parameters: Pick<DocumentRequestsTemplate, 'label' | 'description' | 'metadata'>): Promise<DocumentRequestsTemplate> {
    return await this.#documentRequestsTemplateRepository.updateByQuery({ tenantId, id }, parameters);
  }

  async applyRequestsTemplate(tenantId: string, id: string, collectionIds: string[]): Promise<void> {
    const requestTemplates = await this.#documentRequestTemplateRepository.loadManyByQuery({ tenantId: { $or: [null, tenantId] }, requestsTemplateId: id });

    await this.transaction(async (tx) => {
      for (const { typeId, comment } of requestTemplates) {
        await this.withTransaction(tx).createRequest(tenantId, typeId, collectionIds, comment);
      }
    });
  }

  async deleteRequestsTemplate(tenantId: string, id: string): Promise<DocumentRequestsTemplate> {
    return await this.#documentRequestsTemplateRepository.deleteByQuery({ tenantId, id });
  }

  async createRequestTemplate(tenantId: string, requestsTemplateId: string, typeId: string, comment: string): Promise<DocumentRequestTemplate> {
    return await this.#documentRequestTemplateRepository.insert({ tenantId, requestsTemplateId, typeId, comment });
  }

  async updateRequestTemplate(tenantId: string, id: string, parameters: Pick<DocumentRequestTemplate, 'typeId' | 'comment'>): Promise<DocumentRequestTemplate> {
    return await this.#documentRequestTemplateRepository.updateByQuery({ tenantId, id }, parameters);
  }

  async deleteRequestTemplate(tenantId: string, id: string): Promise<DocumentRequestTemplate> {
    return await this.#documentRequestTemplateRepository.deleteByQuery({ tenantId, id });
  }

  async createRequest(tenantId: string, typeId: string, collectionIds: string[], comment: string | null): Promise<DocumentRequest> {
    if (collectionIds.length == 0) {
      throw new BadRequestError('No target collectionId specified.');
    }

    return await this.transaction(async (tx) => {
      const request = await this.#documentRequestRepository.withTransaction(tx).insert({ tenantId, typeId, documentId: null, comment, state: DocumentRequestState.Open });

      const newDocumentRequestCollectionAssignments = collectionIds.map((collectionId): NewEntity<DocumentRequestCollectionAssignment> => ({ tenantId, requestId: request.id, collectionId }));
      await this.#documentRequestCollectionAssignmentRepository.withTransaction(tx).insertMany(newDocumentRequestCollectionAssignments);

      this.#observationService.collectionChange(collectionIds, tx);

      return request;
    });
  }

  async updateRequest(tenantId: string, id: string, update: Partial<Pick<DocumentRequest, 'typeId' | 'comment'>>): Promise<void> {
    await this.transaction(async (tx) => {
      const request = await this.#documentRequestRepository.withTransaction(tx).loadByQuery({ tenantId, id });

      if (isNotNull(request.documentId)) {
        throw new BadRequestError('Cannot update document requests which have an assigned document.');
      }

      await this.#documentRequestRepository.withTransaction(tx).updateByQuery({ tenantId, id }, update);
      this.#observationService.requestChange(id, tx);
    });
  }

  async deleteRequest(tenantId: string, id: string): Promise<void> {
    await this.transaction(async (tx) => {
      const request = await this.#documentRequestRepository.withTransaction(tx).loadByQuery({ tenantId, id });

      if (isNotNull(request.documentId)) {
        throw new BadRequestError('Cannot delete requests which have an assigned document.');
      }

      await this.#documentRequestCollectionAssignmentRepository.withTransaction(tx).deleteManyByQuery({ tenantId, requestId: id });
      await this.#documentRequestRepository.withTransaction(tx).deleteByQuery({ tenantId, id });
      this.#observationService.requestChange(id, tx);
    });
  }

  async assignDocument(document: Document, requestId: string): Promise<void> {
    await this.transaction(async (tx) => {
      const request = await this.#documentRequestRepository.withTransaction(tx).loadByQuery({ tenantId: document.tenantId, id: requestId });

      if (isNotNull(request.documentId)) {
        throw new BadRequestError('Document request already has a document assigned.');
      }

      await this.#documentRequestRepository.withTransaction(tx).updateByQuery({ tenantId: document.tenantId, id: requestId }, { documentId: document.id });
      this.#observationService.requestChange(requestId, tx);
    });
  }
}
