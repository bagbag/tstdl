import type { AfterViewInit, OnDestroy } from '@angular/core';
import { Directive, ElementRef, Input, Renderer2, TemplateRef, ViewContainerRef } from '@angular/core';
import { observeIntersection } from '@tstdl/base/rxjs';
import { isDefined } from '@tstdl/base/utils';
import { filter, take, takeUntil } from 'rxjs';
import { LifecycleUtils } from '../utils';

/**
 * lazily render the element when it intersects the viewport (default) or specified {@link root} element.
 * {@link rootMargin} (default 10%) and {@link threshold} (0) can be specified.
 * Uses a div of size {@link intrinsicWidth} and {@link intrinsicHeight} to track visibility using {@link IntersectionObserver}
 */
@Directive({
  selector: '[tslLazy]'
})
export class LazyDirective extends LifecycleUtils<LazyDirective> implements AfterViewInit, OnDestroy {
  private readonly templateRef: TemplateRef<any>;
  private readonly viewContainer: ViewContainerRef;
  private readonly elementRef: ElementRef<Node>;
  private readonly renderer: Renderer2;

  private intersectionTracker: HTMLDivElement | undefined;

  @Input() root: Element | Document | null | undefined;
  @Input() rootMargin: string | undefined;
  @Input() threshold: number | number[] | undefined;

  @Input() intrinsicWidth: string;
  @Input() intrinsicHeight: string;

  constructor(templateRef: TemplateRef<any>, viewContainer: ViewContainerRef, elementRef: ElementRef<Node>, renderer: Renderer2) {
    super();

    this.templateRef = templateRef;
    this.viewContainer = viewContainer;
    this.elementRef = elementRef;
    this.renderer = renderer;

    this.rootMargin = '10%';
  }

  override ngAfterViewInit(): void {
    this.intersectionTracker = this.renderer.createElement('div') as HTMLDivElement;

    if (isDefined(this.intrinsicWidth)) {
      this.renderer.setStyle(this.intersectionTracker, 'width', this.intrinsicWidth);
    }

    if (isDefined(this.intrinsicHeight)) {
      this.renderer.setStyle(this.intersectionTracker, 'width', this.intrinsicHeight);
    }

    this.renderer.insertBefore(this.elementRef.nativeElement.parentNode, this.intersectionTracker, this.elementRef.nativeElement);

    observeIntersection(this.intersectionTracker, { root: this.root, rootMargin: this.rootMargin, threshold: this.threshold })
      .pipe(
        filter((intersections) => intersections.some((intersection) => intersection.isIntersecting)),
        take(1),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.removeTracker();
        this.viewContainer.createEmbeddedView(this.templateRef);
      });

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
  }
}
