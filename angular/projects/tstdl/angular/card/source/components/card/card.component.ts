import { CommonModule } from '@angular/common';
import type { AfterViewInit } from '@angular/core';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ContentChildren, Input, QueryList } from '@angular/core';
import { ColoredProgressbarComponent, IndeterminateProgressBarComponent, fadeInOutAnimation } from '@tstdl/angular';
import { Record } from '@tstdl/base/types';
import { merge } from 'rxjs';
import { CardActionDirective, CardBodyDirective, CardFooterDirective, CardHeaderDirective, CardPostHeaderDirective, CardPreHeaderDirective, CardSubHeaderDirective } from '../../directives';

@Component({
  selector: 'tsl-card',
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss'],
  imports: [CommonModule, ColoredProgressbarComponent, IndeterminateProgressBarComponent, CardActionDirective, CardBodyDirective, CardFooterDirective, CardHeaderDirective, CardSubHeaderDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  animations: [
    fadeInOutAnimation({ duration: 100 })
  ],
  host: {
    '[class.tsl-tw]': 'true',
    '[class.relative]': 'true',
    '[class.flex]': 'true',
    '[class.flex-col]': 'true',
    '[class.gap-4]': 'true',
    '[class.py-5]': 'padding',
    '[class.px-6]': 'padding',
    '[class.rounded-xl]': 'true',
    '[class.shadow-lg]': 'true',
    '[class.dark:outline]': 'true',
    '[class.dark:outline-1]': 'true',
    '[class.dark:outline-white/10]': 'true',
    '[class.overflow-hidden]': 'true'
  }
})
export class CardComponent implements AfterViewInit {
  private readonly changeDetector: ChangeDetectorRef;

  @ContentChildren(CardPreHeaderDirective, { read: CardPreHeaderDirective }) preHeaders: QueryList<CardPreHeaderDirective>;
  @ContentChildren(CardHeaderDirective, { read: CardHeaderDirective }) headers: QueryList<CardHeaderDirective>;
  @ContentChildren(CardSubHeaderDirective, { read: CardSubHeaderDirective }) subHeaders: QueryList<CardSubHeaderDirective>;
  @ContentChildren(CardPostHeaderDirective, { read: CardPostHeaderDirective }) postHeaders: QueryList<CardPostHeaderDirective>;
  @ContentChildren(CardBodyDirective, { read: CardBodyDirective }) bodies: QueryList<CardBodyDirective>;
  @ContentChildren(CardFooterDirective, { read: CardFooterDirective }) footers: QueryList<CardFooterDirective>;
  @ContentChildren(CardActionDirective, { read: CardActionDirective }) actions: QueryList<CardActionDirective>;

  @Input() progress: number | undefined;
  @Input() headerSeparator: boolean;
  @Input() footerSeparator: boolean;
  @Input() padding: boolean;
  @Input() loading: boolean;
  @Input() footerBackground: boolean;
  @Input() headerContainerClass: string | string[] | Set<string> | Record<string> | null | undefined;
  @Input() headerOuterContainerClass: string | string[] | Set<string> | Record<string> | null | undefined;

  get hasHeader(): boolean {
    return (this.headers.length + this.subHeaders.length + this.preHeaders.length + this.postHeaders.length) > 0;
  }

  get hasBody(): boolean {
    return this.bodies.length > 0;
  }

  get hasFooter(): boolean {
    return (this.footers.length + this.actions.length) > 0;
  }

  get hasAction(): boolean {
    return this.actions.length > 0;
  }

  get showHeaderSeparator(): boolean {
    return this.headerSeparator && this.hasHeader && this.hasBody;
  }

  get showFooterSeparator(): boolean {
    return (this.progress == undefined) && this.footerSeparator && (this.hasHeader || this.hasBody);
  }

  constructor(changeDetector: ChangeDetectorRef) {
    this.changeDetector = changeDetector;

    this.progress = undefined;
    this.headerSeparator = true;
    this.footerSeparator = true;
    this.footerBackground = true;
    this.padding = true;
    this.loading = false;
  }

  ngAfterViewInit(): void {
    merge(this.preHeaders.changes, this.headers.changes, this.subHeaders.changes, this.postHeaders.changes, this.bodies.changes, this.footers.changes, this.actions.changes)
      .subscribe(() => this.changeDetector.markForCheck());
  }
}