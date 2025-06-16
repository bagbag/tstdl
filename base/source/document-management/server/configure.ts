import { Injector } from '#/injector/injector.js';
import { DocumentManagementAuthorizationService } from '../authorization/document-management-authorization.service.js';
import { DocumentManagementConfiguration } from './module.js';
import { DocumentManagementAncillaryService } from './services/index.js';

export function configureDocumentManagement(configuration: DocumentManagementConfiguration): void {
  Injector.register(DocumentManagementConfiguration, { useValue: configuration });
  Injector.register(DocumentManagementAncillaryService, { useToken: configuration.ancillaryService });
  Injector.register(DocumentManagementAuthorizationService, { useToken: configuration.authorizationService });
}
