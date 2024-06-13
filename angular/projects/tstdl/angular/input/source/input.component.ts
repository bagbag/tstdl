import { ChangeDetectionStrategy, Component, ElementRef, ViewEncapsulation, booleanAttribute, computed, inject, input } from '@angular/core';
import { NgControl } from '@angular/forms';
import { isNullOrUndefined } from '@tstdl/base/utils';
import type { InputAutocomplete, InputMode, InputType } from '@tstdl/base/web-types';

const textInputNeutralClasses = [
  'ring-neutral-300',
  'dark:ring-neutral-400',
  'focus:ring-accent-700',
  'dark:focus:ring-accent-400',
  'placeholder:text-neutral-400'
];

const textInputValidClasses = [
  'ring-lime-500',
  'placeholder:text-lime-500'
];

const textInputInvalidClasses = [
  'ring-red-600',
  'placeholder:text-red-600'
];

@Component({
  selector: '[tslInput]',
  standalone: true,
  imports: [],
  templateUrl: './input.component.html',
  styleUrl: './input.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class]': 'classes()',
    '[attr.disabled]': 'this.disabled() ? true : null',
    '[attr.type]': 'this.type()',
    '[attr.inputmode]': 'this.inputmode()',
    '[attr.autocomplete]': 'this.autocomplete()',
  },
})
export class InputComponent {
  readonly #control = inject(NgControl, { optional: true });
  readonly #elementRef = inject<ElementRef<HTMLLabelElement>>(ElementRef);

  readonly disabled = input<boolean, boolean | null | `${boolean}` | undefined>(false, { transform: booleanAttribute });
  readonly type = input<InputType>('text');
  readonly inputmode = input<InputMode | null>(null);
  readonly autocomplete = input<InputAutocomplete | null>(null);

  readonly classes = computed(() => {
    const stateClasses = (isNullOrUndefined(this.#control) || (this.#control.touched != true))
      ? textInputNeutralClasses
      : (this.#control.valid == true) ? textInputValidClasses
        : (this.#control.invalid == true) ? textInputInvalidClasses
          : textInputNeutralClasses;

    return (this.type() == 'checkbox')
      ? ['input-checkbox']
      : ['input-text', ...stateClasses];
  });

  get id(): string {
    return this.#elementRef.nativeElement.id;
  }

  set id(id: string) {
    this.#elementRef.nativeElement.id = id;
  }
}