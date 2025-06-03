import { ChangeDetectionStrategy, Component, computed, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { injectQueryParameter } from '@tstdl/angular';
import { DocumentInboxComponent, documentManagementContext } from '@tstdl/angular/document-management';
import { InputComponent, InputGroupComponent, InputGroupLabelComponent } from '@tstdl/angular/form';

@Component({
  selector: 'app-document-management',
  imports: [DocumentInboxComponent, FormsModule, InputComponent, InputGroupComponent, InputGroupLabelComponent],
  templateUrl: './document-management.component.html',
  styleUrl: './document-management.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'full grid grid-rows-[auto,1fr] gap-8',
  },
})
export class DocumentManagementComponent {
  readonly collectionIdsInput = injectQueryParameter('collectionIds');
  readonly collectionIds = computed(() => this.collectionIdsInput()?.replace(' ', '').split(',').filter((id) => id.length > 0) ?? []);

  readonly context = documentManagementContext(this.collectionIds());

  constructor() {
    effect(() => this.context.collectionIds.set(this.collectionIds()));
  }
}

export default DocumentManagementComponent;
