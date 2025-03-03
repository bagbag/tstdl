import { Singleton } from '#/injector/index.js';
import type { DocumentCollection } from '../../models/document-collection.model.js';

@Singleton()
export abstract class DocumentManagementAncillaryService {
  abstract resolveNames(collections: DocumentCollection[]): Promise<string[]>;
}
