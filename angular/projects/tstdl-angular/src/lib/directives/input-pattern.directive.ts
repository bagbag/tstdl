import { Directive, ElementRef, HostListener, Input } from '@angular/core';
import { isRegExp, isString, isUndefined } from '@tstdl/base/utils';

@Directive({
  selector: 'input[tslInputPattern]'
})
export class InputPatternDirective {
  private readonly element: HTMLInputElement;

  private pattern: RegExp | undefined;
  private currentValue: string;

  @Input() // eslint-disable-line accessor-pairs
  set tslInputPattern(pattern: string | RegExp | null | undefined) {
    this.pattern = isRegExp(pattern) ? pattern
      : isString(pattern) ? new RegExp(pattern, 'u')
        : undefined;
  }

  constructor(elementRef: ElementRef<HTMLInputElement>) {
    this.element = elementRef.nativeElement;
    this.currentValue = this.element.value;
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
    const oldValue = this.currentValue;
    this.currentValue = this.element.value;

    if (isUndefined(this.pattern)) {
      return;
    }

    if (!this.pattern.test(this.currentValue)) {
      this.element.value = oldValue;
      this.currentValue = oldValue;
    }
  }
}
