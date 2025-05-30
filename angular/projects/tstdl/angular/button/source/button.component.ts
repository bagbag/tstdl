import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, type OnDestroy, type OnInit, ViewEncapsulation, booleanAttribute, computed, effect, inject, input } from '@angular/core';
import { MatRipple } from '@angular/material/core';
import { resolveValueOrProvider } from '@tstdl/base/utils';
import { fromEntries, objectEntries } from '@tstdl/base/utils/object';

import { TstdlButtonConfig } from './config';

export type ButtonDesign = 'flat' | 'outline' | 'icon' | 'icon-outline' | 'none';
export type ButtonSize = 'normal' | 'small';
export type ButtonColor = 'transparent' | 'white' | 'accent' | 'neutral' | 'stone' | 'red' | 'orange' | 'amber' | 'yellow' | 'lime' | 'green' | 'emerald' | 'teal' | 'cyan' | 'sky' | 'blue' | 'indigo' | 'violet' | 'purple' | 'fuchsia' | 'pink' | 'rose';

@Component({
  selector: '[tslButton]',
  imports: [],
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  providers: [MatRipple],
  hostDirectives: [NgClass],
  host: {
    '[attr.disabled]': 'disabledAttribute()'
  }
})
export class ButtonComponent implements OnInit, OnDestroy {
  readonly #ngClass = inject(NgClass);
  readonly #ripple = inject(MatRipple);
  readonly #config = inject(TstdlButtonConfig, { optional: true });
  readonly changeDetector = inject(ChangeDetectorRef);

  readonly design = input<ButtonDesign | null | undefined>(null);
  readonly color = input<ButtonColor | null | undefined>(null);
  readonly size = input<ButtonSize | null | undefined>(null);
  readonly coloredText = input<boolean | null | undefined, boolean | `${boolean}` | null | undefined>(null, { transform: booleanAttribute });
  readonly invertIconPadding = input<boolean, boolean | null | `${boolean}` | undefined>(false, { transform: booleanAttribute });
  readonly disabled = input<boolean, boolean | null | `${boolean}` | '' | undefined>(false, { transform: (value) => (value === '') ? true : booleanAttribute(value) });
  readonly inert = input<boolean, boolean | null | `${boolean}` | '' | undefined>(false, { transform: (value) => (value === '') ? true : booleanAttribute(value) });

  readonly disabledAttribute = computed(() => this.disabled() ? true : null);

  readonly classes = computed(() => {
    const design = this.design() ?? resolveValueOrProvider(this.#config?.default?.design) ?? 'flat';
    const size = this.size() ?? resolveValueOrProvider(this.#config?.default?.size) ?? 'normal';
    const color = this.color() ?? resolveValueOrProvider(this.#config?.default?.color) ?? 'accent';
    const coloredText = this.coloredText() ?? resolveValueOrProvider(this.#config?.default?.coloredText) ?? false;
    const invertIconPadding = this.invertIconPadding();
    const disabled = this.disabled();

    const small = size == 'small';
    const useNoneStyle = design == 'none';
    const useFlatStyle = design == 'flat';
    const useOutlineStyle = (design == 'outline') || (design == 'icon-outline');
    const useIconStyle = (design == 'icon') || (design == 'icon-outline');

    const ngClassEntries = objectEntries({
      [`tsl-button-${color}`]: true,
      'tsl-button-flat': useFlatStyle,
      'tsl-button-outline': useOutlineStyle,
      'tsl-button-icon': useIconStyle,
      'tsl-button-none': useNoneStyle,
      'tsl-button-small': small,
      'tsl-button-colored-text': coloredText,
      'tsl-button-icon-invert-padding': invertIconPadding
    });

    return fromEntries(
      ngClassEntries
        .filter(([, classesEnabled]) => classesEnabled)
        .map(([key, value]) => [disabled ? (key as string).split(' ').filter((k) => !k.includes('hover:')).join(' ') : key, value])
    );
  });

  constructor() {
    effect(() => {
      this.#ngClass.ngClass = this.classes();
      this.changeDetector.markForCheck();
    });

    effect(() => (this.#ripple.disabled = this.disabled()));
  }

  ngOnInit(): void {
    this.#ripple.ngOnInit();
  }

  ngOnDestroy(): void {
    this.#ripple.ngOnDestroy();
  }
}
