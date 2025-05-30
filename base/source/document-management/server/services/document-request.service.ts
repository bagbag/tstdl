import { count, isNotNull as dbIsNotNull, isNull as dbIsNull, eq, inArray, sql } from 'drizzle-orm';

import type { RequestStats } from '#/document-management/service-models/index.js';
import { BadRequestError } from '#/errors/index.js';
import type { NewEntity } from '#/orm/index.js';
import { Transactional, injectRepository } from '#/orm/server/index.js';
import type { OneOrMany } from '#/types.js';
import { toArray } from '#/utils/array/index.js';
import { assertDefinedPass, isNotNull } from '#/utils/type-guards.js';
import { DocumentApproval, DocumentCollectionAssignment, DocumentRequest, DocumentRequestCollectionAssignment, DocumentRequestState, DocumentRequestTemplate, DocumentRequestsTemplate } from '../../models/index.js';
import { document, documentRequest, documentRequestCollectionAssignment } from '../schemas.js';
import { DocumentManagementSingleton } from './singleton.js';

@DocumentManagementSingleton()
export class DocumentRequestService extends Transactional {
  readonly #documentRequestCollectionAssignmentRepository = injectRepository(DocumentRequestCollectionAssignment);
  readonly #documentRequestRepository = injectRepository(DocumentRequest);
  readonly #documentRequestTemplateRepository = injectRepository(DocumentRequestTemplate);
  readonly #documentRequestsTemplateRepository = injectRepository(DocumentRequestsTemplate);
  readonly #documentCollectionAssignmentRepository = injectRepository(DocumentCollectionAssignment);

  async getRequestStats(collectionIds: OneOrMany<string>): Promise<RequestStats> {
    const relevantRequests = this.session.$with('relevant_requests').as(
      this.session.selectDistinct({ id: documentRequest.id })
        .from(documentRequest)
        .innerJoin(documentRequestCollectionAssignment, eq(documentRequestCollectionAssignment.requestId, documentRequest.id))
        .where(inArray(documentRequestCollectionAssignment.collectionId, toArray(collectionIds))),
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

  async createRequestsTemplate(parameters: Pick<DocumentRequestsTemplate, 'label' | 'description'>): Promise<DocumentRequestsTemplate> {
    return await this.#documentRequestsTemplateRepository.insert(parameters);
  }

  async updateRequestsTemplate(id: string, parameters: Pick<DocumentRequestsTemplate, 'label' | 'description' | 'metadata'>): Promise<DocumentRequestsTemplate> {
    return await this.#documentRequestsTemplateRepository.update(id, parameters);
  }

  async applyRequestsTemplate(id: string, collectionIds: string[]): Promise<void> {
    const requestTemplates = await this.#documentRequestTemplateRepository.loadManyByQuery({ requestsTemplateId: id });

    await this.transaction(async (tx) => {
      for (const { typeId, comment } of requestTemplates) {
        await this.withTransaction(tx).createRequest(typeId, collectionIds, comment);
      }
    });
  }

  async deleteRequestsTemplate(id: string): Promise<DocumentRequestsTemplate> {
    return await this.#documentRequestsTemplateRepository.delete(id);
  }

  async createRequestTemplate(requestsTemplateId: string, typeId: string, comment: string): Promise<DocumentRequestTemplate> {
    return await this.#documentRequestTemplateRepository.insert({ requestsTemplateId, typeId, comment });
  }

  async updateRequestTemplate(id: string, parameters: Pick<DocumentRequestTemplate, 'typeId' | 'comment'>): Promise<DocumentRequestTemplate> {
    return await this.#documentRequestTemplateRepository.update(id, parameters);
  }

  async deleteRequestTemplate(id: string): Promise<DocumentRequestTemplate> {
    return await this.#documentRequestTemplateRepository.delete(id);
  }

  async createRequest(typeId: string, collectionIds: string[], comment: string | null): Promise<DocumentRequest> {
    if (collectionIds.length == 0) {
      throw new BadRequestError('No target collectionId specified.');
    }

    return await this.transaction(async (tx) => {
      const request = await this.#documentRequestRepository.withTransaction(tx).insert({ typeId, documentId: null, comment, state: DocumentRequestState.Open });

      const newDocumentRequestCollectionAssignments = collectionIds.map((collectionId): NewEntity<DocumentRequestCollectionAssignment> => ({ requestId: request.id, collectionId }));
      await this.#documentRequestCollectionAssignmentRepository.withTransaction(tx).insertMany(newDocumentRequestCollectionAssignments);

      return request;
    });
  }

  async updateRequest(id: string, update: Partial<Pick<DocumentRequest, 'typeId' | 'comment'>>): Promise<void> {
    await this.transaction(async (tx) => {
      const request = await this.#documentRequestRepository.withTransaction(tx).load(id);

      if (isNotNull(request.documentId)) {
        throw new BadRequestError('Cannot update document requests which have an assigned document.');
      }

      await this.#documentRequestRepository.withTransaction(tx).update(id, update);
    });
  }

  async deleteRequest(id: string): Promise<void> {
    await this.transaction(async (tx) => {
      const request = await this.#documentRequestRepository.withTransaction(tx).load(id);

      if (isNotNull(request.documentId)) {
        throw new BadRequestError('Cannot delete requests which have an assigned document.');
      }

      await this.#documentRequestCollectionAssignmentRepository.withTransaction(tx).deleteManyByQuery({ requestId: id });
      await this.#documentRequestRepository.withTransaction(tx).delete(id);
    });
  }

  async assignDocument(requestId: string, documentId: string): Promise<void> {
    await this.transaction(async (tx) => {
      const request = await this.#documentRequestRepository.withTransaction(tx).load(requestId);

      if (isNotNull(request.documentId)) {
        throw new BadRequestError('Document request already has a document assigned.');
      }

      await this.#documentRequestRepository.withTransaction(tx).update(requestId, { documentId });
    });
  }

  /**
   * Fulfills a document request.
   * Marks the request as fulfilled and creates associations between the document
   * and the target collections defined in the request.
   *
   * @param requestId The ID of the DocumentRequest to fulfill.
   * @param documentId The ID of the Document fulfilling the request.
   * @param userId The ID of the user performing the action (for audit purposes).
   * @throws NotFoundError if the DocumentRequest with the given ID does not exist.
   */
  async fulfillRequest(requestId: string, documentId: string): Promise<void> {
    await this.transaction(async (tx) => {
      const request = await this.#documentRequestRepository.withTransaction(tx).load(requestId);

      if (request.state == DocumentRequestState.Fulfilled) {
        throw new BadRequestError('Document request is already fulfilled.');
      }

      const targetCollectionIds = await this.#documentRequestCollectionAssignmentRepository.withTransaction(tx).loadManyByQuery({ requestId });

      if (targetCollectionIds.length == 0) {
        throw new Error('No document request collection for document request found.');
      }

      const links = targetCollectionIds.map((target): NewEntity<DocumentCollectionAssignment> => ({
        collectionId: target.collectionId,
        documentId,
        archiveTimestamp: null,
      }));

      await this.#documentCollectionAssignmentRepository.withTransaction(tx).insertMany(links);
      await this.#documentRequestRepository.withTransaction(tx).update(requestId, { state: DocumentRequestState.Fulfilled });
    });
  }
}
