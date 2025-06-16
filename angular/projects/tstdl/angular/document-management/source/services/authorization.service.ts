import { inject, Injectable, type Signal } from '@angular/core';
import { AuthenticationClientService } from '@tstdl/base/authentication';
import type { Policy } from '@tstdl/base/document-management';
import { toSignal } from '@tstdl/base/signals';
import type { TypedOmit } from '@tstdl/base/types';
import { isUndefined } from '@tstdl/base/utils';
import { switchMap, type Observable } from 'rxjs';

import { DocumentManagementApiService } from '../api';

/**
 * This service forwards authorization checks to the backend.
 */
@Injectable({
  providedIn: 'root',
})
export class ForwardingDocumentManagementAuthorizationService {
  readonly #authenticationService = inject(AuthenticationClientService);
  readonly #api = inject(DocumentManagementApiService);
  readonly #cache = new Map<`${string}:${string}`, Observable<boolean>>();

  canReadCollection(collectionId: string): Signal<boolean> {
    return this.getSignal('canReadCollection', { collectionId });
  }

  canCreateDocuments(collectionId: string): Signal<boolean> {
    return this.getSignal('canCreateDocuments', { collectionId });
  }

  canUpdateDocument(documentId: string): Signal<boolean> {
    return this.getSignal('canUpdateDocument', { documentId });
  }

  canDeleteDocuments(collectionId: string): Signal<boolean> {
    return this.getSignal('canDeleteDocuments', { collectionId });
  }

  canAssignDocuments(collectionId: string): Signal<boolean> {
    return this.getSignal('canAssignDocuments', { collectionId });
  }

  canManageRequests(collectionId: string): Signal<boolean> {
    return this.getSignal('canManageRequests', { collectionId });
  }

  canApproveDocument(documentId: string): Signal<boolean> {
    return this.getSignal('canApproveDocument', { documentId });
  }

  canRejectDocument(documentId: string): Signal<boolean> {
    return this.getSignal('canRejectDocument', { documentId });
  }

  canProgressDocumentWorkflow(documentId: string): Signal<boolean> {
    return this.getSignal('canProgressDocumentWorkflow', { documentId });
  }

  canManageCategoriesAndTypes(): Signal<boolean> {
    return this.getSignal('canManageCategoriesAndTypes', {});
  }

  canReadDocumentRequestsTemplates(): Signal<boolean> {
    return this.getSignal('canReadDocumentRequestsTemplates', {});
  }

  canManageDocumentRequestsTemplates(): Signal<boolean> {
    return this.getSignal('canManageDocumentRequestsTemplates', {});
  }

  canManageValidationDefinitions(): Signal<boolean> {
    return this.getSignal('canManageValidationDefinitions', {});
  }

  private getSignal<Type extends Policy['type']>(type: Type, parameters: TypedOmit<Extract<Policy, { type: Type }>, 'type'>): Signal<boolean> {
    const cacheKey = `canReadCollection:${JSON.stringify(parameters)}` as const;
    let allowed$ = this.#cache.get(cacheKey);

    if (isUndefined(allowed$)) {
      allowed$ = this.#authenticationService.subject$.pipe(
        switchMap(async (subject) => {
          if (isUndefined(subject)) {
            return false;
          }

          console.log('ForwardingDocumentManagementAuthorizationService: Forwarding authorization check', type, parameters);
          return await this.#api.testAuthorization({ type, ...parameters } as Policy);
        })
      );

      this.#cache.set(cacheKey, allowed$);
    }

    return toSignal(allowed$, { initialValue: false });
  }
}
