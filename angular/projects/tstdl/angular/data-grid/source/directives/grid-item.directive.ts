import { ContentChild, Directive, Inject, Input, Optional, TemplateRef } from '@angular/core';
import type { DynamicText } from '@tstdl/base/text';
import type { Enumeration } from '@tstdl/base/types';
import type { GridValue } from '../models/grid-value';
import type { GridValueType } from '../models/grid-value-type';
import { GRID_CONTENT } from './grid-content';
import { GridLabelDirective } from './grid-label.directive';

@Directive({
  selector: 'tsl-data-grid [gridItem]',
  providers: [
    { provide: GRID_CONTENT, useExisting: GridItemDirective }
  ]
})
export class GridItemDirective {
  readonly templateRef: TemplateRef<void> | null;

  @Input() label: DynamicText | null | undefined;
  @Input() value: GridValue | null | undefined;
  @Input() valueType: GridValueType | null | undefined;
  @Input() enum: Enumeration | null | undefined;
  @Input() nullValue: GridValue | null | undefined;
  @Input() suffix: string | null | undefined;
  @Input() colSpan: number | null | undefined;
  @Input() rowSpan: number | null | undefined;

  @ContentChild(GridLabelDirective) labelRef: GridLabelDirective | undefined;

  constructor(@Inject(TemplateRef) @Optional() templateRef: TemplateRef<void> | null) {
    this.templateRef = templateRef;
  }
}
