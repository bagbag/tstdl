import type { OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { Directive, ElementRef, EventEmitter, Input, Output, Renderer2 } from '@angular/core';
import { isDefined, isNull, isNullOrUndefined, isNumber } from '@tstdl/base/utils';
import type { Observable } from 'rxjs';
import { BehaviorSubject } from 'rxjs';
import { filter, mapTo } from 'rxjs/operators';

@Directive({
  selector: '[visibilityObserver]',
  exportAs: 'visibilityObserver'
})
export class VisibilityObserverDirective implements OnDestroy, OnInit, OnChanges {
  private readonly renderer: Renderer2;
  private readonly isVisibleSubject: BehaviorSubject<boolean>;
  private readonly visibilitySubject: BehaviorSubject<number>;

  private observer: IntersectionObserver;

  readonly elementRef: ElementRef<HTMLElement>;
  readonly isVisible$: Observable<boolean>;
  readonly visibility$: Observable<number>;

  @Input('visibilityObserver') dataAttribute: string;
  @Input('visibilityTreshold') treshold: number;
  @Input('visibilityMargin') margin: string;
  @Input('visibilityRoot') root: HTMLElement | number | null | undefined;

  @Output() visible: EventEmitter<ElementRef>;
  @Output() isVisibleChanged: EventEmitter<boolean>;
  @Output() visibilityChanged: EventEmitter<number>;

  get isVisible(): boolean {
    return this.isVisibleSubject.value;
  }

  get visibility(): number {
    return this.visibilitySubject.value;
  }

  constructor(elementRef: ElementRef, renderer: Renderer2) {
    this.elementRef = elementRef;
    this.renderer = renderer;

    this.treshold = 0.05;
    this.margin = '0px';
    this.root = null;
    this.isVisibleSubject = new BehaviorSubject<boolean>(false);
    this.visibilitySubject = new BehaviorSubject<number>(0);

    this.visible = new EventEmitter();
    this.isVisibleChanged = new EventEmitter();
    this.visibilityChanged = new EventEmitter();

    this.isVisible$ = this.isVisibleSubject.asObservable();
    this.visibility$ = this.visibilitySubject.asObservable();

    this.isVisibleSubject.pipe(filter((visible) => visible), mapTo(this.elementRef)).subscribe(this.visible);
    this.isVisible$.subscribe(this.isVisibleChanged);
    this.visibility$.subscribe(this.visibilityChanged);
  }

  ngOnInit(): void {
    this.setupObserver();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ('treshold' in changes || 'margin' in changes || 'parent' in changes) {
      this.setupObserver();
    }
  }

  onObserve(entries: IntersectionObserverEntry[]): void {
    const entry = entries[0]!;

    this.visibilitySubject.next(entry.intersectionRatio);
    this.isVisibleSubject.next(entry.isIntersecting);

    if (isDefined(this.dataAttribute) && this.dataAttribute.length > 0) {
      setTimeout(() => this.renderer.setAttribute(this.elementRef.nativeElement, `data-${this.dataAttribute}`, entry.isIntersecting.toString()), 50);
    }
  }

  ngOnDestroy(): void {
    this.unobserve();

    this.isVisibleSubject.complete();
    this.visibilitySubject.complete();
  }

  private setupObserver(): void {
    if (isDefined(this.observer)) {
      this.unobserve();
    }

    let root: HTMLElement | null = isNullOrUndefined(this.root)
      ? null
      : isNumber(this.root)
        ? this.elementRef.nativeElement
        : this.root;

    if (isNumber(this.root)) {
      for (let i = 0; i < this.root; i++) {
        root = root!.parentElement;

        if (isNull(root)) {
          throw new Error(`parent element ${this.root} levels above not available`);
        }
      }
    }

    this.observer = new IntersectionObserver((entries) => this.onObserve(entries), { threshold: this.treshold, rootMargin: this.margin, root });
    this.observer.observe(this.elementRef.nativeElement);
  }

  private unobserve(): void {
    this.observer.unobserve(this.elementRef.nativeElement);
    this.observer.disconnect();
  }
}
