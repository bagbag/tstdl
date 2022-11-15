import type { NgForOfContext } from '@angular/common';
import { NgForOf } from '@angular/common';
import type { AfterViewInit, ElementRef } from '@angular/core';
import { ChangeDetectorRef, Directive, Input, IterableDiffers, TemplateRef, ViewContainerRef } from '@angular/core';
import { observeIntersection, observeResize } from '@tstdl/base/rxjs';
import { isDefined, isUndefined, timeout } from '@tstdl/base/utils';
import type { Observable } from 'rxjs';
import { BehaviorSubject, combineLatest, EMPTY, fromEvent, map, merge, switchMap, take } from 'rxjs';
import { LifecycleUtils } from '../utils/lifecycle';

type ElementOrElementRef = Element | ElementRef<Element>;

export type LazyForContext<T, U extends Iterable<U>> = {
  $implicit: T,
  source: U,
  index: number,
  count: number,
  get first(): boolean,
  get last(): boolean,
  get even(): boolean,
  get odd(): boolean
};

@Directive({
  selector: '[tslLazyFor]'
})
export class LazyForDirective<T, U extends Iterable<T>> extends LifecycleUtils<LazyForDirective<T, U>> implements AfterViewInit {
  private readonly changeDetector: ChangeDetectorRef;
  private readonly scrollElementSubject: BehaviorSubject<Element | undefined>;

  private readonly scrollElement$: Observable<Element | undefined>;
  private readonly observeElement$: Observable<Element | undefined>;
  private readonly ngFor: NgForOf<T, U>;

  private checking: boolean = false;

  items: T[];

  /**
   * items to lazily append to {@link items}
   */
  @Input('tslLazyList') source: T[];

  /**
   * how many items to add at the first tick
   * @default 1
   */
  @Input('lazyInitialSize') initialSize: number;

  /**
   * how many items to add at once per tick
   * @default 1
   */
  @Input('lazyBatchSize') batchSize: number;

  /**
   * how far to preload items. Percentage of scroll elements client height
   * @default 50
   */
  @Input('lazyMargin') margin: number;

  /**
   * element to observe for scrolling and load items when at end
   */
  @Input('lazyScrollElement') scrollElement: ElementOrElementRef | undefined;

  /**
   * element to observe for intersection with the scroll element to trigger at tick
   */
  @Input('lazyObserveElement') observeElement: ElementOrElementRef | undefined;

  get thresholdReached(): boolean {
    if (isUndefined(this.scrollElementSubject.value)) {
      return false;
    }

    const { scrollHeight, scrollTop, clientHeight } = this.scrollElementSubject.value;
    const threshold = Math.max(1, clientHeight * (this.margin / 100));

    return (clientHeight > 0) && ((scrollHeight - scrollTop - clientHeight) <= threshold);
  }

  get hasAll(): boolean {
    return this.items.length == this.source.length;
  }

  constructor(viewContainerRef: ViewContainerRef, template: TemplateRef<NgForOfContext<T, U>>, differs: IterableDiffers, changeDetector: ChangeDetectorRef) {
    super();

    this.ngFor = new NgForOf(viewContainerRef, template, differs);

    this.changeDetector = changeDetector;
    this.scrollElementSubject = new BehaviorSubject<Element | undefined>(defaultScrollElement);

    this.source = [];
    this.initialSize = 1;
    this.batchSize = 1;
    this.margin = 50;
    this.items = [];

    this.scrollElement$ = this.scrollElementSubject.asObservable();
    this.observeElement$ = this.observe('observeElement').pipe(map((observeElement) => ((observeElement instanceof Element) ? observeElement : observeElement?.nativeElement)));

    this.observe('source').subscribe(() => {
      this.items = this.source.slice(0, Math.max(this.initialSize, this.items.length));
      changeDetector.markForCheck();
    });

    this.observe('scrollElement')
      .pipe(map((scrollElement) => ((scrollElement instanceof Element) ? scrollElement : defaultScrollElement)))
      .subscribe(this.scrollElementSubject);
  }

  override ngAfterViewInit(): void {
    super.ngAfterViewInit();

    const resize$ = this.scrollElement$.pipe(
      switchMap((element) => (isDefined(element) ? observeResize(element) : EMPTY))
    );

    const scroll$ = this.scrollElement$.pipe(
      switchMap((element) => (isDefined(element) ? fromEvent(element, 'scroll', { passive: true } as AddEventListenerOptions) : EMPTY))
    );

    const intersect$ = combineLatest([this.scrollElement$, this.observeElement$, this.observe('margin')]).pipe(
      switchMap(([scrollElement, observeElement, margin]) => (isUndefined(observeElement) ? EMPTY : observeIntersection(observeElement, { root: scrollElement, rootMargin: `${margin}%` }))),
      map((entries) => entries[0]!.isIntersecting)
    );

    this.viewChecked$
      .pipe(
        take(1),
        switchMap(() => combineLatest([intersect$, merge(this.observe('source'), resize$, scroll$)]))
      )
      .subscribe(([intersects]) => void this.check(intersects));
  }

  async check(ignoreThreshold: boolean = false): Promise<void> {
    if (this.checking) {
      return;
    }

    this.checking = true;

    while (!this.hasAll && (ignoreThreshold || this.thresholdReached)) {
      this.items = this.source.slice(0, Math.max(this.initialSize, this.items.length + this.batchSize));
      this.changeDetector.markForCheck();
      await timeout();
    }

    this.checking = false;
  }
}
