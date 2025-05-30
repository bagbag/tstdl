import { and, eq, sql } from 'drizzle-orm';

import type { DocumentCollectionMetadata } from '#/document-management/service-models/index.js';
import { inject } from '#/injector/inject.js';
import { TRANSACTION_TIMESTAMP, type Query } from '#/orm/index.js';
import { Transactional } from '#/orm/server/index.js';
import { injectRepository } from '#/orm/server/repository.js';
import type { OneOrMany } from '#/types.js';
import { toArray } from '#/utils/array/index.js';
import { fromEntries } from '#/utils/object/index.js';
import { assertDefinedPass, isString } from '#/utils/type-guards.js';
import { Document, DocumentCollection, DocumentCollectionAssignment } from '../../models/index.js';
import { document, documentCollectionAssignment } from '../schemas.js';
import { DocumentManagementAncillaryService } from './document-management-ancillary.service.js';
import { DocumentManagementSingleton } from './singleton.js';

@DocumentManagementSingleton()
export class DocumentCollectionService extends Transactional {
  readonly #ancillaryService = inject(DocumentManagementAncillaryService);
  readonly #documentRepository = injectRepository(Document);
  readonly #documentCollectionAssignmentRepository = injectRepository(DocumentCollectionAssignment);

  readonly repository = injectRepository(DocumentCollection);

  async resolveMetadata<const T extends (DocumentCollection | string)[]>(...collectionsOrIds: T): Promise<{ [K in keyof T]: DocumentCollectionMetadata }> {
    if (collectionsOrIds.length == 0) {
      return [] as { [K in keyof T]: DocumentCollectionMetadata };
    }

    const loadIds = collectionsOrIds.filter((collection) => isString(collection));

    if (loadIds.length == 0) {
      return this.#ancillaryService.resolveMetadata(collectionsOrIds as DocumentCollection[]) as { [K in keyof T]: DocumentCollectionMetadata };
    }

    const loadedCollections = await this.repository.loadManyByQuery({ id: { $in: loadIds } });

    const collections = collectionsOrIds.map(
      (collectionOrId) => isString(collectionOrId)
        ? assertDefinedPass(loadedCollections.find((collection) => collection.id == collectionOrId), `Could not load collection "${collectionOrId}".`)
        : collectionOrId,
    );

    return this.#ancillaryService.resolveMetadata(collections) as { [K in keyof T]: DocumentCollectionMetadata };
  }

  async resolveMetadataMap(...collectionsOrIds: (DocumentCollection | string)[]): Promise<Record<string, DocumentCollectionMetadata>> {
    const names = await this.resolveMetadata(...collectionsOrIds);
    const entries = collectionsOrIds.map((collectionOrId, index) => [isString(collectionOrId) ? collectionOrId : collectionOrId.id, names[index]!] as const);

    return fromEntries(entries);
  }

  async loadCollectionGraph(collectionId: string): Promise<DocumentCollection[]> {
    const collection = await this.repository.load(collectionId);

    if (collection.parentId == null) {
      return [collection];
    }

    const parents = await this.loadCollectionGraph(collection.parentId);
    return [...parents, collection];
  }

  async createCollection(parentId: string | null): Promise<DocumentCollection> {
    return await this.repository.withSession(this.session).insert({ parentId });
  }

  async collectionHasDocumentByFilter(collectionId: string, filter: Query<Document>): Promise<boolean> {
    const matchingDocuments = this.session
      .select()
      .from(documentCollectionAssignment)
      .leftJoin(document, eq(document.id, documentCollectionAssignment.documentId))
      .where(and(
        eq(documentCollectionAssignment.collectionId, collectionId),
        this.#documentRepository.convertQuery(filter)
      ));

    const result = await this.session.execute(sql`SELECT EXISTS(SELECT 1 FROM ${matchingDocuments}))`) as boolean[];

    console.log(result);
    throw new Error('verify');
    // return result[0]!;
  }

  async assignDocument(documentId: string, collectionIds: OneOrMany<string>): Promise<void> {
    const values = toArray(collectionIds).map((collectionId) => ({ collectionId, documentId, archiveTimestamp: null }));
    await this.#documentCollectionAssignmentRepository.withSession(this.session).upsertMany(['collectionId', 'documentId'], values);
  }

  async archiveDocument(documentId: string, collectionIds: OneOrMany<string>): Promise<void> {
    await this.#documentCollectionAssignmentRepository.withSession(this.session).updateManyByQuery(
      { collectionId: { $in: toArray(collectionIds) }, documentId, archiveTimestamp: null },
      { archiveTimestamp: TRANSACTION_TIMESTAMP }
    );
  }
}
