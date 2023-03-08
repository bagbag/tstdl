import type { OnChanges } from '@angular/core';
import { Directive, ElementRef, Input, Renderer2 } from '@angular/core';
import { isNullOrUndefined } from '@tstdl/base/utils';
import type { AutoIdDirective } from './auto-id.directive';

@Directive({
  selector: 'label, [tslAutoFor]',
  standalone: true
})
export class AutoForDirective implements OnChanges {
  private readonly elementRef: ElementRef;
  private readonly renderer: Renderer2;

  @Input() autoFor: AutoIdDirective | null | undefined;

  constructor(elementRef: ElementRef, renderer: Renderer2) {
    this.elementRef = elementRef;
    this.renderer = renderer;
  }

  ngOnChanges(): void {
    if (isNullOrUndefined(this.autoFor)) {
      this.renderer.removeAttribute(this.elementRef.nativeElement, 'for');
      return;
    }

    this.renderer.setAttribute(this.elementRef.nativeElement, 'for', this.autoFor.id);
  }
}
