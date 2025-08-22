# Document Management Module

This module provides a comprehensive system for managing documents within logical groups called "Collections". It facilitates efficient document capture, AI-powered analysis, correct assignment, and quality assurance through defined workflows, human reviews, and validations.

## Table of Contents

- [Features](#features)
- [Core Concepts](#core-concepts)
- [Usage](#usage)
  - [Client-Side API Usage](#client-side-api-usage)
    - [Initializing the API Client](#initializing-the-api-client)
    - [Loading Collection Data](#loading-collection-data)
    - [Uploading a Document](#uploading-a-document)
    - [Updating a Document](#updating-a-document)
    - [Retrieving Document Content](#retrieving-document-content)
    - [Managing Categories and Types](#managing-categories-and-types)
    - [Managing Document Requests](#managing-document-requests)
    - [Advancing a Document's Workflow](#advancing-a-documents-workflow)
  - [Server-Side Configuration](#server-side-configuration)
    - [Module Configuration](#module-configuration)
    - [Implementing the Authorization Service](#implementing-the-authorization-service)
    - [Implementing the Ancillary Service](#implementing-the-ancillary-service)
    - [Initializing Categories and Types](#initializing-categories-and-types)
- [API Summary](#api-summary)

## Features

- **Document Collections**: Organize documents into logical, hierarchical groups (e.g., per user, project, or case).
- **AI-Powered Workflow**: Automated, asynchronous workflow for document processing:
  - **Classification**: AI automatically determines the document type.
  - **Extraction**: AI extracts key metadata, properties, and tags from the document content.
  - **Assignment**: AI suggests assignments to relevant collections or open document requests.
- **Human-in-the-Loop**: Each automated workflow step is followed by a manual review stage, allowing users to verify and correct AI-generated data before proceeding.
- **Structured Data**:
  - **Categories & Types**: Define a hierarchical taxonomy for classifying documents (e.g., Category: "Invoices", Type: "Incoming Invoice").
  - **Properties**: Define custom, typed data fields for different document types (e.g., "Invoice Number", "Amount").
- **Document Requests**: Create requests for specific documents within collections, which can be fulfilled by uploading a new document.
- **File Handling**: Secure file uploads via pre-signed URLs, storage in a configurable object storage provider, and generation of file previews (e.g., for PDFs).
- **Real-time Updates**: Subscribe to collection data changes via Server-Sent Events (SSE) for a responsive UI.
- **Extensible Authorization**: Fine-grained access control managed through a dedicated authorization service.

## Core Concepts

The document management module is built around a structured, workflow-driven approach to handling documents.

### Collections

A **Collection** is the primary container for organizing documents. It represents a specific context, such as a user's personal documents, a project folder, or a customer file. Collections can be hierarchical, allowing for nested structures. They serve as the scope for document requests and authorization rules.

### Documents, Categories, Types, and Properties

- A **Document** represents a single file (e.g., a PDF or image) and its associated metadata.
- Every document is classified by a **Document Type** (e.g., "Invoice"), which belongs to a **Document Category** (e.g., "Finance"). This creates a structured taxonomy.
- **Document Properties** are custom, typed data fields (e.g., "Invoice Number" as text, "Amount" as a decimal) that can be attached to document types, allowing structured data to be extracted and stored.

### AI-Powered Workflow

When a document is uploaded, it enters an asynchronous, queue-based workflow designed to process it without blocking the user.

1.  **Classification**: The AI analyzes the document's content to determine its `DocumentType`.
2.  **Extraction**: The AI extracts metadata (title, date, summary), suggests relevant tags, and populates the `DocumentProperties` associated with its type.
3.  **Assignment**: If the document was not uploaded for a specific purpose, the AI attempts to assign it to the most suitable `DocumentCollection` or an open `DocumentRequest`.
4.  **Validation**: Optional custom validation rules can be executed to check for data plausibility or completeness.

After each automated step (except Classification), the workflow enters a `Review` state. A user must then verify the results, make corrections if necessary, and manually trigger the next step. Once a document is finally approved, it becomes immutable.

### Document Requests

A **Document Request** signifies the need for a specific type of document within one or more collections. Users can fulfill a request by uploading a new document, which then becomes directly associated with that request and its collections. **Request Templates** allow for the standardized creation of common sets of document requests.

### Authorization and Ancillary Services

- **`DocumentManagementAuthorizationService`**: This abstract class must be implemented by the consuming application. It defines the rules for who can perform actions like reading collections, uploading documents, or approving them.
- **`DocumentManagementAncillaryService`**: This service allows the application to provide context-specific metadata for collections, such as a user-friendly name or a grouping identifier, which are not part of the core module's data model.

## Usage

### Client-Side API Usage

#### Loading Collection Data

You can fetch all data for one or more collections at once. The returned data includes documents, requests, categories, and more.

```typescript
import { toEnrichedDocumentManagementData } from '@tstdl/base/document-management';

const userFolderId = '...';
const carFolderId = '...';

// Fetch initial data
const data = await documentManagementApi.loadData({ collectionIds: [userFolderId, carFolderId] });

// The raw data can be wrapped in an "enriched" data view for easier navigation and access
const enrichedData = toEnrichedDocumentManagementData(data);
console.log(enrichedData.documents);
console.log(enrichedData.requests);

// For real-time updates, use the stream endpoint
const stream = await documentManagementApi.loadDataStream({ collectionIds: [userFolderId] });

for await (const updatedData of stream) {
  console.log('Received updated data:', updatedData);
}
```

#### Uploading a Document

Uploading a document is a two-step process: first, initiate the upload to get a secure URL, then upload the file and create the document record.

```typescript
const file = new File(['...'], 'invoice.pdf', { type: 'application/pdf' });

// 1. Initiate the upload
const { uploadId, uploadUrl } = await documentManagementApi.initiateDocumentUpload({ contentLength: file.size });

// 2. Upload the file to the provided URL
await fetch(uploadUrl, { method: 'PUT', body: file });

// 3. Create the document record and start the workflow

// Example 1: Assign to a specific collection
const document = await documentManagementApi.createDocument({
  uploadId,
  originalFileName: file.name,
  assignment: {
    collections: 'user-collection-id-123'
  }
});

// Example 2: Fulfill a specific document request
const documentForRequest = await documentManagementApi.createDocument({
  uploadId,
  originalFileName: file.name,
  assignment: {
    request: 'request-id-456'
  }
});

// Example 3: Automatic assignment (AI will determine the best collection/request)
const documentForAutoAssignment = await documentManagementApi.createDocument({
  uploadId,
  originalFileName: file.name,
  assignment: {
    automatic: {
      target: 'request', // or 'collection'
      scope: ['user-collection-id-123', 'car-collection-id-789'] // collections to search within
    }
  }
});

console.log('Document created:', document.id);
```

#### Updating a Document

After a document has been processed by the AI and is in the `Review` state, you can update its metadata.

```typescript
const documentId = '...';

await documentManagementApi.updateDocument({
  id: documentId,
  title: 'Corrected Invoice Title',
  tags: ['invoice', 'important', 'new-tag'],
  properties: [
    { propertyId: 'invoice-number-prop-id', value: 'INV-2024-001' },
    { propertyId: 'amount-prop-id', value: 199.99 }
  ],
  collections: {
    assign: ['another-collection-id'],
    archive: ['old-collection-id']
  }
});
```

#### Retrieving Document Content

You can get URLs to download the original file or a generated preview image.

```typescript
const documentId = '...';

// Get a URL to view the document inline in the browser
const viewUrl = await documentManagementApi.getContentUrl({ id: documentId });
window.open(viewUrl, '_blank');

// Get a URL to force-download the document
const downloadUrl = await documentManagementApi.getContentUrl({ id: documentId, download: true });

// Get a URL for a preview image of the first page
const previewUrl = await documentManagementApi.getPreviewUrl({ id: documentId, page: 1 });
```

#### Managing Categories and Types

If authorized, you can create new document categories and types.

```typescript
// Create a root category
const financeCategory = await documentManagementApi.createCategory({
  label: 'Finance',
  parentId: null
});

// Create a type within that category
const invoiceType = await documentManagementApi.createType({
  label: 'Invoice',
  categoryId: financeCategory.id
});
```

#### Managing Document Requests

You can create individual requests or apply predefined templates.

```typescript
// Create a single document request in a user's collection
const request = await documentManagementApi.createDocumentRequest({
  typeId: 'invoice-type-id',
  comment: 'Please upload your latest phone bill.',
  collectionIds: ['user-collection-id-123']
});

// Apply a template to create multiple requests at once
await documentManagementApi.applyDocumentRequestsTemplate({
  id: 'new-customer-template-id',
  collectionIds: ['user-collection-id-123']
});
```

#### Advancing a Document's Workflow

When a document is in `Review` state, a user can approve the current step's data and proceed to the next.

```typescript
const documentId = '...';

// After reviewing the extracted data, proceed to the assignment step
await documentManagementApi.proceedDocumentWorkflow({ id: documentId });
```

### Server-Side Configuration

#### Module Configuration

To use the module, you need to configure it in your application's setup process.

```typescript
import { configureDocumentManagement } from '@tstdl/base/document-management/server';
import { AppAuthorizationService } from './my-authorization.service.js';
import { AppAncillaryService } from './my-ancillary.service.js';

// In your bootstrap file (e.g., bootstrap.ts)
export function bootstrap() {
  // ... other configurations

  configureDocumentManagement({
    // Service to provide application-specific collection metadata
    ancillaryService: AppAncillaryService,

    // Service for handling all authorization checks
    authorizationService: AppAuthorizationService,

    // Names of the configured S3 Object Storage modules
    fileObjectStorageModule: 'document-files',
    fileUploadObjectStorageModule: 'document-uploads',
    filePreviewObjectStorageModule: 'document-previews',

    // Optional: Max file size in bytes
    maxFileSize: 10 * 1024 * 1024, // 10 MB
  });
}
```

#### Implementing the Authorization Service

You must provide an implementation for `DocumentManagementAuthorizationService` to control access.

```typescript
import { DocumentManagementAuthorizationService } from '@tstdl/base/document-management';
import { Singleton } from '@tstdl/base/injector';
import type { MyTokenPayload } from './my-token.js'; // Your application's token type

@Singleton()
export class AppAuthorizationService extends DocumentManagementAuthorizationService<MyTokenPayload> {
  getTenantId(token?: MyTokenPayload): string {
    if (!token?.tenantId) {
      throw new Error('Tenant ID is required.');
    }
    return token.tenantId;
  }

  getSubject(token?: MyTokenPayload): string {
    return token!.subject;
  }

  async canReadCollection(collectionId: string, token?: MyTokenPayload): Promise<boolean> {
    // Your logic here: e.g., check if the user (token.subject) owns this collection
    return true;
  }

  async canCreateDocuments(collectionId: string, token?: MyTokenPayload): Promise<boolean> {
    // Your logic here
    return true;
  }

  // ... implement all other abstract methods
}
```

#### Implementing the Ancillary Service

Implement `DocumentManagementAncillaryService` to provide display names and groups for your collections.

```typescript
import { DocumentManagementAncillaryService } from '@tstdl/base/document-management/server';
import type { DocumentCollection, DocumentCollectionMetadata } from '@tstdl/base/document-management';
import { inject, Singleton } from '@tstdl/base/injector';

import { UserRepository } from './my-user.repository.js'; // Your application's repositories

@Singleton()
export class AppAncillaryService extends DocumentManagementAncillaryService {
  readonly #userRepository = inject(UserRepository);

  async resolveMetadata(collections: DocumentCollection[]): Promise<DocumentCollectionMetadata[]> {
    // Example: assuming collection IDs are user IDs
    const userIds = collections.map(collection => collection.id);
    const users = await this.#userRepository.loadMany(userIds);

    return collections.map(collection => {
      const user = users.find(u => u.id == collection.id);
      return {
        name: user?.name ?? 'Unknown User',
        group: 'Users'
      };
    });
  }
}
```

#### Initializing Categories and Types

You can programmatically define and seed your document taxonomy.

```typescript
import { DocumentManagementService } from '@tstdl/base/document-management/server';
import { DocumentPropertyDataType } from '@tstdl/base/document-management';
import { defineEnum } from '@tstdl/base/enumeration';
import { inject } from '@tstdl/base/injector';

// Define enums for type-safe references
export const PetCategory = defineEnum('PetCategory', { Pets: 'pets' });
export const PetType = defineEnum('PetType', { Dog: 'dog', Cat: 'cat' });
export const PetProperty = defineEnum('PetProperty', { Name: 'name', Age: 'age' });

// In your application's startup logic
async function seedDocumentTypes() {
  const documentManagementService = inject(DocumentManagementService);

  await documentManagementService.initializeCategoriesAndTypes(null, {
    categoryLabels: { [PetCategory.Pets]: 'Pet Documents' },
    categoryParents: { [PetCategory.Pets]: null },
    typeLabels: {
      [PetType.Dog]: 'Dog Papers',
      [PetType.Cat]: 'Cat Papers'
    },
    typeCategories: {
      [PetType.Dog]: PetCategory.Pets,
      [PetType.Cat]: PetCategory.Pets
    },
    propertyConfigurations: {
      [PetProperty.Name]: [DocumentPropertyDataType.Text, 'Pet Name'],
      [PetProperty.Age]: [DocumentPropertyDataType.Integer, 'Pet Age']
    },
    typeProperties: {
      [PetType.Dog]: [PetProperty.Name, PetProperty.Age],
      [PetType.Cat]: [PetProperty.Name]
    }
  });
}
```

## API Summary

### Client-Side API

| Class | Description |
| :--- | :--- |
| `DocumentManagementApi` | Provides a typed client for interacting with the document management backend API. |

### Server-Side Configuration

| Function | Description |
| :--- | :--- |
| `configureDocumentManagement(config)` | Registers and configures the document management module. |
| `migrateDocumentManagementSchema()` | Applies database migrations for the module's tables. |

### Server-Side Services

| Class | Description |
| :--- | :--- |
| `DocumentManagementAuthorizationService` | Abstract service to be implemented by the application to control access to documents and collections. |
| `DocumentManagementAncillaryService` | Abstract service to be implemented by the application to provide context-specific metadata for collections. |
| `DocumentManagementService` | Core server-side service for managing documents, including initializing categories and types. |
| `DocumentService` | Handles document creation, updates, and file operations. |
| `DocumentFileService` | Manages physical file storage and retrieval from an object store. |
| `DocumentWorkflowService` | Manages the lifecycle and progression of document workflows. |
| `DocumentRequestService` | Manages document requests and templates. |
