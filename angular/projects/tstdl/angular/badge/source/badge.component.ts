import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, type OnDestroy, type OnInit, ViewEncapsulation, booleanAttribute, computed, effect, inject, input } from '@angular/core';
import { MatRipple } from '@angular/material/core';

export const badgeStyles = ['flat', 'outline', 'flat-with-outline'] as const;
export const badgeColors = ['neutral', 'gray', 'red', 'yellow', 'amber', 'green', 'lime', 'blue', 'sky', 'cyan', 'teal', 'emerald', 'indigo', 'purple', 'pink', 'fuchsia', 'rose'] as const;
export const badgeSizes = ['small', 'normal'] as const;
export const badgePills = [true, false] as const;
export const badgeDots = [true, false] as const;
export const badgeSmalls = [true, false] as const;

export type BadgeStyle = (typeof badgeStyles)[number];
export type BadgeColor = (typeof badgeColors)[number];
export type BadgeSize = (typeof badgeSizes)[number];

const flatBackgroundColors: Record<BadgeColor, string> = {
  neutral: 'bg-neutral-300 dark:bg-neutral-500/40',
  gray: 'bg-gray-300 dark:bg-gray-500/40',
  red: 'bg-red-300 dark:bg-red-500/40',
  yellow: 'bg-yellow-300 dark:bg-yellow-500/40',
  amber: 'bg-amber-300 dark:bg-amber-500/40',
  green: 'bg-green-300 dark:bg-green-500/40',
  lime: 'bg-lime-300 dark:bg-lime-500/40',
  blue: 'bg-blue-300 dark:bg-blue-500/40',
  sky: 'bg-sky-300 dark:bg-sky-500/40',
  cyan: 'bg-cyan-300 dark:bg-cyan-500/40',
  teal: 'bg-teal-300 dark:bg-teal-500/40',
  emerald: 'bg-emerald-300 dark:bg-emerald-500/40',
  indigo: 'bg-indigo-300 dark:bg-indigo-500/40',
  purple: 'bg-purple-300 dark:bg-purple-500/40',
  pink: 'bg-pink-300 dark:bg-pink-500/40',
  fuchsia: 'bg-fuchsia-300 dark:bg-fuchsia-500/40',
  rose: 'bg-rose-300 dark:bg-rose-500/40'
};

const flatWithOutlineBackgroundColors: Record<BadgeColor, string> = {
  neutral: 'bg-neutral-100 dark:bg-neutral-400/10',
  gray: 'bg-gray-100 dark:bg-gray-400/10',
  red: 'bg-red-100 dark:bg-red-400/10',
  yellow: 'bg-yellow-100 dark:bg-yellow-400/10',
  amber: 'bg-amber-100 dark:bg-amber-400/10',
  green: 'bg-green-100 dark:bg-green-400/10',
  lime: 'bg-lime-100 dark:bg-lime-400/10',
  blue: 'bg-blue-100 dark:bg-blue-400/10',
  sky: 'bg-sky-100 dark:bg-sky-400/10',
  cyan: 'bg-cyan-100 dark:bg-cyan-400/10',
  teal: 'bg-teal-100 dark:bg-teal-400/10',
  emerald: 'bg-emerald-100 dark:bg-emerald-400/10',
  indigo: 'bg-indigo-100 dark:bg-indigo-400/10',
  purple: 'bg-purple-100 dark:bg-purple-400/10',
  pink: 'bg-pink-100 dark:bg-pink-400/10',
  fuchsia: 'bg-fuchsia-100 dark:bg-fuchsia-400/10',
  rose: 'bg-rose-100 dark:bg-rose-400/10'
};

const flatWithOutlineRingColors: Record<BadgeColor, string> = {
  neutral: 'ring-neutral-500/10 dark:bg-neutral-400/20',
  gray: 'ring-gray-500/10 dark:ring-gray-400/20',
  red: 'ring-red-600/10 dark:ring-red-400/20',
  yellow: 'ring-yellow-600/20 dark:ring-yellow-400/20',
  amber: 'ring-amber-600/20 dark:ring-amber-400/20',
  green: 'ring-green-600/20 dark:ring-green-500/20',
  lime: 'ring-lime-600/20 dark:ring-lime-500/20',
  blue: 'ring-blue-700/10 dark:ring-blue-400/30',
  sky: 'ring-sky-700/10 dark:ring-sky-400/30',
  cyan: 'ring-cyan-700/10 dark:ring-cyan-400/30',
  teal: 'ring-teal-700/10 dark:ring-teal-400/30',
  emerald: 'ring-emerald-700/10 dark:ring-emerald-400/30',
  indigo: 'ring-indigo-700/10 dark:ring-indigo-400/30',
  purple: 'ring-purple-700/10 dark:ring-purple-400/30',
  pink: 'ring-pink-700/10 dark:ring-pink-400/20',
  fuchsia: 'ring-fuchsia-700/10 dark:ring-fuchsia-400/20',
  rose: 'ring-rose-700/10 dark:ring-rose-400/20'
};

