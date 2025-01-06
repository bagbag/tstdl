import type { TypedOmit } from '#/types.js';
import { group, map } from '#/utils/iterable-helpers/index.js';
import { assertDefinedPass, isNull, isString } from '#/utils/type-guards.js';

import { distinct } from '#/utils/array/array.js';
import { compareByValueSelection } from '#/utils/comparison.js';
import type { DocumentCategory } from '../document-category.model.js';
import type { DocumentCollection } from '../document-collection.model.js';
import type { DocumentFile } from '../document-file.model.js';
import type { DocumentRequestFile } from '../document-request-file.model.js';
import type { DocumentType } from '../document-type.model.js';
import type { DocumentManagementData, DocumentRequestView, DocumentView } from './document.view-model.js';

export type RequestMetadata = {
  pendingRequestFilesCount: number,
  approvedRequestFilesCount: number,
  rejectedRequestFilesCount: number,
  requiredFilesLeft: number
};

export type RequestsMetadata = RequestMetadata & {
  requiredFilesCount: number
};

export type GroupedCollectionsItem = RequestsMetadata & {
  group: string | null,
  collections: NormalizedDocumentCollectionView[]
};

export type NormalizedDocumentManagementData = TypedOmit<DocumentManagementData, 'collections' | 'documents' | 'requests' | 'categories' | 'types'> & RequestsMetadata & {
  collections: NormalizedDocumentCollectionView[],
  groupedCollections: GroupedCollectionsItem[],
  documents: NormalizedDocumentView[],
  requests: NormalizedDocumentRequestView[],
  categories: NormalizedDocumentCategory[],
  types: NormalizedDocumentType[]
};

export type GroupedRequestsItem = { category: NormalizedDocumentCategory | null, groups: ({ label: string | null, requests: NormalizedDocumentRequestView[] } & RequestsMetadata)[] };

export type NormalizedDocumentCollectionView = DocumentCollection & RequestsMetadata & {
  name: string | null,
  group: string | null,
  documents: NormalizedDocumentView[],
  requests: NormalizedDocumentRequestView[],
  groupedRequests: GroupedRequestsItem[]
};

export type NormalizedDocumentView = TypedOmit<DocumentView, 'typeId'> & {
  type: NormalizedDocumentType | null,
  file: DocumentFile
};

export type NormalizedDocumentRequestView = TypedOmit<DocumentRequestView, 'typeId' | 'requestFiles'> & RequestMetadata & {
  collections: NormalizedDocumentCollectionView[],
  type: NormalizedDocumentType | null,
  files: DocumentFile[],
  requestFiles: NormalizedDocumentRequestFileView[]
};

export type NormalizedDocumentRequestFileView = TypedOmit<DocumentRequestFile, 'fileId'> & {
  file: DocumentFile
};

export type NormalizedDocumentTypeGroup = {
  label: string | null,
  types: NormalizedDocumentType[]
};

export type NormalizedDocumentCategory = DocumentCategory & {
  groups: NormalizedDocumentTypeGroup[],
  types: NormalizedDocumentType[]
};

export type NormalizedDocumentType = TypedOmit<DocumentType, 'categoryId'> & {
  category: DocumentCategory
};

/**
 * @param primaryCollectionId - if a document request is for multiple collections, remove the primary collection from the request to avoid duplication
 * @returns
 */
