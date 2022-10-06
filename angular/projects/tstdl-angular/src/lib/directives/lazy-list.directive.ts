import type { AfterViewInit } from '@angular/core';
import { ChangeDetectorRef, Directive, ElementRef, Input } from '@angular/core';
import { observeIntersection, observeResize } from '@tstdl/base/rxjs';
import { isDefined, isUndefined, timeout } from '@tstdl/base/utils';
import type { Observable } from 'rxjs';
import { BehaviorSubject, combineLatest, EMPTY, filter, fromEvent, interval, map, merge, shareReplay, switchMap, take, takeUntil } from 'rxjs';
import { LifecycleUtils } from '../utils/lifecycle';

type ElementOrElementRef = Element | ElementRef<Element>;

@Directive({
  selector: '[tslLazyList]',
  exportAs: 'lazyList'
})
export class LazyListDirective<T> extends LifecycleUtils<LazyListDirective<T>> implements AfterViewInit {
  private readonly changeDetector: ChangeDetectorRef;
  private readonly scrollElementSubject: BehaviorSubject<Element | undefined>;

  private checking: boolean = false;
  private readonly scrollElement$: Observable<Element | undefined>;
  private readonly observeElement$: Observable<Element | undefined>;

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

  constructor(elementRef: ElementRef<Node>, changeDetector: ChangeDetectorRef) {
    super();

    const defaultScrollElement = (elementRef.nativeElement instanceof Element) ? elementRef.nativeElement : undefined;

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
      switchMap((element) => (isDefined(element) ? observeResize(element) : EMPTY)),
      takeUntil(this.destroy$)
    );

    const scroll$ = this.scrollElement$.pipe(
      switchMap((element) => (isDefined(element) ? fromEvent(element, 'scroll', { passive: true } as AddEventListenerOptions) : EMPTY)),
      takeUntil(this.destroy$)
    );

    const intersects$ = combineLatest([this.scrollElement$, this.observeElement$, this.observe('margin')]).pipe(
      switchMap(([scrollElement, observeElement, margin]) => (isUndefined(observeElement) ? EMPTY : observeIntersection(observeElement, { root: scrollElement, rootMargin: `${margin}%` }))),
      takeUntil(this.destroy$),
      map((entries) => entries[0]!.isIntersecting),
      shareReplay(1)
    );

    const intersect$ = intersects$.pipe(filter((intersects) => intersects));

    this.viewChecked$
      .pipe(
        take(1),
        switchMap(() => merge(this.observe('source'), resize$, scroll$, intersect$))
      )
      .subscribe(() => void this.check());

    intersect$.pipe(switchMap((intersects) => (intersects ? interval(10) : EMPTY)))
      .subscribe(() => this.add());
  }

  async check(): Promise<void> {
    if (this.checking) {
      return;
    }

    this.checking = true;

    while (!this.hasAll && this.thresholdReached) {
      this.add();
      await timeout();
    }

    this.checking = false;
  }

  add(): void {
    if (this.hasAll) {
      return;
    }

    this.items = this.source.slice(0, Math.max(this.initialSize, this.items.length + this.batchSize));
    this.changeDetector.markForCheck();
  }
}
