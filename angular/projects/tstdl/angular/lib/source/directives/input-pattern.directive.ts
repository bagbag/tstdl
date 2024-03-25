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
      ? new RegExp(inputPattern, inputPattern.flags) // Hack/workaround for unknown bug or weird behaviour
      : isString(inputPattern)
        ? new RegExp(inputPattern, 'ug')
        : undefined;
  });

  readonly firstMatchOnly = input(false, { transform: booleanAttribute });
  readonly tslInputPattern = input.required<string | RegExp | null | undefined>();

  lastKnownValue: string;

  ngOnInit(): void {
    this.onChange();
  }

  @HostListener('input')
  @HostListener('change')
  @HostListener('keydown')
  @HostListener('keyup')
  @HostListener('drop')
  @HostListener('paste')
  @HostListener('select')
  @HostListener('contextmenu')
  @HostListener('mousedown')
  @HostListener('mouseup')
  onChange(): void {
    if (this.element.value == this.lastKnownValue) {
      return;
    }

    const pattern = this.pattern();

    if (isUndefined(pattern)) {
      return;
    }

    const matches = [...this.element.value.matchAll(pattern)];

    const result = this.firstMatchOnly()
      ? (matches[0]?.[0] ?? '')
      : matches.map((match) => match[0]).join('');

    this.element.value = result;
    this.lastKnownValue = result;
  }
}
