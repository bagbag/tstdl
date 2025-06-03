import '#/polyfills.js';

import { configureAiService } from '#/ai/index.js';
import { MockApiRequestTokenProvider } from '#/api/server/api-request-token.provider.js';
import { configureApiServer } from '#/api/server/module.js';
import { Application } from '#/application/application.js';
import { configureTstdl } from '#/core.js';
import { DocumentManagementAuthorizationService, type DocumentCollection, type DocumentCollectionMetadata } from '#/document-management/index.js';
import { configureDocumentManagement } from '#/document-management/server/configure.js';
import { DocumentCategoryTypeService, DocumentCollectionService, DocumentManagementAncillaryService, DocumentManagementApiController, DocumentRequestService } from '#/document-management/server/index.js';
import { migrateDocumentManagementSchema } from '#/document-management/server/module.js';
import { DocumentManagementService } from '#/document-management/server/services/document-management.service.js';
import { configureNodeHttpServer } from '#/http/server/node/module.js';
import { Injector, Singleton } from '#/injector/index.js';
import { inject, injectManyAsync, runInInjectionContext } from '#/injector/inject.js';
import { configureLocalMessageBus } from '#/message-bus/index.js';
import { WebServerModule } from '#/module/index.js';
import { configureS3ObjectStorage } from '#/object-storage/index.js';
import { configureOrm } from '#/orm/server/index.js';
import { configurePostgresQueue, migratePostgresQueueSchema } from '#/queue/postgres/index.js';
import { configureDefaultSignalsImplementation } from '#/signals/implementation/configure.js';
import { boolean, positiveInteger, string } from '#/utils/config-parser.js';
import { TstdlCategoryParents, TstdlDocumentCategoryLabels, TstdlDocumentPropertyConfiguration, TstdlDocumentTypeCategories, TstdlDocumentTypeLabels, TstdlDocumentTypeProperties } from './categories-and-types.js';

const config = {
  database: {
    host: string('DATABASE_HOST', '127.0.0.1'),
    port: positiveInteger('DATABASE_PORT', 5432),
    user: string('DATABASE_USER', 'tstdl'),
    pass: string('DATABASE_PASS', 'wf7rq6glrk5jykne'),
    database: string('DATABASE_NAME', 'tstdl'),
    schema: string('DATABASE_SCHEMA', 'tstdl'),
  },
  ai: {
    apiKey: string('AI_API_KEY', undefined),
    keyFile: string('AI_API_KEY_FILE', undefined),
    vertex: {
      project: string('AI_VERTEX_PROJECT', undefined),
      location: string('AI_VERTEX_LOCATION', undefined),
    },
  },
  s3: {
    endpoint: string('S3_ENDPOINT', 'http://localhost:9000'),
    accessKey: string('S3_ACCESS_KEY', 'tstdl-dev'),
    secretKey: string('S3_SECRET_KEY', 'tstdl-dev'),
    bucket: string('S3_BUCKET', undefined),
    bucketPerModule: boolean('S3_BUCKET_PER_MODULE', true),
  },
};

@Singleton()
export class ExampleDocumentManagementAncillaryService extends DocumentManagementAncillaryService {
  override resolveMetadata(collections: DocumentCollection[]): DocumentCollectionMetadata[] {
    return collections.map((collection) => ({ name: collection.id.split('-')[0]!, group: null }));
  }
}

@Singleton()
export class AllowAllDocumentManagementAuthorizationService extends DocumentManagementAuthorizationService {
  override getSubject(): string { return '00000000-0000-0000-0000-000000000000'; }
  override canReadCollection(): boolean { return true; }
  override canCreateDocuments(): boolean { return true; }
  override canDeleteDocuments(): boolean { return true; }
  override canAssignDocuments(): boolean { return true; }
  override canUpdateDocument(): boolean { return true; }
  override canApproveDocument(): boolean { return true; }
  override canRejectDocument(): boolean { return true; }
  override canManageRequests(): boolean { return true; }
  override canManageCategoriesAndTypes(): boolean { return true; }
  override canReadDocumentRequestsTemplates(): boolean { return true; }
  override canManageDocumentRequestsTemplates(): boolean { return true; }
  override canManageValidationDefinitions(): boolean { return true; }
  override canProgressDocumentWorkflow(): boolean { return true; }
}

async function bootstrap(): Promise<void> {
  const injector = inject(Injector);

  configureTstdl();
  configureNodeHttpServer();
  configurePostgresQueue();
  configureLocalMessageBus();
  configureDefaultSignalsImplementation();

  configureOrm({
    connection: {
      host: config.database.host,
      port: config.database.port,
      user: config.database.user,
      password: config.database.pass,
      database: config.database.database,
    },
  });

  configureDocumentManagement({
    ancillaryService: ExampleDocumentManagementAncillaryService,
    authorizationService: AllowAllDocumentManagementAuthorizationService,
    fileObjectStorageModule: 'documents',
    fileUploadObjectStorageModule: 'document-uploads',
    filePreviewObjectStorageModule: 'document-previews',
  });

  configureS3ObjectStorage({
    endpoint: config.s3.endpoint,
    bucket: config.s3.bucket,
    bucketPerModule: config.s3.bucketPerModule,
    accessKey: config.s3.accessKey,
    secretKey: config.s3.secretKey,
  });

  configureApiServer({
    controllers: [DocumentManagementApiController],
    requestTokenProvider: MockApiRequestTokenProvider,
    gatewayOptions: {
      prefix: null,
      cors: {
        default: {
          autoAccessControlAllowOrigin: 'http://localhost:4200',
          accessControlAllowHeaders: 'Content-Type, Authorization',
        },
      },
    },
  });

  configureAiService({
    apiKey: config.ai.apiKey,
    keyFile: config.ai.keyFile,
  });

  await runInInjectionContext(injector, async () => await migrateDocumentManagementSchema());
  await runInInjectionContext(injector, async () => await migratePostgresQueueSchema());
}

async function main(): Promise<void> {
  const [documentManagementService, documentCollectionService] = await injectManyAsync(DocumentManagementService, DocumentCollectionService, DocumentCategoryTypeService, DocumentRequestService);

  const { categories, types } = await documentManagementService.initializeCategoriesAndTypes(TstdlDocumentCategoryLabels, TstdlCategoryParents, TstdlDocumentTypeLabels, TstdlDocumentTypeCategories, TstdlDocumentPropertyConfiguration, TstdlDocumentTypeProperties);

  const collectionCount = await documentCollectionService.repository.count();

  for (let i = 0; i < (3 - collectionCount); i++) {
    await documentCollectionService.createCollection(null);
  }

  const collections = await documentCollectionService.repository.loadAll();

  for (const collection of collections) {
    console.log(`Collection: ${collection.id}`);
  }
}

Application.run({ bootstrap }, main, WebServerModule);
