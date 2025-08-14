import { DIALOG_DATA, DialogRef, type Dialog } from '@angular/cdk/dialog';
import { CdkMenuTrigger } from '@angular/cdk/menu';
import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, Injector, runInInjectionContext, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { LocalizePipe } from '@tstdl/angular';
import { BadgeComponent } from '@tstdl/angular/badge';
import { ButtonComponent } from '@tstdl/angular/button';
import { InputComponent, InputGroupComponent, InputGroupLabelComponent, SelectComponent, SelectOptionComponent } from '@tstdl/angular/form';
import { IconComponent } from '@tstdl/angular/icon';
import { TslMenu } from '@tstdl/angular/menu';
import { PdfViewerComponent } from '@tstdl/angular/pdf-viewer';
import { DocumentPropertyDataType, DocumentWorkflowState, DocumentWorkflowStep } from '@tstdl/base/document-management';
import { getMimeTypeExtensions } from '@tstdl/base/file';
import { dateShort } from '@tstdl/base/formats';
import { switchAll } from '@tstdl/base/signals';
import { tstdlCommonLocalizationKeys } from '@tstdl/base/text';
import type { InputType, Record, TypedOmit } from '@tstdl/base/types';
import { assertDefinedPass, dateTimeToNumericDate, formatBytes, isBoolean, isNotNull, isNull, isNumber, isUndefined, numericDateToDateTime } from '@tstdl/base/utils';
import { objectEntries } from '@tstdl/base/utils/object';
import { normalizeTextInput } from '@tstdl/base/utils/string';
import { DateTime } from 'luxon';
import { firstValueFrom, map } from 'rxjs';
import { match } from 'ts-pattern';

import type { DocumentManagementContext } from '../../context';
import { DocumentTypeSelectDialogComponent } from '../document-type-select-dialog/document-type-select-dialog.component';

export type DocumentDetailsData = {
  dialog: Dialog,
  context: DocumentManagementContext,
  documentId: string
};

type PropertyItem = {
  id: string,
  label: string,
  type: DocumentPropertyDataType,
  inputType: InputType,
  editable: boolean,
  value: string | number | boolean | null,
};

