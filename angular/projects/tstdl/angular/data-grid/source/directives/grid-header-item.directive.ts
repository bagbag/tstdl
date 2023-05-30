import { Directive, Inject, Input, Optional, TemplateRef } from '@angular/core';
import type { DynamicText } from '@tstdl/base/text';
import type { Enumeration } from '@tstdl/base/types';

@Directive({
  selector: '[gridHeaderItem]',
  exportAs: 'gridHeaderItem',
  standalone: true
})
export class GridHeaderItemDirective {
  readonly templateRef: TemplateRef<void> | null;

  @Input() label: DynamicText | null | undefined;
  @Input() enum: Enumeration | null | undefined;

  constructor(@Inject(TemplateRef) @Optional() templateRef: TemplateRef<void> | null) {
    this.templateRef = templateRef;
  }
}
