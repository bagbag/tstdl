import type { DocumentCollectionMetadata } from '#/document-management/service-models/index.js';
import type { DocumentCollection } from '../../models/index.js';

export abstract class DocumentManagementAncillaryService {
  /**
   * Resolves application-specific metadata for a list of document collections.
   * @param collections An array of DocumentCollection entities.
   * @returns A promise that resolves to an array of DocumentCollectionMetadata, corresponding to the input collections.
   */
  abstract resolveMetadata(collections: DocumentCollection[]): DocumentCollectionMetadata[] | Promise<DocumentCollectionMetadata[]>;
}
