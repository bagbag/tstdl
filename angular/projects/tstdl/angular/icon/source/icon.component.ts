import { ChangeDetectionStrategy, Component, HostBinding, Provider, ViewEncapsulation, computed, inject, input } from '@angular/core';

import { IconName } from './icons';

export type IconSize = '0' | 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl';

const sizeMap = {
  '0': 'text-[0]',
  'xs': 'text-xs',
  'sm': 'text-sm',
  'base': 'text-base',
  'lg': 'text-lg',
  'xl': 'text-xl',
  '2xl': 'text-2xl',
  '3xl': 'text-3xl',
  '4xl': 'text-4xl',
  '5xl': 'text-5xl',
  '6xl': 'text-6xl'
};

export abstract class IconComponentConfiguration {
  svgPath?: string;
}

@Component({
  selector: 'tsl-icon',
  standalone: true,
  imports: [],
  templateUrl: './icon.component.html',
  styleUrls: ['./icon.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'tsl-tw'
  }
})
export class IconComponent {
  readonly #configuration = inject(IconComponentConfiguration, { optional: true });

  readonly icon = input.required<IconName>();
  readonly size = input<IconSize | null | undefined>();

  readonly url = computed(() => `${this.#configuration?.svgPath ?? '/assets/bootstrap-icons.svg'}#${this.icon()}`);

  @HostBinding('class')
  get sizeClass(): string {
    return sizeMap[this.size() ?? 'base'];
  }
}

export function provideIconComponentConfiguration(configuration: IconComponentConfiguration): Provider {
  return { provide: IconComponentConfiguration, useValue: configuration };
}
