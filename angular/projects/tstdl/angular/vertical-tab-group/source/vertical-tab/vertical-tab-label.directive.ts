import { Directive, inject, TemplateRef } from '@angular/core';

@Directive({
  selector: '[verticalTabLabel]',
  exportAs: 'verticalTabLabel',
  standalone: true,
})
export class VerticalTabLabelDirective {
  readonly templateRef = inject<TemplateRef<void>>(TemplateRef, { optional: true });
}
