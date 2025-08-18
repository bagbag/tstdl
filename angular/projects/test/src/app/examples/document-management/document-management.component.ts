import { ChangeDetectionStrategy, Component, computed, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { injectQueryParameter } from '@tstdl/angular';
import { DocumentListComponent, documentManagementContext } from '@tstdl/angular/document-management';
import { InputComponent, InputGroupComponent, InputGroupLabelComponent } from '@tstdl/angular/form';
import { TreeViewComponent, type TreeViewItem } from '@tstdl/angular/tree-view';
import type { DocumentManagementFolder } from '@tstdl/base/document-management';
import { map } from '@tstdl/base/signals';

@Component({
  selector: 'app-document-management',
  imports: [DocumentListComponent, FormsModule, InputComponent, InputGroupComponent, InputGroupLabelComponent, TreeViewComponent],
  templateUrl: './document-management.component.html',
  styleUrl: './document-management.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'full grid grid-rows-[auto,1fr] gap-8',
  },
})
export class DocumentManagementComponent {
  readonly collectionIdsInput = injectQueryParameter('collectionIds');
  readonly searchTextInput = injectQueryParameter('searchText');
  readonly collectionIds = computed(() => this.collectionIdsInput()?.replace(' ', '').split(',').filter((id) => id.length > 0) ?? []);

  readonly context = documentManagementContext(this.collectionIds());
  readonly treeViewItems = map(this.context.folders, (folders) => folders?.map(folderToTreeViewItem));

  constructor() {
    effect(() => this.context.collectionIds.set(this.collectionIds()));
    effect(() => this.context.filter.searchText.set(this.searchTextInput() ?? ''));
  }
}

export default DocumentManagementComponent;

function folderToTreeViewItem(folder: DocumentManagementFolder): TreeViewItem {
  return {
    label: folder.label,
    icon: folder.type == 'collection' ? 'database' : 'folder',
    value: `${folder.type}:${folder.id}`,
    link: {},
    children: folder.subFolders.map(folderToTreeViewItem),
  };
}
