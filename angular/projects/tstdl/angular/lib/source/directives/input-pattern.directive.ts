import type { OnInit } from '@angular/core';
import { Directive, ElementRef, HostListener, Input, booleanAttribute } from '@angular/core';
import { isRegExp, isString, isUndefined } from '@tstdl/base/utils';

@Directive({
  selector: 'input[tslInputPattern]',
  standalone: true
})
export class InputPatternDirective implements OnInit {
  private readonly element: HTMLInputElement;

  private pattern: RegExp | undefined;

  @Input({ transform: booleanAttribute }) firstMatchOnly = false;

  @Input() // eslint-disable-line accessor-pairs
  set tslInputPattern(pattern: string | RegExp | null | undefined) {
    this.pattern = isRegExp(pattern) ? pattern
      : isString(pattern) ? new RegExp(pattern, 'ug')
        : undefined;
  }

  constructor(elementRef: ElementRef<HTMLInputElement>) {
    this.element = elementRef.nativeElement;
  }

  ngOnInit(): void {
    this.onChange();
  }

  @HostListener('drop')
  @HostListener('input')
  @HostListener('keydown')
  @HostListener('select')
  @HostListener('contextmenu')
  @HostListener('keyup')
  @HostListener('mousedown')
  @HostListener('mouseup')
  onChange(): void {
    if (isUndefined(this.pattern)) {
      return;
    }

    const matches = [...this.element.value.matchAll(this.pattern)];

    this.element.value = this.firstMatchOnly
      ? (matches[0]?.[0] ?? '')
      : matches.map((match) => match[0]).join('');
  }
}
