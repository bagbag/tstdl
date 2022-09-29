import type { AfterViewInit } from '@angular/core';
import { ChangeDetectorRef, Directive, ElementRef, Input } from '@angular/core';
import { observeIntersection, observeResize } from '@tstdl/base/rxjs';
import { isUndefined, timeout } from '@tstdl/base/utils';
import type { Observable } from 'rxjs';
import { BehaviorSubject, combineLatest, EMPTY, filter, fromEvent, map, merge, switchMap, take } from 'rxjs';
import { LifecycleUtils } from '../utils/lifecycle';

type MaybeWithNativeElement = HTMLElement & Partial<ElementRef<HTMLElement>>;

@Directive({
  selector: '[tslLazyList]',
  exportAs: 'lazyList'
})
export class LazyListDirective<T> extends LifecycleUtils<LazyListDirective<T>> implements AfterViewInit {
  private readonly changeDetector: ChangeDetectorRef;
  private readonly scrollElementSubject: BehaviorSubject<HTMLElement>;

  private checking: boolean = false;
  private readonly scrollElement$: Observable<HTMLElement>;
  private readonly observeElement$: Observable<HTMLElement | undefined>;

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
   * @default 20
   */
  @Input('lazyMargin') margin: number;

  /**
   * element to observe for scrolling and load items when at end
   */
  @Input('lazyScrollElement') scrollElement: MaybeWithNativeElement | undefined;

  /**
   * element to observe for intersection with the scroll element to trigger at tick
   */
  @Input('lazyObserveElement') observeElement: MaybeWithNativeElement | undefined;

  get thresholdReached(): boolean {
    const { scrollHeight, scrollTop, clientHeight } = this.scrollElementSubject.value;
    const threshold = Math.max(1, clientHeight * (this.margin / 100));

    return (clientHeight > 0) && ((scrollHeight - scrollTop - clientHeight) <= threshold);
  }

  get hasAll(): boolean {
    return this.items.length == this.source.length;
  }

  constructor(elementRef: ElementRef<HTMLElement>, changeDetector: ChangeDetectorRef) {
    super();

    this.changeDetector = changeDetector;
    this.scrollElementSubject = new BehaviorSubject<HTMLElement>(elementRef.nativeElement);

    this.source = [];
    this.initialSize = 1;
    this.batchSize = 1;
    this.margin = 25;
    this.items = [];

    this.scrollElement$ = this.scrollElementSubject.asObservable();
    this.observeElement$ = this.observe('observeElement').pipe(map((observeElement) => observeElement?.nativeElement ?? observeElement));

    this.observe('source').subscribe(() => {
      this.items = this.source.slice(0, Math.max(this.initialSize, this.items.length));
      changeDetector.markForCheck();
    });

    this.observe('scrollElement')
      .pipe(map((scrollElement) => scrollElement?.nativeElement ?? scrollElement ?? elementRef.nativeElement))
      .subscribe(this.scrollElementSubject);
  }

  override ngAfterViewInit(): void {
    super.ngAfterViewInit();

    const resize$ = this.scrollElement$.pipe(
      switchMap((element) => observeResize(element))
    );

    const scroll$ = this.scrollElement$.pipe(
      switchMap((element) => fromEvent(element, 'scroll', { passive: true } as AddEventListenerOptions))
    );

    const intersect$ = combineLatest([this.scrollElement$, this.observeElement$, this.observe('margin')]).pipe(
      switchMap(([scrollElement, observeElement, margin]) => (isUndefined(observeElement) ? EMPTY : observeIntersection(observeElement, { root: scrollElement, rootMargin: `${margin}%` }))),
      filter((entries) => entries[0]!.isIntersecting)
    );

    this.viewChecked$
      .pipe(
        take(1),
        switchMap(() => merge(this.observe('source'), resize$, scroll$, intersect$))
      )
      .subscribe(() => void this.check());
  }

  async check(): Promise<void> {
    if (this.checking) {
      return;
    }

    this.checking = true;

    while (!this.hasAll && this.thresholdReached) {
      this.items = this.source.slice(0, Math.max(this.initialSize, this.items.length + this.batchSize));
      this.changeDetector.markForCheck();
      await timeout();
    }

    this.checking = false;
  }
}
