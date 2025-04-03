import { ChangeDetectionStrategy, Component, ElementRef, ViewEncapsulation, booleanAttribute, computed, inject, input } from '@angular/core';
import type { InputAutocomplete, InputMode, InputType } from '@tstdl/base/web-types';

@Component({
  selector: 'input[tslInput]',
  imports: [],
  templateUrl: './input.component.html',
  styleUrl: './input.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    'class': 'tsl-tw',
    '[class]': 'classes()',
    '[attr.disabled]': 'this.disabled() ? true : null',
    '[attr.type]': 'this.type()',
    '[attr.inputmode]': 'this.inputmode()',
    '[attr.autocomplete]': 'this.autocomplete()',
  }
})
export class InputComponent {
  // readonly #control = inject(NgControl, { optional: true });
  readonly #elementRef = inject<ElementRef<HTMLInputElement>>(ElementRef);

  readonly disabled = input<boolean, boolean | null | `${boolean}` | undefined>(false, { transform: booleanAttribute });
  readonly type = input<InputType>('text');
  readonly inputmode = input<InputMode | null>(null);
  readonly autocomplete = input<InputAutocomplete | null>(null);

  readonly classes = computed(() => {
    /*
    const stateClasses = (isNullOrUndefined(this.#control) || (this.#control.touched != true))
      ? textInputNeutralClasses
      : (this.#control.valid == true) ? textInputValidClasses
        : (this.#control.invalid == true) ? textInputInvalidClasses
          : textInputNeutralClasses;
          */

    return (this.type() == 'checkbox')
      ? ['input-checkbox']
      : ['input-text'];
  });

  get id(): string {
    return this.#elementRef.nativeElement.id;
  }

  set id(id: string) {
    this.#elementRef.nativeElement.id = id;
  }
}
