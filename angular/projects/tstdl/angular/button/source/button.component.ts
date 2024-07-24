import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, ViewEncapsulation, booleanAttribute, computed, effect, inject, input } from '@angular/core';
import { MatRipple } from '@angular/material/core';
import { resolveValueOrProvider } from '@tstdl/base/utils';
import { fromEntries, objectEntries } from '@tstdl/base/utils/object';

import { TstdlButtonConfig } from './config';

export type ButtonDesign = 'flat' | 'outline' | 'icon' | 'icon-outline' | 'none';
export type ButtonSize = 'normal' | 'small';
export type ButtonColor = 'transparent' | 'white' | 'accent' | 'neutral' | 'stone' | 'red' | 'orange' | 'amber' | 'yellow' | 'lime' | 'green' | 'emerald' | 'teal' | 'cyan' | 'sky' | 'blue' | 'indigo' | 'violet' | 'purple' | 'fuchsia' | 'pink' | 'rose';

const flatColorClasses = {
  transparent: 'bg-transparent hover:bg-neutral-500/10 dark:hover:bg-neutral-200/15',
  white: 'bg-white hover:bg-neutral-200 dark:hover:bg-neutral-200',
  accent: 'bg-accent-400 dark:bg-accent-600 hover:bg-accent-500 dark:hover:bg-accent-500',
  neutral: 'bg-neutral-300 dark:bg-neutral-600 hover:bg-neutral-400 dark:hover:bg-neutral-500',
  stone: 'bg-stone-300 dark:bg-stone-600 hover:bg-stone-400 dark:hover:bg-stone-500',
  red: 'bg-red-400 dark:bg-red-600 hover:bg-red-500 dark:hover:bg-red-500',
  orange: 'bg-orange-400 dark:bg-orange-600 hover:bg-orange-500 dark:hover:bg-orange-500',
  amber: 'bg-amber-400 dark:bg-amber-600 hover:bg-amber-500 dark:hover:bg-amber-500',
  yellow: 'bg-yellow-400 dark:bg-yellow-600 hover:bg-yellow-500 dark:hover:bg-yellow-500',
  lime: 'bg-lime-400 dark:bg-lime-600 hover:bg-lime-500 dark:hover:bg-lime-500',
  green: 'bg-green-400 dark:bg-green-600 hover:bg-green-500 dark:hover:bg-green-500',
  emerald: 'bg-emerald-400 dark:bg-emerald-600 hover:bg-emerald-500 dark:hover:bg-emerald-500',
  teal: 'bg-teal-400 dark:bg-teal-600 hover:bg-teal-500 dark:hover:bg-teal-500',
  cyan: 'bg-cyan-400 dark:bg-cyan-600 hover:bg-cyan-500 dark:hover:bg-cyan-500',
  sky: 'bg-sky-400 dark:bg-sky-600 hover:bg-sky-500 dark:hover:bg-sky-500',
  blue: 'bg-blue-400 dark:bg-blue-600 hover:bg-blue-500 dark:hover:bg-blue-500',
  indigo: 'bg-indigo-400 dark:bg-indigo-600 hover:bg-indigo-500 dark:hover:bg-indigo-500',
  violet: 'bg-violet-400 dark:bg-violet-600 hover:bg-violet-500 dark:hover:bg-violet-500',
  purple: 'bg-purple-400 dark:bg-purple-600 hover:bg-purple-500 dark:hover:bg-purple-500',
  fuchsia: 'bg-fuchsia-400 dark:bg-fuchsia-600 hover:bg-fuchsia-500 dark:hover:bg-fuchsia-500',
  pink: 'bg-pink-400 dark:bg-pink-600 hover:bg-pink-500 dark:hover:bg-pink-500',
  rose: 'bg-rose-400 dark:bg-rose-600 hover:bg-rose-500 dark:hover:bg-rose-500',
} satisfies Record<ButtonColor, string>;

