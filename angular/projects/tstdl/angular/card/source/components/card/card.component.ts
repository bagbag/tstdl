import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, contentChildren, input } from '@angular/core';
import { TstdlColoredProgressbarComponent, TstdlIndeterminateProgressBarComponent, fadeInOutAnimation } from '@tstdl/angular';
import type { Record } from '@tstdl/base/types';
import { CardActionDirective, CardBodyDirective, CardFooterDirective, CardHeaderDirective, CardPostHeaderDirective, CardPreHeaderDirective, CardSubHeaderDirective } from '../../directives';

@Component({
  selector: 'tsl-card, [tslCard]',
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss'],
  imports: [NgClass, TstdlColoredProgressbarComponent, TstdlIndeterminateProgressBarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    fadeInOutAnimation({ duration: 100 })
  ],
  host: {
    class: 'tsl-tw relative flex flex-col gap-4 rounded-xl shadow-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 outline outline-1 outline-neutral-600/10 dark:outline-neutral-100/10 overflow-hidden',
    '[class.py-5]': 'padding()',
    '[class.px-6]': 'padding()'
  }
})
export class CardComponent {
  readonly preHeaders = contentChildren(CardPreHeaderDirective);
  readonly headers = contentChildren(CardHeaderDirective);
  readonly subHeaders = contentChildren(CardSubHeaderDirective);
  readonly postHeaders = contentChildren(CardPostHeaderDirective);
  readonly bodies = contentChildren(CardBodyDirective);
  readonly footers = contentChildren(CardFooterDirective);
  readonly actions = contentChildren(CardActionDirective);

  readonly progress = input<number>();
  readonly headerSeparator = input<boolean>(true);
  readonly footerSeparator = input<boolean>(true);
  readonly padding = input<boolean>(true);
  readonly loading = input<boolean>(false);
  readonly footerBackground = input<boolean>(true);
  readonly headerContainerClass = input<string | string[] | Set<string> | Record<string> | null | undefined>();
  readonly headerOuterContainerClass = input<string | string[] | Set<string> | Record<string> | null | undefined>();

  readonly hasHeader = computed(() => (this.headers().length + this.subHeaders().length + this.preHeaders().length + this.postHeaders().length) > 0);
  readonly hasBody = computed(() => this.bodies().length > 0);
  readonly hasFooter = computed(() => (this.footers().length + this.actions().length) > 0);
  readonly hasAction = computed(() => this.actions().length > 0);
  readonly showHeaderSeparator = computed(() => this.headerSeparator() && this.hasHeader() && this.hasBody());
  readonly showFooterSeparator = computed(() => (this.progress() == undefined) && this.footerSeparator() && (this.hasHeader() || this.hasBody()));
}
