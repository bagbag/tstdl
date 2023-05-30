import { ContentChild, Directive, Inject, Input, Optional, TemplateRef } from '@angular/core';
import type { DynamicText } from '@tstdl/base/text';
import type { Enumeration } from '@tstdl/base/types';
import type { GridValue } from '../models/grid-value';
import type { GridValueType } from '../models/grid-value-type';
import { GRID_CONTENT } from './grid-content';
import { GridLabelDirective } from './grid-label.directive';
import { GridValueDirective } from './grid-value.directive';
import { isString } from '@tstdl/base/utils';

@Directive({
  selector: '[gridItem]',
  exportAs: 'gridItem',
  standalone: true,
  providers: [
    { provide: GRID_CONTENT, useExisting: GridItemDirective }
  ]
})
export class GridItemDirective {
  private readonly templateRef: TemplateRef<void> | null;

  @Input() label: DynamicText | null | undefined;
  @Input() value: GridValue | null | undefined;
  @Input() valueType: GridValueType | null | undefined;
  @Input() enum: Enumeration | null | undefined;
  @Input() nullValue: GridValue | null | undefined;
  @Input() suffix: string | null | undefined;
  @Input() colSpan: number | null | undefined;
  @Input() rowSpan: number | null | undefined;
  @Input() booleanTrueText: DynamicText | null | undefined;
  @Input() booleanFalseText: DynamicText | null | undefined;
  @Input() noValueText: DynamicText | null | undefined;

  @ContentChild(GridLabelDirective) labelRef: GridLabelDirective | null | undefined;
  @ContentChild(GridValueDirective) valueRef: GridValueDirective | null | undefined;

  @Input()
  set gridItem(label: DynamicText | null | undefined) {
    this.label = (isString(label) && (label.length == 0)) ? null : label;
  }

  get labelTemplateRef(): TemplateRef<void> | null | undefined {
    return this.labelRef?.templateRef;
  }

  get valueTemplateRef(): TemplateRef<void> | null | undefined {
    return this.templateRef ?? this.valueRef?.templateRef;
  }

  constructor(@Inject(TemplateRef) @Optional() templateRef: TemplateRef<void> | null) {
    this.templateRef = templateRef;
  }
}
