import { isNotNull } from '#/utils/type-guards.js';
import type { EnrichedDocumentCategory } from './enriched/enriched-document-category.view.js';
import type { EnrichedDocumentManagementData } from './enriched/enriched-document-management-data.view.js';
import type { EnrichedDocument } from './enriched/enriched-document.view.js';

export type DocumentManagementFolder = {
  id: string,
  type: 'collection' | 'category' | 'virtual',
  label: string,
  subFolders: DocumentManagementFolder[],
  documents: EnrichedDocument[],
};

export type GetDocumentManagementFoldersOptions = {
  includeChildCategoryDocuments?: boolean,
  includeAllFolder?: boolean,
};

export function getDocumentManagementFolders(data: EnrichedDocumentManagementData, options: GetDocumentManagementFoldersOptions = {}): DocumentManagementFolder[] {
  const allFolder: DocumentManagementFolder[] = (options.includeAllFolder == true)
    ? []
    : [{
      id: 'all',
      type: 'virtual',
      label: 'Alle',
      documents: data.documents,
      subFolders: [],
    }];

  function getCategoryFolder(category: EnrichedDocumentCategory): DocumentManagementFolder | null {
    const subFolders = category.children.map(getCategoryFolder).filter(isNotNull);
    const documents = data.documents.filter((document) => document.type?.category.id == category.id);

    const categoryFolder = {
      id: category.id,
      type: 'category',
      label: category.label,
      subFolders,
      documents: (options.includeChildCategoryDocuments == true) ? [...documents, ...subFolders.flatMap((folder) => folder.documents)] : documents,
    } satisfies DocumentManagementFolder;

    if ((categoryFolder.documents.length + categoryFolder.subFolders.length) == 0) {
      return null;
    }

    return categoryFolder;
  }

  const rootCategoryFolders = data.rootCategories.map(getCategoryFolder).filter(isNotNull);

  return [...allFolder, ...rootCategoryFolders];
}

export function getFlatFolders(folders: DocumentManagementFolder[]): DocumentManagementFolder[] {
  return [...folders, ...folders.flatMap((folder) => getFlatFolders(folder.subFolders))];
}
