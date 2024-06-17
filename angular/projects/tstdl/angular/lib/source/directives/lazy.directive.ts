import type { AfterViewInit, EmbeddedViewRef, OnDestroy } from '@angular/core';
import { ChangeDetectorRef, Directive, ElementRef, Input, Renderer2, TemplateRef, ViewContainerRef } from '@angular/core';
import { observeIntersection$ } from '@tstdl/base/dom';
import { assertDefinedPass, isDefined, isUndefined } from '@tstdl/base/utils';
import { combineLatest, filter, switchMap, take, takeUntil } from 'rxjs';
import { LifecycleUtils } from '../utils';

/**
 * lazily render the element when it intersects the viewport (default) or specified {@link root} element.
 * {@link rootMargin} (default 10%) and {@link threshold} (0) can be specified.
 * Uses a div of size {@link intrinsicWidth} and {@link intrinsicHeight} to track visibility using {@link IntersectionObserver}
 */
@Directive({
  selector: '[tslLazy]',
  standalone: true
})
export class LazyDirective extends LifecycleUtils<LazyDirective> implements AfterViewInit, OnDestroy {
  private readonly templateRef: TemplateRef<any>;
  private readonly viewContainer: ViewContainerRef;
  private readonly elementRef: ElementRef<Node>;
  private readonly renderer: Renderer2;
  private readonly changeDetector: ChangeDetectorRef;

  private intersectionTracker: HTMLDivElement | undefined;
  private initialTemplateView: EmbeddedViewRef<any> | undefined;

  /** unused */
  @Input() tslLazy: any;

  @Input() tslLazyRoot: Element | Document | null | undefined;
  @Input() tslLazyRootMargin: string | undefined;
  @Input() tslLazyThreshold: number | number[] | undefined;
  @Input() tslLazyIntrinsicWidth: string;
  @Input() tslLazyIntrinsicHeight: string;

  /**
   * template to render before actual deferred view. Useful for eg. for skeletons.
   * Should be lightweight/fast to render
   */
  @Input() tslLazyInitialTemplate: TemplateRef<any>;

  /**
   * insert intersection tracker
   * true: insert even if `initialTemplate` is provided,
   * false: only insert if no initialTemplate is provided (default)
   */
  @Input() tslLazyTracker: boolean | null | undefined;

  constructor(templateRef: TemplateRef<any>, viewContainer: ViewContainerRef, elementRef: ElementRef<Node>, renderer: Renderer2, changeDetector: ChangeDetectorRef) {
    super();

    this.templateRef = templateRef;
    this.viewContainer = viewContainer;
    this.elementRef = elementRef;
    this.renderer = renderer;
    this.changeDetector = changeDetector;

    this.tslLazyRootMargin = '25%';
    this.tslLazyTracker = false;
  }

  override ngAfterViewInit(): void {
    if ((this.tslLazyTracker == true) || isUndefined(this.tslLazyInitialTemplate)) {
      this.intersectionTracker = this.renderer.createElement('div') as HTMLDivElement;

      if (isDefined(this.tslLazyIntrinsicWidth)) {
        this.renderer.setStyle(this.intersectionTracker, 'width', this.tslLazyIntrinsicWidth);
      }

      if (isDefined(this.tslLazyIntrinsicHeight)) {
        this.renderer.setStyle(this.intersectionTracker, 'height', this.tslLazyIntrinsicHeight);
      }

      this.renderer.insertBefore(this.elementRef.nativeElement.parentNode, this.intersectionTracker, this.elementRef.nativeElement);
    }

    if (isDefined(this.tslLazyInitialTemplate)) {
      this.initialTemplateView = this.viewContainer.createEmbeddedView(this.tslLazyInitialTemplate);
    }

    const intersectionElement = assertDefinedPass(this.intersectionTracker ?? this.initialTemplateView?.rootNodes[0] as Element | undefined);

    combineLatest([this.observe('tslLazyRoot'), this.observe('tslLazyRootMargin'), this.observe('tslLazyThreshold')])
      .pipe(
        switchMap(([root, rootMargin, threshold]) => observeIntersection$(intersectionElement, { root, rootMargin, threshold })),
        filter((intersection) => intersection.isIntersecting),
        take(1),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.removeTracker();
        this.viewContainer.createEmbeddedView(this.templateRef);
        this.changeDetector.markForCheck();
      });

    setTimeout(() => this.changeDetector.markForCheck(), 0);

    super.ngAfterViewInit();
  }

  override ngOnDestroy(): void {
    this.removeTracker();
    super.ngOnDestroy();
  }

  private removeTracker(): void {
    if (isDefined(this.intersectionTracker)) {
      this.renderer.removeChild(this.elementRef.nativeElement.parentNode, this.intersectionTracker);
    }

    if (isDefined(this.initialTemplateView)) {
      this.initialTemplateView.destroy();
    }
  }
}