@Component({
  selector: 'tsl-document-details',
  imports: [NgClass, ReactiveFormsModule, LocalizePipe, PdfViewerComponent, ButtonComponent, BadgeComponent, IconComponent, InputGroupComponent, InputComponent, InputGroupLabelComponent, TslMenu, CdkMenuTrigger, SelectComponent, SelectOptionComponent],
  templateUrl: './document-details.component.html',
  styleUrl: './document-details.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'tsl-tw content-grid h-full sm:py-4',
  },
})
export class DocumentDetailsComponent {
  readonly #injector = inject(Injector);
  readonly #dialogRef = inject(DialogRef);
  readonly #data = inject<DocumentDetailsData>(DIALOG_DATA);
  readonly #formBuilder = inject(FormBuilder);
  readonly context = this.#data.context;
  readonly document = computed(() => assertDefinedPass(this.context.data()?.maps.documents.get(this.#data.documentId)));

  readonly commonLocalizationKeys = tstdlCommonLocalizationKeys;
  readonly DocumentWorkflowStep = DocumentWorkflowStep;
  readonly DocumentWorkflowState = DocumentWorkflowState;
  readonly getMimeTypeExtensions = getMimeTypeExtensions;
  readonly formatBytes = formatBytes;
  readonly dateShort = dateShort;

  readonly canEdit = computed(() => this.document().approval == 'pending');
  // readonly canEdit = computed(() => false);

  readonly documentId = computed(() => this.document().id);
  readonly contentUrl = computed(() => this.context.api.getEndpointUrl('loadContent', { id: this.documentId() }));

  readonly assignableCollections = computed(() => {
    const existingCollectionIds = this.formValue().collections;
    return this.context.data()?.collections.filter((collection) => !existingCollectionIds.includes(collection.id)) ?? [];
  });

  readonly properties = computed((): PropertyItem[] => {
    const document = this.document();
    const date = document.date;

    return [
      {
        id: 'date',
        label: 'Datum',
        type: DocumentPropertyDataType.Date,
        inputType: 'date',
        editable: true,
        value: isNull(date) ? null : numericDateToDateTime(date).toFormat('yyyy-MM-dd'),
      },
      {
        id: 'mimeType',
        label: 'Typ',
        type: DocumentPropertyDataType.Text,
        inputType: 'text',
        editable: false,
        value: this.getMimeTypeExtensions(document.mimeType)[0] ?? null,
      },
      {
        id: 'originalFileName',
        label: 'Original-Name',
        type: DocumentPropertyDataType.Text,
        inputType: 'text',
        editable: false,
        value: document.originalFileName ?? '-',
      },
      {
        id: 'size',
        label: 'Größe',
        type: DocumentPropertyDataType.Text,
        inputType: 'text',
        editable: false,
        value: this.formatBytes(document.size),
      },
      {
        id: 'pages',
        label: 'Seiten',
        type: DocumentPropertyDataType.Integer,
        inputType: 'number',
        editable: false,
        value: document.pages?.toString() ?? null,
      },
      ...(document.type?.properties ?? []).map((property): PropertyItem => {
        const propertyValue = document.properties.find((p) => p.propertyId == property.id);

        return {
          id: property.id,
          type: property.dataType,
          label: property.label,
          inputType: match(property.dataType)
            .with('text', () => 'text' as const)
            .with('integer', () => 'number' as const)
            .with('decimal', () => 'number' as const)
            .with('boolean', () => 'checkbox' as const)
            .with('date', () => 'date' as const)
            .exhaustive(),
          editable: true,
          value: isUndefined(propertyValue)
            ? null
            : match(property.dataType)
              .with('text', () => isNull(String(propertyValue.value)) ? null : String(propertyValue.value))
              .with('integer', () => isNull(propertyValue.value) ? null : isNumber(propertyValue.value) ? propertyValue.value : parseInt(String(propertyValue.value)))
              .with('decimal', () => isNull(propertyValue.value) ? null : isNumber(propertyValue.value) ? propertyValue.value : parseFloat(String(propertyValue.value)))
              .with('boolean', () => isNull(propertyValue.value) ? null : isBoolean(propertyValue.value) ? propertyValue.value : null)
              .with('date', () => isNull(propertyValue.value) ? null : isNumber(propertyValue.value) ? numericDateToDateTime(propertyValue.value).toFormat('yyyy-MM-dd') : DateTime.fromJSDate(new Date(String(propertyValue.value))).toFormat('yyyy-MM-dd'))
              .exhaustive(),
        };
      }),
    ];
  });

  readonly form = computed(() => {
    const properties = this.#formBuilder.group<Record<string, string | number | boolean | null>>({});

    for (const property of this.properties()) {
      properties.addControl(property.id, this.#formBuilder.control(property.value));
    }

    const form = this.#formBuilder.group({
      typeId: this.#formBuilder.control(this.document().type?.id ?? null),
      title: this.#formBuilder.control(this.document().title),
      subtitle: this.#formBuilder.control(this.document().subtitle),
      comment: this.#formBuilder.control(this.document().comment),
      tags: this.#formBuilder.array(this.document().tags.map((tag) => this.#formBuilder.nonNullable.control(tag.label))),
      collections: this.#formBuilder.array(this.document().assignments.collections.map((collection) => this.#formBuilder.nonNullable.control(collection.collection.id))),
      properties,
    });

    if (!this.canEdit()) {
      form.disable();
    }

    return form;
  });

  readonly formValue = switchAll(() => {
    const form = this.form();
    return untracked(() => runInInjectionContext(this.#injector, () => toSignal(form.valueChanges.pipe(map(() => form.getRawValue())), { initialValue: form.getRawValue() })));
  });

  readonly fromValueDocumentTypeLabel = computed(() => {
    const typeId = this.formValue().typeId;

    if (isNull(typeId)) {
      return '-';
    }

    const type = this.context.data()?.maps.types.get(typeId);
    return type?.label ?? '-';
  });

  readonly formValueHasChanged = computed(() => {
    const formValue = this.formValue();
    const document = this.document();

    if (((document.type?.id ?? null) != formValue.typeId) || (document.title != formValue.title) || (document.subtitle != formValue.subtitle) || (document.comment != formValue.comment)) {
      return true;
    }

    if ((document.tags.map((tag) => tag.label).toSorted().join(',') != formValue.tags.filter((tag) => tag.length > 0).toSorted().join(','))) {
      return true;
    }

    for (const [id, controlValue] of objectEntries(formValue.properties)) {
      const property = this.properties().find((property) => property.id == id);
      if (controlValue != property?.value) {
        return true;
      }
    }

    return false;
  });

  static async open(data: TypedOmit<DocumentDetailsData, 'dialog'>, dialog: Dialog): Promise<void> {
    const dialogRef = dialog.open<undefined, DocumentDetailsData>(DocumentDetailsComponent, {
      data: { ...data, dialog },
      width: '100dvw',
      height: '100dvh',
    });

    dialogRef.backdropClick.subscribe(() => dialogRef.close());

    await firstValueFrom(dialogRef.closed);
  }

  close() {
    this.#dialogRef.close();
  }

  async selectDocumentType(): Promise<void> {
    const { type } = await DocumentTypeSelectDialogComponent.open({
      context: this.context,
      selection: this.context.data()?.maps.types.get(this.formValue().typeId!),
    }, this.#data.dialog);

    if (isNull(type)) {
      return;
    }

    this.form().patchValue({ typeId: type.id });
  }

  addCollection(id: string): void {
    this.form().controls.collections.push(this.#formBuilder.nonNullable.control(id));
  }

  removeCollection(index: number): void {
    this.form().controls.collections.removeAt(index);
  }

  addNewTag(): void {
    this.form().controls.tags.controls.unshift(this.#formBuilder.nonNullable.control(''));
  }

  removeTag(index: number): void {
    this.form().controls.tags.removeAt(index);
  }

  async save(): Promise<void> {
    const { typeId: type, title, subtitle, comment, tags, properties: { date, ...properties } } = this.formValue();
    const documentProperties = this.properties().filter((property) => property.editable && (property.id != 'date'));

    await this.context.api.updateDocument({
      id: this.document().id,
      typeId: type,
      title: normalizeTextInput(title),
      subtitle: normalizeTextInput(subtitle),
      date: isNull(date) ? null : dateTimeToNumericDate(DateTime.fromFormat(date as string, 'yyyy-MM-dd')),
      tags: (tags as string[]).map((tag) => normalizeTextInput(tag)).filter(isNotNull),
      comment: normalizeTextInput(comment),
      properties: documentProperties.map((property) => ({
        propertyId: property.id,
        value: match(property.type)
          .with('text', (): string | null => normalizeTextInput(properties[property.id] as string | null))
          .with('integer', (): number | null => isNull(properties[property.id]) ? null : isNumber(properties[property.id]) ? properties[property.id] as number : parseInt(String(properties[property.id])))
          .with('decimal', (): number | null => isNull(properties[property.id]) ? null : isNumber(properties[property.id]) ? properties[property.id] as number : parseFloat(String(properties[property.id])))
          .with('boolean', (): boolean | null => (isNull(properties[property.id]) || isBoolean(properties[property.id])) ? properties[property.id] as boolean : null)
          .with('date', (): number | null => {
            const normalized = normalizeTextInput(properties[property.id] as string | null);

            if (isNull(normalized)) {
              return null;
            }

            const dateTime = DateTime.fromFormat(normalized, 'yyyy-MM-dd');

            if (dateTime.isValid) {
              return dateTimeToNumericDate(dateTime);
            }

            return null;
          })
          .exhaustive(),
      })),
      collections: {
        assign: [],
        archive: [],
      },
    });
  }

  async proceedWorkflow(): Promise<void> {
    await this.context.api.proceedDocumentWorkflow({ id: this.document().id });
  }

  async download(): Promise<void> {
    const url = await this.context.api.getContentUrl({ id: this.document().id, download: true });
    window.open(url, '_blank');
  }
}
