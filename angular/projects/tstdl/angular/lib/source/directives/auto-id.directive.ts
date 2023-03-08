import { Directive, ElementRef, Renderer2 } from '@angular/core';
import { Alphabet, getRandomString, isNullOrUndefined } from '@tstdl/base/utils';

@Directive({
  selector: 'input, [tslAutoId]',
  exportAs: 'autoId',
  standalone: true
})
export class AutoIdDirective {
  private readonly elementRef: ElementRef<HTMLElement>;
  private readonly renderer: Renderer2;

  get id(): string {
    if (isNullOrUndefined(this.elementRef.nativeElement.id) || (this.elementRef.nativeElement.id.length == 0)) {
      this.elementRef.nativeElement.id = getRandomString(10, Alphabet.LowerCaseNumbers);
      this.renderer.setAttribute(this.elementRef.nativeElement, 'id', this.id);
    }

    return this.elementRef.nativeElement.id;
  }

  constructor(elementRef: ElementRef, renderer: Renderer2) {
    this.elementRef = elementRef;
    this.renderer = renderer;
  }
}
