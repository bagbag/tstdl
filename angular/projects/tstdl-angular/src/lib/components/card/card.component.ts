import { CommonModule } from '@angular/common';
import type { AfterViewInit } from '@angular/core';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ContentChildren, Input, QueryList } from '@angular/core';
import { merge } from 'rxjs';
import { fadeInOutAnimation } from '../../animations/fade-in-out.animation';
import { ColoredProgressbarComponent } from '../colored-progressbar/colored-progressbar.component';
import { IndeterminateProgressBarComponent } from '../indeterminate-progress-bar/indeterminate-progress-bar.component';
import { CardActionDirective } from './card-action.directive';
import { CardBodyDirective } from './card-body.directive';
import { CardFooterDirective } from './card-footer.directive';
import { CardHeaderDirective } from './card-header.directive';
import { CardSubHeaderDirective } from './card-sub-header.directive';

@Component({
  selector: 'tsl-card',
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss'],
  imports: [CommonModule, ColoredProgressbarComponent, IndeterminateProgressBarComponent, CardActionDirective, CardBodyDirective, CardFooterDirective, CardHeaderDirective, CardSubHeaderDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  animations: [
    fadeInOutAnimation(100)
  ],
  host: {
    '[class.tsl-relative]': 'true',
    '[class.tsl-flex]': 'true',
    '[class.tsl-flex-col]': 'true',
    '[class.tsl-gap-4]': 'true',
    '[class.tsl-py-5]': 'true',
    '[class.tsl-px-6]': 'true',
    '[class.tsl-rounded-xl]': 'true',
    '[class.tsl-shadow-lg]': 'true',
    '[class.dark:tsl-ring-1]': 'true',
    '[class.dark:tsl-ring-white/10]': 'true',
    '[class.dark:tsl-ring-inset]': 'true',
    '[class.tsl-bg-bg-secondary]': 'true',
    '[class.tsl-overflow-hidden]': 'true'
  }
})
export class CardComponent implements AfterViewInit {
  private readonly changeDetector: ChangeDetectorRef;

  @ContentChildren(CardHeaderDirective, { read: CardHeaderDirective }) cardHeaders: QueryList<CardHeaderDirective>;
  @ContentChildren(CardSubHeaderDirective, { read: CardSubHeaderDirective }) cardSubHeaders: QueryList<CardSubHeaderDirective>;
  @ContentChildren(CardBodyDirective, { read: CardBodyDirective }) cardBodies: QueryList<CardBodyDirective>;
  @ContentChildren(CardFooterDirective, { read: CardFooterDirective }) cardFooters: QueryList<CardFooterDirective>;
  @ContentChildren(CardActionDirective, { read: CardActionDirective }) cardActions: QueryList<CardActionDirective>;

  @Input() progress: number | undefined;
  @Input() headerSeparator: boolean;
  @Input() footerSeparator: boolean;
  @Input() loading: boolean;
  @Input() noFooterBackground: boolean;

  get hasHeader(): boolean {
    return (this.cardHeaders.length + this.cardSubHeaders.length) > 0;
  }

  get hasBody(): boolean {
    return this.cardBodies.length > 0;
  }

  get hasFooter(): boolean {
    return (this.cardFooters.length + this.cardActions.length) > 0;
  }

  get hasAction(): boolean {
    return this.cardActions.length > 0;
  }

  constructor(changeDetector: ChangeDetectorRef) {
    this.changeDetector = changeDetector;

    this.progress = undefined;
    this.headerSeparator = true;
    this.footerSeparator = true;
    this.loading = false;
    this.noFooterBackground = false;
  }

  ngAfterViewInit(): void {
    merge(this.cardBodies.changes, this.cardSubHeaders.changes, this.cardBodies.changes, this.cardFooters.changes, this.cardActions.changes)
      .subscribe(() => this.changeDetector.markForCheck());
  }
}
