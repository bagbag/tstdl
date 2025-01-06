import '#/polyfills.js';

import { Application } from '#/application/application.js';
import { configureDocumentManagement, migrateDocumentManagementSchema } from '#/document-management/module.js';
import { DocumentManagementService } from '#/document-management/services/document-management.service.js';
import { injectAsync } from '#/injector/inject.js';
import { configureS3ObjectStorage } from '#/object-storage/index.js';

async function bootstrap(): Promise<void> {
  configureDocumentManagement({
    database: {
      connection: {
        database: 'xxx',
        user: 'xxx',
        password: 'xxx'
      }
    },
    fileObjectStorageModule: 'documents'
  });

  configureS3ObjectStorage({ endpoint: 'http://localhost:10000', accessKey: 'tstdl-dev', secretKey: 'tstdl-dev', bucketPerModule: true });

  await migrateDocumentManagementSchema();
}

async function main(): Promise<void> {
  const documentManagementService = await injectAsync(DocumentManagementService);

  const collection = await documentManagementService.createCollection();
  const category = await documentManagementService.createCategory({ label: 'Testkategorie' });
  const type = await documentManagementService.createType({ categoryId: category.id, group: null, label: 'Testtyp' });
  const request = await documentManagementService.createDocumentRequest({ typeId: type.id, requiredFilesCount: 1, comment: null, collectionIds: [collection.id] });

  const data = await documentManagementService.loadData([collection.id]);

  console.log(data);
}

Application.run({ bootstrap }, main);
