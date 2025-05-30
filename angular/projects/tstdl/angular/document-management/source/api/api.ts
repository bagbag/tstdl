import { Injectable } from '@angular/core';
import { getApiService } from '@tstdl/angular';
import { documentManagementApiDefinition } from '@tstdl/base/document-management';

@Injectable({ providedIn: 'root' })
export class DocumentManagementApiService extends getApiService('DocumentManagement', documentManagementApiDefinition) { }