const outlineRingColors: Record<BadgeColor, string> = {
  neutral: 'ring-neutral-500/10 dark:bg-neutral-600/20',
  gray: 'ring-gray-500/10 dark:ring-gray-600/20',
  red: 'ring-red-600/10 dark:ring-red-600/20',
  yellow: 'ring-yellow-600/20 dark:ring-yellow-600/20',
  amber: 'ring-amber-600/20 dark:ring-amber-600/20',
  green: 'ring-green-600/20 dark:ring-green-500/20',
  lime: 'ring-lime-600/20 dark:ring-lime-500/20',
  blue: 'ring-blue-700/10 dark:ring-blue-600/30',
  sky: 'ring-sky-700/10 dark:ring-sky-600/30',
  cyan: 'ring-cyan-700/10 dark:ring-cyan-600/30',
  teal: 'ring-teal-700/10 dark:ring-teal-600/30',
  emerald: 'ring-emerald-700/10 dark:ring-emerald-600/30',
  indigo: 'ring-indigo-700/10 dark:ring-indigo-600/30',
  purple: 'ring-purple-700/10 dark:ring-purple-600/30',
  pink: 'ring-pink-700/10 dark:ring-pink-600/20',
  fuchsia: 'ring-fuchsia-700/10 dark:ring-fuchsia-600/20',
  rose: 'ring-rose-700/10 dark:ring-rose-600/20'
};

const flatTextColor: Record<BadgeColor, string> = {
  neutral: 'text-neutral-700 dark:text-neutral-200',
  gray: 'text-gray-700 dark:text-gray-200',
  red: 'text-red-800 dark:text-red-200',
  yellow: 'text-yellow-800 dark:text-yellow-300',
  amber: 'text-amber-800 dark:text-amber-300',
  green: 'text-green-800 dark:text-green-200',
  lime: 'text-lime-800 dark:text-lime-200',
  blue: 'text-blue-800 dark:text-blue-200',
  sky: 'text-sky-800 dark:text-sky-200',
  cyan: 'text-cyan-800 dark:text-cyan-200',
  teal: 'text-teal-800 dark:text-teal-200',
  emerald: 'text-emerald-800 dark:text-emerald-200',
  indigo: 'text-indigo-800 dark:text-indigo-200',
  purple: 'text-purple-800 dark:text-purple-200',
  pink: 'text-pink-800 dark:text-pink-200',
  fuchsia: 'text-fuchsia-800 dark:text-fuchsia-200',
  rose: 'text-rose-800 dark:text-rose-200'
};

const flatWithOutlineTextColor: Record<BadgeColor, string> = {
  neutral: 'text-neutral-600 dark:text-neutral-300',
  gray: 'text-gray-600 dark:text-gray-300',
  red: 'text-red-700 dark:text-red-300',
  yellow: 'text-yellow-800 dark:text-yellow-400',
  amber: 'text-amber-800 dark:text-amber-400',
  green: 'text-green-700 dark:text-green-300',
  lime: 'text-lime-700 dark:text-lime-300',
  blue: 'text-blue-700 dark:text-blue-300',
  sky: 'text-sky-700 dark:text-sky-300',
  cyan: 'text-cyan-700 dark:text-cyan-300',
  teal: 'text-teal-700 dark:text-teal-300',
  emerald: 'text-emerald-700 dark:text-emerald-300',
  indigo: 'text-indigo-700 dark:text-indigo-300',
  purple: 'text-purple-700 dark:text-purple-300',
  pink: 'text-pink-700 dark:text-pink-300',
  fuchsia: 'text-fuchsia-700 dark:text-fuchsia-300',
  rose: 'text-rose-700 dark:text-rose-300'
};

