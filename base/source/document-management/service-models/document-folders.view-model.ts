import { isNotNull } from '#/utils/type-guards.js';
import type { EnrichedDocumentCategory } from './enriched/enriched-document-category.view.js';
import type { EnrichedDocumentManagementData } from './enriched/enriched-document-management-data.view.js';

export type DocumentManagementFolder = {
  id: string,
  type: 'collection' | 'category' | 'virtual',
  label: string,
  subFolders: DocumentManagementFolder[],
};

export function getDocumentManagementFolders(data: EnrichedDocumentManagementData): DocumentManagementFolder[] {
  function getCategoryFolder(category: EnrichedDocumentCategory): DocumentManagementFolder | null {
    const subFolders = category.children.map(getCategoryFolder).filter(isNotNull);

    const categoryFolder = {
      id: category.id,
      type: 'category',
      label: category.label,
      subFolders,
    } satisfies DocumentManagementFolder;

    if ((category.documents.length + categoryFolder.subFolders.length) == 0) {
      return null;
    }

    return categoryFolder;
  }

  return data.rootCategories.map(getCategoryFolder).filter(isNotNull);
}

export function getFlatFolders(folders: DocumentManagementFolder[]): DocumentManagementFolder[] {
  return [...folders, ...folders.flatMap((folder) => getFlatFolders(folder.subFolders))];
}
