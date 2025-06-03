import { DIALOG_DATA, DialogRef, type Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { enterAnimation } from '@tstdl/angular/animations';
import { ButtonComponent } from '@tstdl/angular/button';
import { InputComponent, InputGroupComponent, InputGroupLabelComponent } from '@tstdl/angular/form';
import { IconComponent } from '@tstdl/angular/icon';
import type { EnrichedDocumentCategory, EnrichedDocumentType } from '@tstdl/base/document-management';
import { compareByValueSelection, isNull } from '@tstdl/base/utils';
import { normalizeText } from '@tstdl/base/utils/string';
import { firstValueFrom } from 'rxjs';

import type { DocumentManagementContext } from '../../context';

export type DocumentTypeSelectDialogData = {
  context: DocumentManagementContext,
  selection?: EnrichedDocumentType | null,
};

export type DocumentTypeSelectDialogResult = {
  type: EnrichedDocumentType | null,
};

@Component({
  selector: 'tsl-document-type-select-dialog',
  imports: [FormsModule, ButtonComponent, IconComponent, InputGroupComponent, InputGroupLabelComponent, InputComponent],
  templateUrl: './document-type-select-dialog.component.html',
  styleUrl: './document-type-select-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [enterAnimation({ timing: '200ms ease' })],
  host: {
    class: 'tsl-tw',
  },
})
export class DocumentTypeSelectDialogComponent {
  readonly #dialogRef = inject(DialogRef<DocumentTypeSelectDialogResult>);
  readonly #data = inject<DocumentTypeSelectDialogData>(DIALOG_DATA);
  readonly context = this.#data.context;
  readonly selection = this.#data.selection ?? null;

  readonly searchFilter = signal<string>('');
  readonly selectedCategory = signal<EnrichedDocumentCategory | null>(this.#data.selection?.category ?? null);

  readonly layers = computed(() => getCategoryLayers(this.context.data()?.rootCategories ?? [], this.selectedCategory())
    .map((layer) => {
      const { relevant, irrelevant } = Object.groupBy(layer, (item) => item.relevant ? 'relevant' : 'irrelevant');
      return { relevant: relevant ?? [], irrelevant: irrelevant ?? [] };
    })
  );

  readonly filteredLayers = computed(() => {
    const searchFilter = normalizeText(this.searchFilter());

    return this.layers().map((layer) => {
      const { relevant, irrelevantWithFilter } = Object.groupBy(layer.relevant, ({ category, highlight }) => (highlight || category.helper.normalizedLabel.includes(searchFilter)) ? 'relevant' : 'irrelevantWithFilter')

      return {
        ...layer,
        relevant: relevant ?? [],
        irrelevant: [...layer.irrelevant, ...(irrelevantWithFilter ?? [])],
      };
    });
  });

  readonly categoryFilteredTypes = computed(() => this.selectedCategory()?.typesDeep ?? this.context.data()?.types ?? []);

  readonly types = computed(() => {
    const searchFilter = normalizeText(this.searchFilter());
    const sorted = this.categoryFilteredTypes().toSorted(compareByValueSelection((type) => type.label));

    if (searchFilter.length == 0) {
      return sorted;
    }

    return sorted.filter((type) => type.helper.normalizedLabel.includes(searchFilter));
  });

  static async open(data: DocumentTypeSelectDialogData, dialog: Dialog): Promise<DocumentTypeSelectDialogResult> {
    const dialogRef = dialog.open<DocumentTypeSelectDialogResult, DocumentTypeSelectDialogData>(DocumentTypeSelectDialogComponent, {
      data
    });

    dialogRef.backdropClick.subscribe(() => dialogRef.close());

    const result = await firstValueFrom(dialogRef.closed);

    return { type: result?.type ?? null };
  }

  close() {
    this.#dialogRef.close();
  }

  selectCategory(category: EnrichedDocumentCategory | null) {
    this.selectedCategory.update((currentCategory) => ((category == currentCategory) || (currentCategory?.parents.includes(category!) ?? false)) ? (category?.parent ?? null) : category);
    this.searchFilter.set('');
  }

  selectType(type: EnrichedDocumentType | null) {
    this.#dialogRef.close({ type });
  }
}

function getCategoryLayers(rootCategories: EnrichedDocumentCategory[], selectedCategory: EnrichedDocumentCategory | null): { category: EnrichedDocumentCategory, highlight: boolean, relevant: boolean }[][] {
  const children = rootCategories.flatMap((category) => category.children);

  const mappedRootCategories = rootCategories.map((category) => {
    const isSelectedCategory = category == selectedCategory;
    const isParent = selectedCategory?.parents.includes(category) ?? false;

    const highlight = isParent || isSelectedCategory;
    const relevant = isNull(selectedCategory) || isNull(category.parent) || selectedCategory.parents.includes(category.parent) || (selectedCategory?.childrenDeep.includes(category) ?? false);

    return {
      category,
      highlight,
      relevant: relevant || highlight
    };
  })
    .toSorted(compareByValueSelection((item) => item.category.label));

  if (children.length == 0) {
    return [mappedRootCategories];
  }

  const nextLayers = getCategoryLayers(children, selectedCategory);

  return [
    mappedRootCategories,
    ...nextLayers
  ];
}
