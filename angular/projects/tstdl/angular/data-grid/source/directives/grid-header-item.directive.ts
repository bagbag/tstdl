import { Directive, Inject, Input, Optional, TemplateRef } from '@angular/core';
import type { DynamicText } from '@tstdl/base/text';

@Directive({
  selector: 'tsl-data-grid [gridHeaderItem]'
})
export class GridHeaderItemDirective {
  readonly templateRef: TemplateRef<void> | null;

  @Input() label: DynamicText | null | undefined;

  constructor(@Inject(TemplateRef) @Optional() templateRef: TemplateRef<void> | null) {
    this.templateRef = templateRef;
  }
}
