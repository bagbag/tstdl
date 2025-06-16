import { Overlay, OverlayPositionBuilder, OverlayRef, type PositionStrategy } from '@angular/cdk/overlay';
import { ComponentPortal, TemplatePortal } from '@angular/cdk/portal';
import { ComponentRef, Directive, ElementRef, EmbeddedViewRef, Input, type OnDestroy, TemplateRef, ViewContainerRef, inject, isSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { DynamicText } from '@tstdl/base/text';
import type { Type } from '@tstdl/base/types';
import { isDefined, isFunction, isNotNullOrUndefined, isNull, isString } from '@tstdl/base/utils';
import { combineLatest, delay, distinctUntilChanged, fromEvent, isObservable, map, merge, of, startWith, switchMap } from 'rxjs';

import { TooltipComponent } from './tooltip.component';

@Directive({
  selector: '[tslTooltip]'
})
export class TooltipDirective<Component extends Type, Context> implements OnDestroy {
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly overlay = inject(Overlay);
  private readonly overlayPositionBuilder = inject(OverlayPositionBuilder);
  private readonly positionStrategy: PositionStrategy;

  private overlayRef: OverlayRef | undefined;

  @Input('tslTooltip') content: DynamicText | Component | TemplateRef<Context> | ComponentPortal<Component> | TemplatePortal<Context> | null;
  @Input() tooltipContainer = true;
  @Input() tooltipContext: Context | null | undefined;
  @Input() tooltipDelay: number = 500;

  tooltipComponentRef: ComponentRef<Component> | undefined;
  tooltipViewRef: EmbeddedViewRef<Context> | undefined;

  constructor() {
    const showFromMouse$ = merge(
      fromEvent(this.elementRef.nativeElement, 'mouseenter').pipe(map(() => true)),
      fromEvent(this.elementRef.nativeElement, 'mouseleave').pipe(map(() => false)),
    ).pipe(startWith(false));

    const showFromFocus$ = merge(
      fromEvent(this.elementRef.nativeElement, 'focusin').pipe(map(() => true)),
      fromEvent(this.elementRef.nativeElement, 'focusout').pipe(map(() => false)),
    ).pipe(startWith(false));

    combineLatest([showFromMouse$, showFromFocus$])
      .pipe(
        map(([mouse, focus]) => mouse || focus),
        distinctUntilChanged(),
        switchMap((show) => (show ? of(true).pipe(delay(this.tooltipDelay)) : of(false))),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe((show) => (show ? this.show() : this.hide()));

    this.positionStrategy = this.overlayPositionBuilder
      .flexibleConnectedTo(this.elementRef)
      .withPositions([{
        originX: 'center',
        originY: 'top',
        overlayX: 'center',
        overlayY: 'bottom'
      }])
      .withViewportMargin(5)
      .withDefaultOffsetY(-5)
      .withPush(true);
  }

  ngOnDestroy(): void {
    this.hide();
  }

  show(): void {
    if (isNull(this.content)) {
      return;
    }

    this.overlayRef = this.overlay.create({ positionStrategy: this.positionStrategy });

    const templatePortal = (this.content instanceof TemplatePortal)
      ? this.content
      : (this.content instanceof TemplateRef)
        ? new TemplatePortal(this.content, this.viewContainerRef)
        : undefined;

    const componentPortal = (this.content instanceof ComponentPortal)
      ? this.content
      : (isFunction(this.content) && !isSignal(this.content))
        ? new ComponentPortal(this.content, this.viewContainerRef)
        : undefined;

    if (isDefined(templatePortal)) {
      this.tooltipViewRef = this.overlayRef.attach(templatePortal);

      if (isNotNullOrUndefined(this.tooltipContext)) {
        this.tooltipViewRef.context = this.tooltipContext;
      }
    }
    else if (isDefined(componentPortal)) {
      this.tooltipComponentRef = this.overlayRef.attach(this.content);
    }
    else {
      const tooltipComponentPortal = new ComponentPortal(TooltipComponent);
      const tooltipComponentRef = this.overlayRef.attach(tooltipComponentPortal);

      if (isString(this.content) || isSignal(this.content) || isObservable(this.content)) {
        tooltipComponentRef.instance.text.set(this.content as DynamicText);
      }
    }
  }

  hide(): void {
    this.overlayRef?.dispose();
    this.tooltipViewRef = undefined;
    this.tooltipComponentRef = undefined;
  }
}
