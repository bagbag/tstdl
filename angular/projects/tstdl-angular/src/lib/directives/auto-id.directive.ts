import type { OnInit } from '@angular/core';
import { Directive, ElementRef, Input, Renderer2 } from '@angular/core';
import { Alphabet, getRandomString } from '@tstdl/base/utils';

@Directive({
  selector: 'input, [tslAutoId]',
  exportAs: 'autoId',
  standalone: true
})
export class AutoIdDirective implements OnInit {
  private readonly elementRef: ElementRef;
  private readonly renderer: Renderer2;

  id: string | undefined;

  @Input() autoId: boolean | 'true' | 'false';

  constructor(elementRef: ElementRef, renderer: Renderer2) {
    this.elementRef = elementRef;
    this.renderer = renderer;

    this.autoId = false;
  }

  ngOnInit(): void {
    if ((this.autoId == true) || (this.autoId == 'true')) {
      this.id = getRandomString(10, Alphabet.LowerCaseNumbers);
      this.renderer.setAttribute(this.elementRef.nativeElement, 'id', this.id);
    }
  }
}
