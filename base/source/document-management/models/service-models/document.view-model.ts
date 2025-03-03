import { Timestamp } from '#/orm/types.js';
import { Array, StringProperty } from '#/schema/index.js';

import { DocumentCategory } from '../document-category.model.js';
import { DocumentCollection } from '../document-collection.model.js';
import { DocumentFile } from '../document-file.model.js';
import { DocumentPropertyValue } from '../document-property-value.model.js';
import { DocumentRequestFile } from '../document-request-file.model.js';
import { DocumentRequest } from '../document-request.model.js';
import { DocumentType } from '../document-type.model.js';
import { Document } from '../document.model.js';

export class DocumentCollectionView extends DocumentCollection {
  @StringProperty({ nullable: true })
  name: string | null;

  @StringProperty({ nullable: true })
  group: string | null;
}

export class DocumentViewCollectionAssignment {
  @StringProperty()
  collectionId: string;

  @Timestamp({ nullable: true })
  archiveTimestamp: Timestamp | null;
}

export class DocumentView extends Document {
  @Array(DocumentViewCollectionAssignment)
  collectionAssignments: DocumentViewCollectionAssignment[];

  @Array(DocumentPropertyValue)
  properties: DocumentPropertyValue[];
}

export class DocumentRequestView extends DocumentRequest {
  @Array(String)
  collectionIds: string[];

  @Array(DocumentRequestFile)
  requestFiles: DocumentRequestFile[];
}

export class DocumentManagementData {
  @Array(DocumentCollectionView)
  collections: DocumentCollectionView[];

  @Array(DocumentView)
  documents: DocumentView[];

  @Array(DocumentRequestView)
  requests: DocumentRequestView[];

  @Array(DocumentFile)
  files: DocumentFile[];

  @Array(DocumentCategory)
  categories: DocumentCategory[];

  @Array(DocumentType)
  types: DocumentType[];
}
