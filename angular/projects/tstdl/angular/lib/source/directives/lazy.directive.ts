import { AfterRenderPhase, ChangeDetectorRef, DestroyRef, Directive, ElementRef, Renderer2, TemplateRef, ViewContainerRef, afterNextRender, booleanAttribute, computed, inject, input, type EmbeddedViewRef, type OnDestroy } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { observeIntersection$ } from '@tstdl/base/dom';
import { assertDefinedPass, isDefined, isNotNullOrUndefined, isString, isUndefined } from '@tstdl/base/utils';
import { filter, switchMap, take } from 'rxjs';

/**
 * Lazily render the element when it intersects the viewport (default) or specified {@link root} element.
 * {@link rootMargin} (default 25%) and {@link threshold} (0) can be specified.
 * Uses a div of size {@link intrinsicWidth} and {@link intrinsicHeight} to track visibility using {@link IntersectionObserver}
 */
@Directive({
  selector: '[tslLazy]',
  standalone: true
})
export class LazyDirective implements OnDestroy {
  private readonly destroyRef = inject(DestroyRef);
  private readonly templateRef = inject(TemplateRef<any>);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly elementRef = inject<ElementRef<Node>>(ElementRef);
  private readonly renderer = inject(Renderer2);
  private readonly changeDetector = inject(ChangeDetectorRef);

  private intersectionTracker: HTMLDivElement | undefined;
  private initialTemplateView: EmbeddedViewRef<any> | undefined;

  readonly root = input<Element | Document | null | undefined>(undefined, { alias: 'tslLazyRoot' });
  readonly rootMargin = input<string | undefined>('25%', { alias: 'tslLazyRootMargin' });
  readonly threshold = input<number | number[] | undefined | null, number | `${number}` | number[] | undefined | null>(undefined, { alias: 'tslLazyThreshold', transform: (value) => isString(value) ? Number(value) : value });
  readonly intrinsicWidth = input<string | null | undefined>(undefined, { alias: 'tslLazyIntrinsicWidth' });
  readonly intrinsicHeight = input<string | null | undefined>(undefined, { alias: 'tslLazyIntrinsicHeight' });

  /**
   * Template to render before actual deferred view. Useful for eg. for skeletons.
   * Should be lightweight/fast to render
   */
  readonly initialTemplate = input<TemplateRef<any> | null | undefined>(undefined, { alias: 'tslLazyInitialTemplate' });

  /**
   * Insert intersection tracker
   * true: insert even if `initialTemplate` is provided,
   * false: only insert if no initialTemplate is provided (default)
   */
  readonly tracker = input<boolean, boolean | `${boolean}`>(false, { alias: 'tslLazyTracker', transform: booleanAttribute });

  constructor() {
    const observerConfig$ = toObservable(computed(() => ({ root: this.root(), rootMargin: this.rootMargin(), threshold: this.threshold() ?? undefined })));

    afterNextRender(() => {
      const initialTemplate = this.initialTemplate();
      const intrinsicWidth = this.intrinsicWidth();
      const intrinsicHeight = this.intrinsicHeight();

      if (this.tracker() || isUndefined(initialTemplate)) {
        this.intersectionTracker = this.renderer.createElement('div') as HTMLDivElement;

        if (isDefined(intrinsicWidth)) {
          this.renderer.setStyle(this.intersectionTracker, 'width', intrinsicWidth);
        }

        if (isDefined(intrinsicHeight)) {
          this.renderer.setStyle(this.intersectionTracker, 'height', intrinsicHeight);
        }

        this.renderer.insertBefore(this.elementRef.nativeElement.parentNode, this.intersectionTracker, this.elementRef.nativeElement);
      }

      if (isNotNullOrUndefined(initialTemplate)) {
        this.initialTemplateView = this.viewContainer.createEmbeddedView(initialTemplate);
      }

      this.changeDetector.markForCheck();

      const intersectionElement = assertDefinedPass(this.intersectionTracker ?? this.initialTemplateView?.rootNodes[0] as Element | undefined);

      observerConfig$
        .pipe(
          switchMap((config) => observeIntersection$(intersectionElement, config)),
          filter((intersection) => intersection.isIntersecting),
          take(1),
          takeUntilDestroyed(this.destroyRef)
        )
        .subscribe(() => {
          this.removeTracker();
          this.viewContainer.createEmbeddedView(this.templateRef);
          this.changeDetector.markForCheck();
        });
    }, { phase: AfterRenderPhase.Write });
  }

  ngOnDestroy(): void {
    this.removeTracker();
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
