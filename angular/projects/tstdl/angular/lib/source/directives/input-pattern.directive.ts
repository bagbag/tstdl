import { Directive, ElementRef, HostListener, booleanAttribute, computed, inject, input, type OnInit } from '@angular/core';
import { isRegExp, isString, isUndefined } from '@tstdl/base/utils';

@Directive({
  selector: 'input[tslInputPattern]',
  standalone: true
})
export class InputPatternDirective implements OnInit {
  private readonly element = inject<ElementRef<HTMLInputElement>>(ElementRef).nativeElement;

  private readonly pattern = computed(() => {
    const inputPattern = this.tslInputPattern();

    return isRegExp(inputPattern)
      ? inputPattern
      : isString(inputPattern)
        ? new RegExp(inputPattern, 'ug')
        : undefined;
  });

  readonly firstMatchOnly = input(false, { transform: booleanAttribute });
  readonly tslInputPattern = input.required<string | RegExp | null | undefined>();

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
    const pattern = this.pattern();

    if (isUndefined(pattern)) {
      return;
    }

    const matches = [...this.element.value.matchAll(pattern)];

    this.element.value = this.firstMatchOnly()
      ? (matches[0]?.[0] ?? '')
      : matches.map((match) => match[0]).join('');
  }
}
