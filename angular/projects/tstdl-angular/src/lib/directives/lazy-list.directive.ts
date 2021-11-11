import type { AfterViewInit } from '@angular/core';
import { ChangeDetectorRef, Directive, ElementRef, Input } from '@angular/core';
import { animationFrame$, observeIntersection, observeResize } from '@tstdl/base/cjs/rxjs';
import { isUndefined, timeout } from '@tstdl/base/cjs/utils';
import type { Observable } from 'rxjs';
import { BehaviorSubject, combineLatest, EMPTY, filter, fromEvent, map, merge, switchMap, take } from 'rxjs';
import { LifecycleUtils } from '../utils';

type MaybeWithNativeElement = HTMLElement & Partial<ElementRef<HTMLElement>>;

@Directive({
  selector: '[tstdlLazyList]',
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
  @Input('tstdlLazyList') source: T[];

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
   * how far to preload items. Percentage of client height
   * @default 20
   */
  @Input('lazyMargin') margin: number;

  /**
   * element to observe for scrolling and load items when at end
   */
  @Input('lazyScrollElement') scrollElement: MaybeWithNativeElement | undefined;

  /**
   * element to observe for intersection and load items when intersecting
   */
  @Input('lazyObserveElement') observeElement: MaybeWithNativeElement | undefined;

  get thresholdReached(): boolean {
    const { scrollHeight, scrollTop, clientHeight } = this.scrollElementSubject.value;

    const threshold = Math.max(1, clientHeight * (this.margin / 100));
    return (scrollHeight - scrollTop - clientHeight) <= threshold;
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
      switchMap((element) => fromEvent(element, 'scroll'))
    );

    const intersect$ = combineLatest([this.scrollElement$, this.observeElement$]).pipe(
      switchMap(([scrollElement, observeElement]) => (isUndefined(observeElement) ? EMPTY : observeIntersection(observeElement, { root: scrollElement, rootMargin: `${this.margin}%` }))),
      filter((entries) => entries[0]!.isIntersecting)
    );

    merge(this.observe('source'), animationFrame$.pipe(take(3)), resize$, scroll$, intersect$).subscribe(() => void this.check());
  }

  async check(): Promise<void> {
    if (this.checking) {
      return;
    }

    while (!this.hasAll && this.thresholdReached) {
      this.addItems();
      await timeout(0);
      void this.check();
    }

    this.checking = false;
  }

  private addItems(): void {
    this.items = this.source.slice(0, Math.max(this.initialSize, this.items.length + this.batchSize));
    this.changeDetector.markForCheck();
  }
}
