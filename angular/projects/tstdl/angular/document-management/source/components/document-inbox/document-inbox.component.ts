import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, effect, ErrorHandler, inject, input, signal, ViewEncapsulation } from '@angular/core';
import { DropDirective, fadeInOutAnimation } from '@tstdl/angular';
import { enterAnimation } from '@tstdl/angular/animations';
import { IconComponent } from '@tstdl/angular/icon';
import { DocumentAssignmentTarget } from '@tstdl/base/document-management';
import { isDefined, isUndefined } from '@tstdl/base/utils';

import type { DocumentManagementContext } from '../../context';
import { DocumentDetailsComponent } from '../document-details/document-details.component';
import { DocumentStateComponent } from "../document-state/document-state.component";
import { DocumentInboxDocumentComponent } from './document-inbox-document/document-inbox-document.component';

type PendingUpload = {
  file: File,
};

@Component({
  selector: 'tsl-document-inbox',
  imports: [DocumentInboxDocumentComponent, IconComponent, DocumentStateComponent],
  templateUrl: './document-inbox.component.html',
  styleUrl: './document-inbox.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  hostDirectives: [DropDirective],
  animations: [fadeInOutAnimation(), enterAnimation()],
  host: {
    class: 'tsl-tw',
  },
})
export class DocumentInboxComponent {
  readonly #dialog = inject(Dialog);
  readonly #errorHandler = inject(ErrorHandler);

  readonly drop = inject(DropDirective);
  readonly disableEnterAnimation = signal(true);

  uploadsRunning = false;

  readonly context = input.required<DocumentManagementContext>();

  readonly pendingDocuments = computed(() => this.context().data()?.documents.filter((document) => document.approval == 'pending'));
  readonly pendingUploads = signal([] as PendingUpload[]);

  constructor() {
    this.drop.filesDropped.subscribe((files) => this.onFilesDropped(files));

    let dataCounter = 0;
    const effectRef = effect(() => {
      if (isDefined(this.context().data()) && (++dataCounter >= 2)) {
        this.disableEnterAnimation.set(false);
        effectRef.destroy();
      }
    });
  }

  onFilesDropped(files: File[]): void {
    this.pendingUploads.update((existing) => [...existing, ...files.map((file) => ({ file }))]);
    void this.handleUploads();
  }

  async handleUploads(): Promise<void> {
    if (this.uploadsRunning) {
      return;
    }

    this.uploadsRunning = true;

    try {
      while (true) {
        const upload = this.pendingUploads()[0];

        if (isUndefined(upload)) {
          console.log('handleUploads: no more uploads');
          break;
        }

        try {
          const { uploadId, uploadUrl } = await this.context().api.initiateDocumentUpload({ contentLength: upload.file.size });

          const response = await fetch(uploadUrl, {
            method: 'PUT',
            body: upload.file,
          });

          if (!response.ok) {
            throw new Error(`Failed to upload file: ${response.status} ${response.statusText}`);
          }

          await this.context().api.createDocument({
            uploadId,
            originalFileName: upload.file.name,
            assignment: { automatic: { scope: this.context().collectionIds(), target: DocumentAssignmentTarget.Collection } },
          });
        }
        catch (error) {
          this.#errorHandler.handleError(error);
        }
        finally {
          this.pendingUploads.update((uploads) => uploads.filter((u) => u !== upload));
          // this.context().reload();
        }
      }
    }
    finally {
      this.uploadsRunning = false;
    }
  }

  openDocument(documentId: string): void {
    DocumentDetailsComponent.open({
      context: this.context(),
      documentId,
    }, this.#dialog);
  }
}
