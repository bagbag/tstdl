import './schemas.js';

import { inject, type InjectionToken } from '#/injector/index.js';
import { Database, migrate } from '#/orm/server/database.js';
import type { DatabaseConfig } from '#/orm/server/module.js';
import type { DocumentManagementAuthorizationService } from '../authorization/document-management-authorization.service.js';
import type { DocumentManagementAncillaryService } from './services/document-management-ancillary.service.js';

export class DocumentManagementConfiguration {
  ancillaryService: InjectionToken<DocumentManagementAncillaryService>;
  authorizationService: InjectionToken<DocumentManagementAuthorizationService>;
  fileObjectStorageModule: string;
  fileUploadObjectStorageModule: string;
  filePreviewObjectStorageModule: string;
  database?: DatabaseConfig;
  maxFileSize?: number;
};

export async function migrateDocumentManagementSchema(): Promise<void> {
  const connection = inject(DocumentManagementConfiguration, undefined, { optional: true })?.database?.connection;
  const database = inject(Database, connection);

  await migrate(
    database,
    {
      migrationsSchema: 'document_management',
      migrationsTable: '_migrations',
      migrationsFolder: import.meta.resolve('./drizzle').replace('file://', ''),
    }
  );
}