const dotColor: Record<BadgeColor, string> = {
  neutral: 'bg-neutral-500 dark:bg-neutral-500',
  gray: 'bg-gray-500 dark:bg-gray-500',
  red: 'bg-red-500 dark:bg-red-500',
  yellow: 'bg-yellow-500 dark:bg-yellow-600',
  amber: 'bg-amber-500 dark:bg-amber-600',
  green: 'bg-green-500 dark:bg-green-500',
  lime: 'bg-lime-500 dark:bg-lime-500',
  blue: 'bg-blue-500 dark:bg-blue-500',
  sky: 'bg-sky-500 dark:bg-sky-500',
  cyan: 'bg-cyan-500 dark:bg-cyan-500',
  teal: 'bg-teal-500 dark:bg-teal-500',
  emerald: 'bg-emerald-500 dark:bg-emerald-500',
  indigo: 'bg-indigo-500 dark:bg-indigo-500',
  purple: 'bg-purple-500 dark:bg-purple-500',
  pink: 'bg-pink-500 dark:bg-pink-500',
  fuchsia: 'bg-fuchsia-500 dark:bg-fuchsia-500',
  rose: 'bg-rose-500 dark:bg-rose-500'
};

@Component({
  selector: 'tsl-badge',
  imports: [NgClass],
  templateUrl: './badge.component.html',
  styleUrl: './badge.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MatRipple],
  encapsulation: ViewEncapsulation.None,
  host: {
    'class': 'tsl-tw',
    '[class.cursor-pointer]': 'interactive() && !disabled()',
    '[class.opacity-60]': '!active() && !disabled()',
    '[class.opacity-50]': 'disabled()'
  },
  hostDirectives: [NgClass]
})
export class BadgeComponent implements OnInit, OnDestroy {
  readonly #ngClass = inject(NgClass);
  readonly #changeDetector = inject(ChangeDetectorRef);
  readonly #ripple = inject(MatRipple);

  readonly style = input<BadgeStyle>('flat');
  readonly color = input<BadgeColor>('neutral');
  readonly size = input<BadgeSize>('normal');
  readonly rounded = input<boolean, boolean | `${boolean}`>(true, { transform: booleanAttribute });
  readonly pill = input<boolean, boolean | `${boolean}`>(false, { transform: booleanAttribute });
  readonly dot = input<boolean, boolean | `${boolean}`>(false, { transform: booleanAttribute });
  readonly bold = input<boolean, boolean | `${boolean}`>(false, { transform: booleanAttribute });
  readonly interactive = input<boolean, boolean | `${boolean}`>(false, { transform: booleanAttribute });
  readonly active = input<boolean, boolean | `${boolean}`>(true, { transform: booleanAttribute });
  readonly disabled = input<boolean, boolean | `${boolean}`>(false, { transform: booleanAttribute });

  readonly dotColor = dotColor;

  readonly classes = computed(() => {
    const style = this.style();
    const color = this.color();
    const size = this.size();

    const classes = [
      ['ring-2 ring-inset', (style == 'outline') || (style == 'flat-with-outline')],
      [[flatBackgroundColors[color]], style == 'flat'],
      [[flatWithOutlineBackgroundColors[color]], style == 'flat-with-outline'],
      [[outlineRingColors[color]], style == 'outline'],
      [[flatWithOutlineRingColors[color]], style == 'flat-with-outline'],
      [[flatWithOutlineTextColor[color]], style == 'flat-with-outline'],
      [[flatTextColor[color]], style == 'flat'],
      ['text-neutral-800 dark:text-neutral-300', style == 'outline'],
      ['badge-rounded', this.rounded() && !this.pill()],
      ['badge-pill', this.pill()],
      ['badge-bold', this.bold()],
      ['badge-small', size == 'small'],
    ] as const;

    const result = classes.filter(([, condition]) => condition).map(([klasses]) => klasses);
    return result.join(' ');
  });

  constructor() {
    effect(() => {
      this.#ngClass.ngClass = this.classes();
      this.#changeDetector.markForCheck();
    });

    effect(() => (this.#ripple.disabled = (!this.interactive() || this.disabled())));
  }

  ngOnInit(): void {
    this.#ripple.ngOnInit();
  }

  ngOnDestroy(): void {
    this.#ripple.ngOnDestroy();
  }
}
