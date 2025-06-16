import { getEntityIds, type NewEntity } from '#/orm/index.js';
import { injectRepository, Transactional } from '#/orm/server/index.js';
import { and, eq } from 'drizzle-orm';
import { DocumentTag, DocumentTagAssignment, type Document } from '../../models/index.js';
import { documentTag, documentTagAssignment } from '../schemas.js';
import { DocumentManagementSingleton } from './singleton.js';

@DocumentManagementSingleton()
export class DocumentTagService extends Transactional {
  readonly tagRepository = injectRepository(DocumentTag);
  readonly tagAssignmentRepository = injectRepository(DocumentTagAssignment);

  async loadTags(tenantId: string | null): Promise<DocumentTag[]> {
    return await this.tagRepository.loadManyByQuery(
      { tenantId: { $or: [null, tenantId] } },
      { order: { label: 'asc' } }
    );
  }

  async loadOrCreate(tenantId: string, labels: string[]): Promise<DocumentTag[]> {
    if (labels.length === 0) {
      return [];
    }

    return await this.tagRepository.transaction(async (tx) => {
      const existingTags = await this.tagRepository.withTransaction(tx).loadManyByQuery({
        tenantId: { $or: [null, tenantId] },
        label: { $in: labels },
      });

      const newLabels = labels.filter((label) => !existingTags.some((tag) => tag.label == label));

      const newTags = newLabels.map((label): NewEntity<DocumentTag> => ({
        tenantId,
        label,
      }));

      const insertedTags = await this.tagRepository.withTransaction(tx).insertMany(newTags);

      return [...existingTags, ...insertedTags];
    });
  }

  async loadDocumentTags(tenantId: string, documentId: string): Promise<DocumentTag[]> {
    const result = await this.tagAssignmentRepository.session
      .select({ tag: documentTag })
      .from(documentTagAssignment)
      .innerJoin(documentTag, eq(documentTag.id, documentTagAssignment.tagId))
      .where(and(
        eq(documentTagAssignment.tenantId, tenantId),
        eq(documentTagAssignment.documentId, documentId)
      ));

    const tags = result.map((row) => row.tag);

    return await this.tagRepository.mapManyToEntity(tags);
  }

  async assignTags(document: Document, labels: string[]): Promise<void> {
    await this.tagAssignmentRepository.transaction(async (tx) => {
      const tags = await this.withTransaction(tx).loadOrCreate(document.tenantId, labels);
      const tagIds = getEntityIds(tags);

      const newAssignments = tagIds.map((tagId): NewEntity<DocumentTagAssignment> => ({ tenantId: document.tenantId, documentId: document.id, tagId }));

      await this.tagAssignmentRepository.withTransaction(tx).insertManyIfNotExists(['documentId', 'tagId'], newAssignments);
      await this.tagAssignmentRepository.withTransaction(tx).hardDeleteManyByQuery({ tenantId: document.tenantId, documentId: document.id, tagId: { $nin: tagIds } });
    });
  }
}
