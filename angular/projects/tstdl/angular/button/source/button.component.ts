import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, ViewEncapsulation, booleanAttribute, computed, effect, inject, input } from '@angular/core';
import { MatRipple } from '@angular/material/core';

export type ButtonStyle = 'flat' | 'outline' | 'icon' | 'icon-outline' | 'none';
export type ButtonSize = 'normal' | 'small';
export type ButtonColor = 'transparent' | 'white' | 'neutral' | 'stone' | 'red' | 'orange' | 'amber' | 'yellow' | 'lime' | 'green' | 'emerald' | 'teal' | 'cyan' | 'sky' | 'blue' | 'indigo' | 'violet' | 'purple' | 'fuchsia' | 'pink' | 'rose';

const flatColorClasses: Record<ButtonColor, string> = {
  transparent: 'bg-transparent hover:bg-neutral-500/10 dark:hover:bg-neutral-200/15',
  white: 'bg-white hover:bg-neutral-200',
  neutral: 'bg-neutral-300 dark:bg-neutral-600 hover:bg-neutral-200 hover:dark:bg-neutral-500/75',
  stone: 'bg-stone-500 dark:bg-stone-600 hover:bg-stone-400 hover:dark:bg-stone-500/75',
  red: 'bg-red-500 dark:bg-red-600 hover:bg-red-400 hover:dark:bg-red-500/75',
  orange: 'bg-orange-500 dark:bg-orange-600 hover:bg-orange-400 hover:dark:bg-orange-500/75',
  amber: 'bg-amber-500 dark:bg-amber-600 hover:bg-amber-400 hover:dark:bg-amber-500/75',
  yellow: 'bg-yellow-500 dark:bg-yellow-600 hover:bg-yellow-400 hover:dark:bg-yellow-500/75',
  lime: 'bg-lime-400 dark:bg-lime-600 hover:bg-lime-300 hover:dark:bg-lime-500/75',
  green: 'bg-green-500 dark:bg-green-600 hover:bg-green-400 hover:dark:bg-green-500/75',
  emerald: 'bg-emerald-500 dark:bg-emerald-600 hover:bg-emerald-400 hover:dark:bg-emerald-500/75',
  teal: 'bg-teal-500 dark:bg-teal-600 hover:bg-teal-400 hover:dark:bg-teal-500/75',
  cyan: 'bg-cyan-500 dark:bg-cyan-600 hover:bg-cyan-400 hover:dark:bg-cyan-500/75',
  sky: 'bg-sky-500 dark:bg-sky-600 hover:bg-sky-400 hover:dark:bg-sky-500/75',
  blue: 'bg-blue-500 dark:bg-blue-600 hover:bg-blue-400 hover:dark:bg-blue-500/75',
  indigo: 'bg-indigo-500 dark:bg-indigo-600 hover:bg-indigo-400 hover:dark:bg-indigo-500/75',
  violet: 'bg-violet-500 dark:bg-violet-600 hover:bg-violet-400 hover:dark:bg-violet-500/75',
  purple: 'bg-purple-500 dark:bg-purple-600 hover:bg-purple-400 hover:dark:bg-purple-500/75',
  fuchsia: 'bg-fuchsia-500 dark:bg-fuchsia-600 hover:bg-fuchsia-400 hover:dark:bg-fuchsia-500/75',
  pink: 'bg-pink-500 dark:bg-pink-600 hover:bg-pink-400 hover:dark:bg-pink-500/75',
  rose: 'bg-rose-500 dark:bg-rose-600 hover:bg-rose-400 hover:dark:bg-rose-500/75',
};

const borderColorClasses: Record<ButtonColor, string> = {
  transparent: '',
  white: 'border-white',
  neutral: 'border-neutral-500 dark:border-neutral-600',
  stone: 'border-stone-500 dark:border-stone-600',
  red: 'border-red-500 dark:border-red-600',
  orange: 'border-orange-500 dark:border-orange-600',
  amber: 'border-amber-500 dark:border-amber-600',
  yellow: 'border-yellow-500 dark:border-yellow-600',
  lime: 'border-lime-500 dark:border-lime-600',
  green: 'border-green-500 dark:border-green-600',
  emerald: 'border-emerald-500 dark:border-emerald-600',
  teal: 'border-teal-500 dark:border-teal-600',
  cyan: 'border-cyan-500 dark:border-cyan-600',
  sky: 'border-sky-500 dark:border-sky-600',
  blue: 'border-blue-500 dark:border-blue-600',
  indigo: 'border-indigo-500 dark:border-indigo-600',
  violet: 'border-violet-500 dark:border-violet-600',
  purple: 'border-purple-500 dark:border-purple-600',
  fuchsia: 'border-fuchsia-500 dark:border-fuchsia-600',
  pink: 'border-pink-500 dark:border-pink-600',
  rose: 'border-rose-500 dark:border-rose-600'
};