export function toNormalizedDocumentManagementData(data: DocumentManagementData, options?: { primaryCollectionId?: string | null }): NormalizedDocumentManagementData { // eslint-disable-line max-lines-per-function
  const normalizedTypes = data.types.map((type): NormalizedDocumentType => ({
    ...type,
    category: assertDefinedPass(data.categories.find((category) => category.id == type.categoryId))
  }));

  const normalizedCategories = data.categories.map((category): NormalizedDocumentCategory => {
    const categoryTypes = normalizedTypes.filter((type) => type.category.id == category.id);
    const categoryGroups = [...group(categoryTypes, (type) => type.group)].map(([label, types]) => ({ label, types })).toSorted(compareByValueSelection(({ label }) => label));

    return {
      ...category,
      types: categoryTypes,
      groups: categoryGroups
    };
  });

  const normalizedDocuments = data.documents.map((document): NormalizedDocumentView => ({
    ...document,
    file: assertDefinedPass(data.files.find((file) => file.id == document.fileId)),
    type: isNull(document.typeId) ? null : assertDefinedPass(normalizedTypes.find((type) => type.id == document.typeId))
  }));

  const filteredRequests = isString(options?.primaryCollectionId)
    ? data.requests.map(
      (request): DocumentRequestView =>
        ((request.collectionIds.length >= 2) && request.collectionIds.includes(options.primaryCollectionId!))
          ? { ...request, collectionIds: request.collectionIds.filter((collectionId) => collectionId != options.primaryCollectionId) }
          : request
    )
    : data.requests;

  const normalizedDocumentRequests = filteredRequests.map((request): NormalizedDocumentRequestView => ({
    ...request,
    collections: [],
    type: isNull(request.typeId) ? null : assertDefinedPass(normalizedTypes.find((type) => type.id == request.typeId)),
    files: request.requestFiles.map((requestFile) => assertDefinedPass(data.files.find((file) => file.id == requestFile.fileId))),
    requestFiles: request.requestFiles.map((requestFile) => ({
      ...requestFile,
      file: assertDefinedPass(data.files.find((file) => file.id == requestFile.fileId))
    })),
    ...calculateRequestMetadata(request)
  }));

  const normalizedCollections = data.collections.map((collection): NormalizedDocumentCollectionView => {
    const collectionRequests = normalizedDocumentRequests.filter((request) => request.collectionIds.includes(collection.id));

    const groupedCollectionRequests = [...map(
      group(collectionRequests, (request) => request.type?.category.id),
      ([categoryId, requests]): GroupedRequestsItem => ({
        category: normalizedCategories.find((c) => c.id == categoryId) ?? null,
        groups: [...map(
          group(requests, (request) => request.type?.group),
          ([groupLabel, groupRequests]) => ({ label: groupLabel ?? null, requests: groupRequests, ...calculateRequestsMetadata(groupRequests) })
        )]
      })
    )];

    return {
      ...collection,
      documents: normalizedDocuments.filter((document) => document.collectionAssignments.some((assignment) => assignment.collectionId == collection.id)),
      requests: collectionRequests,
      groupedRequests: groupedCollectionRequests,
      ...calculateRequestsMetadata(collectionRequests)
    };
  });

  for (const collection of normalizedCollections) {
    for (const request of collection.requests) {
      request.collections.push(collection);
    }
  }

  const groupedCollections = [
    ...map(group(normalizedCollections, (collection) => collection.group), ([group, collections]) => {
      const collectionsRequests = distinct(collections.flatMap((collection) => collection.requests), (request) => request.id);

      return {
        group,
        collections,
        ...calculateRequestsMetadata(collectionsRequests)
      };
    })
  ];

  return {
    ...data,
    collections: normalizedCollections,
    groupedCollections,
    requests: normalizedDocumentRequests,
    documents: normalizedDocuments,
    categories: normalizedCategories,
    types: normalizedTypes,
    ...calculateRequestsMetadata(filteredRequests)
  };
}

function calculateRequestsMetadata(requests: (DocumentRequestView | NormalizedDocumentRequestView)[]): RequestsMetadata {
  const requestMetadatas = requests.map(calculateRequestMetadata);

  const requiredFilesCount = requests.reduce((sum, request) => (sum + request.requiredFilesCount), 0);
  const pendingRequestFilesCount = requestMetadatas.reduce((sum, metadata) => (sum + metadata.pendingRequestFilesCount), 0);
  const approvedRequestFilesCount = requestMetadatas.reduce((sum, metadata) => (sum + metadata.approvedRequestFilesCount), 0);
  const rejectedRequestFilesCount = requestMetadatas.reduce((sum, metadata) => (sum + metadata.rejectedRequestFilesCount), 0);
  const requiredFilesLeft = requestMetadatas.reduce((sum, metadata) => (sum + metadata.requiredFilesLeft), 0);

  return {
    requiredFilesCount,
    pendingRequestFilesCount,
    approvedRequestFilesCount,
    rejectedRequestFilesCount,
    requiredFilesLeft
  };
}

function calculateRequestMetadata(request: DocumentRequestView | NormalizedDocumentRequestView): RequestMetadata {
  const pendingRequestFilesCount = request.completed ? 0 : request.requestFiles.reduce((sum, requestFile) => (sum + (isNull(requestFile.approval) ? 1 : 0)), 0);
  const approvedRequestFilesCount = request.requestFiles.reduce((sum, requestFile) => (sum + ((requestFile.approval == true) ? 1 : 0)), 0);
  const rejectedRequestFilesCount = request.requestFiles.reduce((sum, requestFile) => (sum + ((requestFile.approval == false) ? 1 : 0)), 0);
  const requiredFilesLeft = request.completed ? 0 : Math.max(0, request.requiredFilesCount - approvedRequestFilesCount);

  return {
    pendingRequestFilesCount,
    approvedRequestFilesCount,
    rejectedRequestFilesCount,
    requiredFilesLeft
  };
}
