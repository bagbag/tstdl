import { DIALOG_DATA, DialogRef, type Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { BadgeComponent } from "@tstdl/angular/badge";
import { ButtonComponent } from '@tstdl/angular/button';
import { InputComponent, InputGroupComponent, InputGroupLabelComponent } from '@tstdl/angular/form';
import { IconComponent } from "@tstdl/angular/icon";
import { PdfViewerComponent } from "@tstdl/angular/pdf-viewer";
import { getMimeTypeExtensions } from '@tstdl/base/file';
import { dateShort, formatDateShort } from '@tstdl/base/formats';
import { assertDefinedPass, formatBytes, isNull } from '@tstdl/base/utils';
import { firstValueFrom } from 'rxjs';

import type { DocumentManagementContext } from '../../context';

export type DocumentDetailsData = {
  context: DocumentManagementContext,
  documentId: string
};

@Component({
  selector: 'tsl-document-details',
  imports: [PdfViewerComponent, ButtonComponent, BadgeComponent, IconComponent, InputGroupComponent, InputComponent, InputGroupLabelComponent],
  templateUrl: './document-details.component.html',
  styleUrl: './document-details.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'content-grid h-full sm:py-4',
  }
})
export class DocumentDetailsComponent {
  readonly #dialogRef = inject(DialogRef);
  readonly #data = inject<DocumentDetailsData>(DIALOG_DATA);
  readonly context = this.#data.context;
  readonly document = computed(() => assertDefinedPass(this.context.data()?.maps.documents.get(this.#data.documentId)));

  readonly getMimeTypeExtensions = getMimeTypeExtensions;
  readonly formatBytes = formatBytes;
  readonly dateShort = dateShort;

  readonly documentId = computed(() => this.document().id);
  readonly contentUrl = computed(() => { return this.context.api.getEndpointUrl('loadContent', { id: this.documentId() }) });

  readonly properties = computed(() => {
    const document = this.document();
    const date = document.date;

    return [
      { id: 'date', label: 'Datum', value: isNull(date) ? '-' : formatDateShort(date) },
      { id: 'mimeType', label: 'Typ', value: this.getMimeTypeExtensions(document.mimeType)[0] },
      { id: 'originalFileName', label: 'Original-Name', value: document.originalFileName ?? '-' },
      { id: 'size', label: 'Größe', value: this.formatBytes(document.size) },
      { id: 'pages', label: 'Seiten', value: document.pages },
      ...document.properties.map((property) => ({
        id: property.propertyId,
        label: property.label,
        value: property.value ?? '-',
      })),
    ];
  });

  static async open(data: DocumentDetailsData, dialog: Dialog): Promise<void> {
    const dialogRef = dialog.open(DocumentDetailsComponent, {
      data,
      width: '100dvw',
      height: '100dvh',
    });

    dialogRef.backdropClick.subscribe(() => dialogRef.close());

    await firstValueFrom(dialogRef.closed);
  }

  close() {
    this.#dialogRef.close();
  }

  async download(): Promise<void> {
    const url = await this.context.api.getContentUrl({ id: this.document().id, download: true });
    window.open(url, '_blank');
  }
}
