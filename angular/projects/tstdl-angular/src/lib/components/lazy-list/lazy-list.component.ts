import type { AfterViewInit } from '@angular/core';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, Input, ViewChild } from '@angular/core';
import { animationFrame$, observeIntersections } from '@tstdl/base/cjs/rxjs';
import { filter, map, switchMap, timer } from 'rxjs';
import { LifecycleUtils } from '../../utils';

export type LazyListMode = 'fast' | 'efficient';

@Component({
  selector: 'app-lazy-list',
  templateUrl: './lazy-list.component.html',
  styleUrls: ['./lazy-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LazyListComponent<T> extends LifecycleUtils<LazyListComponent<T>> implements AfterViewInit {
  private readonly elementRef: ElementRef;
  private readonly changeDetector: ChangeDetectorRef;

  @ViewChild('observer') observerElement: ElementRef<HTMLElement>;

  /**
   * items to lazily append to {@link lazyItems}
   */
  @Input() items: T[];

  /**
   * how many items to add at the first tick
   * @default 1
   */
  @Input() initialSize: number;

  /**
   * how many items to add at once per tick
   * @default 1
   */
  @Input() batchSize: number;

  /**
   * how far to preload items. Accepts same values as CSS margin
   * @default '20%'
   */
  @Input() margin: string;

  /**
   * fast: uses timeout, efficient: uses animation frames
   * @default 'efficient'
   */
  @Input() mode: LazyListMode;

  lazyItems: T[];

  constructor(elementRef: ElementRef, changeDetector: ChangeDetectorRef) {
    super();

    this.elementRef = elementRef;
    this.changeDetector = changeDetector;

    this.items = [];
    this.initialSize = 1;
    this.batchSize = 1;
    this.margin = '20%';
    this.mode = 'efficient';

    this.lazyItems = [];
  }

  override ngAfterViewInit(): void {
    super.ngAfterViewInit();

    this.observe('items').pipe(
      switchMap(() => observeIntersections(this.observerElement.nativeElement, { root: this.elementRef.nativeElement, rootMargin: this.margin })),
      switchMap((entries) => (this.mode == 'fast' ? timer(0, 0) : animationFrame$)
        .pipe(
          map(() => entries[0]!),
          filter((entry) => (this.lazyItems.length < this.items.length) && entry.isIntersecting)
        ))
    )
      .subscribe(() => {
        this.lazyItems = this.items.slice(0, Math.max(this.initialSize, this.lazyItems.length + this.batchSize));
        this.changeDetector.markForCheck();
      });
  }
}