const outlineColorClasses = {
  transparent: 'hover:bg-neutral-500/10 dark:hover:bg-neutral-200/15',
  white: 'ring-1 focus-visible:ring-2 ring-white hover:bg-neutral-200 dark:hover:bg-neutral-200',
  accent: 'ring-1 focus-visible:ring-2 ring-accent-400 hover:bg-accent-400 dark:hover:bg-accent-600',
  neutral: 'ring-1 focus-visible:ring-2 ring-neutral-400 hover:bg-neutral-400 dark:hover:bg-neutral-600',
  stone: 'ring-1 focus-visible:ring-2 ring-stone-400 hover:bg-stone-400 dark:hover:bg-stone-600',
  red: 'ring-1 focus-visible:ring-2 ring-red-400 hover:bg-red-400 dark:hover:bg-red-600',
  orange: 'ring-1 focus-visible:ring-2 ring-orange-400 hover:bg-orange-400 dark:hover:bg-orange-600',
  amber: 'ring-1 focus-visible:ring-2 ring-amber-400 hover:bg-amber-400 dark:hover:bg-amber-600',
  yellow: 'ring-1 focus-visible:ring-2 ring-yellow-400 hover:bg-yellow-400 dark:hover:bg-yellow-600',
  lime: 'ring-1 focus-visible:ring-2 ring-lime-400 hover:bg-lime-400 dark:hover:bg-lime-600',
  green: 'ring-1 focus-visible:ring-2 ring-green-400 hover:bg-green-400 dark:hover:bg-green-600',
  emerald: 'ring-1 focus-visible:ring-2 ring-emerald-400 hover:bg-emerald-400 dark:hover:bg-emerald-600',
  teal: 'ring-1 focus-visible:ring-2 ring-teal-400 hover:bg-teal-400 dark:hover:bg-teal-600',
  cyan: 'ring-1 focus-visible:ring-2 ring-cyan-400 hover:bg-cyan-400 dark:hover:bg-cyan-600',
  sky: 'ring-1 focus-visible:ring-2 ring-sky-400 hover:bg-sky-400 dark:hover:bg-sky-600',
  blue: 'ring-1 focus-visible:ring-2 ring-blue-400 hover:bg-blue-400 dark:hover:bg-blue-600',
  indigo: 'ring-1 focus-visible:ring-2 ring-indigo-400 hover:bg-indigo-400 dark:hover:bg-indigo-600',
  violet: 'ring-1 focus-visible:ring-2 ring-violet-400 hover:bg-violet-400 dark:hover:bg-violet-600',
  purple: 'ring-1 focus-visible:ring-2 ring-purple-400 hover:bg-purple-400 dark:hover:bg-purple-600',
  fuchsia: 'ring-1 focus-visible:ring-2 ring-fuchsia-400 hover:bg-fuchsia-400 dark:hover:bg-fuchsia-600',
  pink: 'ring-1 focus-visible:ring-2 ring-pink-400 hover:bg-pink-400 dark:hover:bg-pink-600',
  rose: 'ring-1 focus-visible:ring-2 ring-rose-400 hover:bg-rose-400 dark:hover:bg-rose-600',
} satisfies Record<ButtonColor, string>;

const flatTextColorClasses = {
  transparent: '',
  white: 'text-neutral-700',
  accent: 'text-accent-900 dark:text-accent-100',
  neutral: 'text-neutral-800 dark:text-neutral-200',
  stone: 'text-stone-800 dark:text-stone-200',
  red: 'text-red-900 dark:text-red-100',
  orange: 'text-orange-900 dark:text-orange-100',
  amber: 'text-amber-900 dark:text-amber-100',
  yellow: 'text-yellow-900 dark:text-yellow-100',
  lime: 'text-lime-900 dark:text-lime-100',
  green: 'text-green-900 dark:text-green-100',
  emerald: 'text-emerald-900 dark:text-emerald-100',
  teal: 'text-teal-900 dark:text-teal-100',
  cyan: 'text-cyan-900 dark:text-cyan-100',
  sky: 'text-sky-900 dark:text-sky-100',
  blue: 'text-blue-900 dark:text-blue-100',
  indigo: 'text-indigo-900 dark:text-indigo-100',
  violet: 'text-violet-900 dark:text-violet-100',
  purple: 'text-purple-900 dark:text-purple-100',
  fuchsia: 'text-fuchsia-900 dark:text-fuchsia-100',
  pink: 'text-pink-900 dark:text-pink-100',
  rose: 'text-rose-900 dark:text-rose-100'
} satisfies Record<ButtonColor, string>;

