
import type { Uuid } from '#/orm/types.js';
import { distinct } from '#/utils/array/array.js';
import { groupToSingleMap } from '#/utils/iterable-helpers/group-to-single-map.js';
import { assertDefinedPass } from '#/utils/type-guards.js';
import type { DocumentType } from '../document-type.model.js';
import type { Document } from '../document.model.js';
import type { DocumentManagementData, DocumentView } from './document.view-model.js';
import type { NormalizedDocumentManagementData, NormalizedDocumentView } from './normalized-document-collection-view.model.js';

export type DocumentManagementFolder = {
  id: string,
  label: string,
  subFolders: DocumentManagementFolder[],
  documents: DocumentView[]
};

export type NormalizedDocumentManagementFolder = {
  id: string,
  label: string,
  subFolders: NormalizedDocumentManagementFolder[],
  documents: NormalizedDocumentView[]
};

export type GetDocumentManagementFoldersOptions = {
  primaryCollectionId?: string | null,
  includeAllFolder?: boolean
};

export function getDocumentManagementFolders(data: DocumentManagementData, options: GetDocumentManagementFoldersOptions = {}): DocumentManagementFolder[] {
  const categories = [...data.categories, { id: null, label: 'Sonstiges' }];
  const typeMap = groupToSingleMap(data.types, (t) => t.id as Uuid);

  function getType(document: Document): DocumentType | null {
    return typeMap.get(document.typeId!) ?? null;
  }

  const allFolder: DocumentManagementFolder[] = (options.includeAllFolder == true)
    ? []
    : [{
      id: 'all',
      label: 'Alle',
      documents: data.documents,
      subFolders: []
    }];

  const categoryFolders = categories.map((category): DocumentManagementFolder => ({
    id: `${category.id}`,
    label: category.label,
    subFolders: data.collections.map((collection): DocumentManagementFolder => {
      const collectionDocuments = (collection.id == options.primaryCollectionId)
        ? data.documents.filter((document) => (document.collectionAssignments.length == 1) && document.collectionAssignments.some((assignment) => assignment.collectionId == collection.id))
        : data.documents.filter((document) => document.collectionAssignments.some((assignment) => assignment.collectionId == collection.id));

      const categoryCollectionDocuments = collectionDocuments.filter((document) => (getType(document)?.categoryId ?? null) == category.id);
      const categoryCollectionDocumentTypeGroups = distinct(categoryCollectionDocuments.map((document) => getType(document)?.group ?? 'Unkategorisiert'));

      return {
        id: `${category.id}:${collection.id}`,
        label: collection.name ?? 'Unbenannt',
        subFolders: categoryCollectionDocumentTypeGroups.map((group) => ({
          id: `${category.id}:${collection.id}:${group}`,
          label: group,
          subFolders: [],
          documents: categoryCollectionDocuments.filter((document) => (getType(document)?.group ?? 'Unkategorisiert') == group)
        })).filter((folder) => folder.documents.length > 0),
        documents: categoryCollectionDocuments
      };
    }).filter((folder) => (folder.documents.length > 0) || (folder.subFolders.length > 0)),
    documents: data.documents.filter((document) => (getType(document)?.categoryId ?? null) == category.id)
  })).filter((folder) => (folder.documents.length > 0) || (folder.subFolders.length > 0));

  return [...allFolder, ...categoryFolders];
}

export function toNormalizedDocumentManagementFolders(folders: DocumentManagementFolder[], normalizedData: NormalizedDocumentManagementData): NormalizedDocumentManagementFolder[] {
  return folders.map((folder) => toNormalizedDocumentManagementFolder(folder, normalizedData));
}

export function toNormalizedDocumentManagementFolder(folder: DocumentManagementFolder, normalizedData: NormalizedDocumentManagementData): NormalizedDocumentManagementFolder {
  return {
    id: folder.id,
    label: folder.label,
    subFolders: folder.subFolders.map((subFolder) => toNormalizedDocumentManagementFolder(subFolder, normalizedData)),
    documents: folder.documents.map((document) => assertDefinedPass(normalizedData.documents.find((normalizedDocument) => normalizedDocument.id == document.id)))
  };
}

export function getFlatFolders(folders: NormalizedDocumentManagementFolder[]): NormalizedDocumentManagementFolder[] {
  return [...folders, ...folders.flatMap((folder) => getFlatFolders(folder.subFolders))];
}