const textColorClasses: Record<ButtonColor, string> = {
  transparent: '',
  white: 'text-white',
  neutral: 'text-neutral-600 dark:text-neutral-300',
  stone: 'text-stone-500 dark:text-stone-600',
  red: 'text-red-500 dark:text-red-600',
  orange: 'text-orange-500 dark:text-orange-600',
  amber: 'text-amber-500 dark:text-amber-600',
  yellow: 'text-yellow-500 dark:text-yellow-600',
  lime: 'text-lime-500 dark:text-lime-600',
  green: 'text-green-500 dark:text-green-600',
  emerald: 'text-emerald-500 dark:text-emerald-600',
  teal: 'text-teal-500 dark:text-teal-600',
  cyan: 'text-cyan-500 dark:text-cyan-600',
  sky: 'text-sky-500 dark:text-sky-600',
  blue: 'text-blue-500 dark:text-blue-600',
  indigo: 'text-indigo-500 dark:text-indigo-600',
  violet: 'text-violet-500 dark:text-violet-600',
  purple: 'text-purple-500 dark:text-purple-600',
  fuchsia: 'text-fuchsia-500 dark:text-fuchsia-600',
  pink: 'text-pink-500 dark:text-pink-600',
  rose: 'text-rose-500 dark:text-rose-600'
};

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
    '[attr.disabled]': 'disabledAttribute()',
    '[attr.inert]': '(disabledAttribute() || inert()) ? "true" : null'
  },
  hostDirectives: [NgClass]
})
export class ButtonComponent implements OnInit, OnDestroy {
  readonly #ngClass = inject(NgClass);
  readonly #ripple = inject(MatRipple);
  readonly changeDetector = inject(ChangeDetectorRef);

  readonly style = input<ButtonStyle>('flat');
  readonly color = input<ButtonColor>('lime');
  readonly size = input<ButtonSize>('normal');
  readonly invertIconPadding = input<boolean, boolean | null | `${boolean}` | undefined>(false, { transform: booleanAttribute });
  readonly disabled = input<boolean, boolean | null | `${boolean}` | undefined>(false, { transform: booleanAttribute });
  readonly inert = input<boolean, boolean | null | `${boolean}` | undefined>(false, { transform: booleanAttribute });

  readonly disabledAttribute = computed(() => this.disabled() ? true : null);

  readonly classes = computed(() => {
    const style = this.style();
    const size = this.size();
    const color = this.color();
    const invertIconPadding = this.invertIconPadding();

    const small = size == 'small';
    const useNoneStyle = style == 'none';
    const useFlatStyle = style == 'flat';
    const useOutlineStyle = (style == 'outline') || (style == 'icon-outline');
    const useIconStyle = (style == 'icon') || (style == 'icon-outline');
    const useTextColorStyle = useIconStyle;

    return {
      [flatColorClasses[color]]: useFlatStyle,
      [`border-2 ${borderColorClasses[color]}`]: useOutlineStyle,
      [textColorClasses[color]]: useTextColorStyle,
      'text-neutral-900 dark:text-neutral-200': !useTextColorStyle,
      'text-neutral-800 dark:text-neutral-100': useFlatStyle,
      'rounded-full aspect-square hover:bg-neutral-800/10 hover:dark:bg-neutral-200/10': useIconStyle,
      'rounded-lg': !useIconStyle,
      'px-4 py-1.5': !useIconStyle && !useNoneStyle && !small,
      'px-2 py-1 text-sm': !useIconStyle && !useNoneStyle && small,
      [`p-2.5 ${invertIconPadding ? '-m-2.5' : ''}`]: useIconStyle && !small,
      [`p-1.5 ${invertIconPadding ? '-m-1.5' : ''}`]: useIconStyle && small
    };
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