const outlineTextColorClasses = {
  transparent: '',
  white: 'text-neutral-800 dark:text-white hover:text-neutral-700 dark:hover:text-neutral-700',
  accent: 'text-accent-600 dark:text-accent-600 hover:text-accent-900 dark:hover:text-accent-100',
  neutral: 'text-neutral-800 dark:text-neutral-200 hover:text-neutral-800 dark:hover:text-neutral-200',
  stone: 'text-stone-800 dark:text-stone-200 hover:text-stone-800 dark:hover:text-stone-200',
  red: 'text-red-600 dark:text-red-600 hover:text-red-900 dark:hover:text-red-100',
  orange: 'text-orange-600 dark:text-orange-600 hover:text-orange-900 dark:hover:text-orange-100',
  amber: 'text-amber-600 dark:text-amber-600 hover:text-amber-900 dark:hover:text-amber-100',
  yellow: 'text-yellow-600 dark:text-yellow-600 hover:text-yellow-900 dark:hover:text-yellow-100',
  lime: 'text-lime-600 dark:text-lime-600 hover:text-lime-900 dark:hover:text-lime-100',
  green: 'text-green-600 dark:text-green-600 hover:text-green-900 dark:hover:text-green-100',
  emerald: 'text-emerald-600 dark:text-emerald-600 hover:text-emerald-900 dark:hover:text-emerald-100',
  teal: 'text-teal-600 dark:text-teal-600 hover:text-teal-900 dark:hover:text-teal-100',
  cyan: 'text-cyan-600 dark:text-cyan-600 hover:text-cyan-900 dark:hover:text-cyan-100',
  sky: 'text-sky-600 dark:text-sky-600 hover:text-sky-900 dark:hover:text-sky-100',
  blue: 'text-blue-600 dark:text-blue-600 hover:text-blue-900 dark:hover:text-blue-100',
  indigo: 'text-indigo-600 dark:text-indigo-600 hover:text-indigo-900 dark:hover:text-indigo-100',
  violet: 'text-violet-600 dark:text-violet-600 hover:text-violet-900 dark:hover:text-violet-100',
  purple: 'text-purple-600 dark:text-purple-600 hover:text-purple-900 dark:hover:text-purple-100',
  fuchsia: 'text-fuchsia-600 dark:text-fuchsia-600 hover:text-fuchsia-900 dark:hover:text-fuchsia-100',
  pink: 'text-pink-600 dark:text-pink-600 hover:text-pink-900 dark:hover:text-pink-100',
  rose: 'text-rose-600 dark:text-rose-600 hover:text-rose-900 dark:hover:text-rose-100',
} satisfies Record<ButtonColor, string>;

@Component({
  selector: '[tslButton]',
  standalone: true,
  imports: [],
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  providers: [MatRipple],
  host: {
    'class': 'tsl-tw',
    '[attr.disabled]': 'disabledAttribute()'
  },
  hostDirectives: [NgClass]
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
  readonly disabled = input<boolean, boolean | null | `${boolean}` | undefined>(false, { transform: booleanAttribute });
  readonly inert = input<boolean, boolean | null | `${boolean}` | undefined>(false, { transform: booleanAttribute });

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
      [`${flatColorClasses[color]} ${coloredText ? flatTextColorClasses[color] : ''}`]: useFlatStyle,
      [`bg-neutral-400/10 ring-inset ${outlineColorClasses[color]} ${coloredText ? outlineTextColorClasses[color] : ''}`]: useOutlineStyle,
      'rounded-full aspect-square hover:bg-neutral-800/10 dark:hover:bg-neutral-200/10': useIconStyle,
      'rounded-lg': !useIconStyle,
      'px-4 py-1.5': !useIconStyle && !useNoneStyle && !small,
      'px-2 py-1 text-sm': !useIconStyle && !useNoneStyle && small,
      [`p-2.5 ${invertIconPadding ? '-m-2.5' : ''}`]: useIconStyle && !small,
      [`p-1.5 ${invertIconPadding ? '-m-1.5' : ''}`]: useIconStyle && small
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
