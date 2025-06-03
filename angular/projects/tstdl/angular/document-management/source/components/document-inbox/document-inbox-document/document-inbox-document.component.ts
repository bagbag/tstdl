import { ChangeDetectionStrategy, Component, computed, input, ViewEncapsulation } from '@angular/core';
import { DateTimeLocalePipe } from '@tstdl/angular';
import { BadgeComponent } from '@tstdl/angular/badge';
import { IconComponent } from '@tstdl/angular/icon';
import { DocumentWorkflowStep, type EnrichedDocument } from '@tstdl/base/document-management';
import { getMimeTypeExtensions } from '@tstdl/base/file';
import { dateShort } from '@tstdl/base/formats';
import { formatBytes } from '@tstdl/base/utils';

import type { DocumentManagementContext } from '../../../context';
import { PropertyValueComponent } from '../../property-value/property-value.component';

@Component({
  selector: 'tsl-document-inbox-document',
  imports: [DateTimeLocalePipe, BadgeComponent, IconComponent, PropertyValueComponent],
  templateUrl: './document-inbox-document.component.html',
  styleUrl: './document-inbox-document.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'tsl-tw',
  },
})
export class DocumentInboxDocumentComponent {
  readonly context = input.required<DocumentManagementContext>();
  readonly document = input.required<EnrichedDocument>();

  readonly DocumentWorkflowStep = DocumentWorkflowStep;
  readonly getMimeTypeExtensions = getMimeTypeExtensions;
  readonly formatBytes = formatBytes;
  readonly dateShort = dateShort;

  readonly documentId = computed(() => this.document().id);
  readonly previewUrl = computed(() => this.context().api.getEndpointUrl('loadPreview', { id: this.documentId(), page: 1 }));
}
