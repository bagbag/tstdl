import { Directive, Inject, Optional, TemplateRef } from '@angular/core';

@Directive({
  selector: '[gridLabel]',
  exportAs: 'gridLabel'
})
export class GridLabelDirective {
  readonly templateRef: TemplateRef<void> | null;

  constructor(@Inject(TemplateRef) @Optional() templateRef: TemplateRef<void> | null) {
    this.templateRef = templateRef;
  }
}
