import type { AfterViewInit } from '@angular/core';
import { Directive, ElementRef, Input, Renderer2 } from '@angular/core';
import { isDefined, isUndefined } from '@tstdl/base/utils';
import type { AutoIdDirective } from './auto-id.directive';

@Directive({
  selector: 'label, [tslAutoFor]'
})
export class AutoForDirective implements AfterViewInit {
  private readonly elementRef: ElementRef;
  private readonly renderer: Renderer2;

  @Input() autoFor: AutoIdDirective | undefined;

  constructor(elementRef: ElementRef, renderer: Renderer2) {
    this.elementRef = elementRef;
    this.renderer = renderer;
  }

  ngAfterViewInit(): void {
    if (isUndefined(this.autoFor)) {
      return;
    }

    if (isDefined(this.autoFor.id)) {
      this.renderer.setAttribute(this.elementRef.nativeElement, 'for', this.autoFor.id);
    }
  }
}
