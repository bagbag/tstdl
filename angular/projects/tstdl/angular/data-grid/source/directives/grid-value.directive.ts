import { Directive, Inject, Optional, TemplateRef } from '@angular/core';

@Directive({
  selector: '[gridValue]',
  exportAs: 'gridValue'
})
export class GridValueDirective {
  readonly templateRef: TemplateRef<void> | null;

  constructor(@Inject(TemplateRef) @Optional() templateRef: TemplateRef<void> | null) {
    this.templateRef = templateRef;
  }
}
