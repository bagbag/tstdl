import type { EffectRef, OnChanges, OnDestroy, OnInit, Signal, SimpleChanges } from '@angular/core';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, Injector, Input, effect, inject, isSignal } from '@angular/core';
import type { ReadonlySignal as PreactReadonlySignal } from '@preact/signals';
import { signal as preactSignal } from '@preact/signals';
import type { Record, Type } from '@tstdl/base/types';
import { isFunction, isUndefined } from '@tstdl/base/utils';
import { memoizeSingle } from '@tstdl/base/utils/function/memoize';
import { fromEntries, hasOwnProperty, objectEntries } from '@tstdl/base/utils/object';
import type { Attributes, FunctionComponent, Component as PreactComponent } from 'preact';
import { createElement, render } from 'preact';

@Component({
  selector: 'tsl-react',
  standalone: true,
  templateUrl: './react.component.html',
  styleUrls: ['./react.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReactComponent<Properties extends Record = any, State = any> implements OnInit, OnChanges, OnDestroy {
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly injector = inject(Injector);

  private readonly adaptSignal = memoizeSingle(<T>(source: Signal<T>) => _adaptSignal(source, this.injector), { weak: true });
  private readonly wrapFunction = memoizeSingle(<T extends (...args: any[]) => any>(fn: T) => _wrapFunction(fn, this.changeDetector), { weak: true });

  private propertiesEffectRef: EffectRef | undefined;

  @Input() component: FunctionComponent<Properties> | Type<PreactComponent<Properties, State>>;
  @Input() properties: Properties | Signal<Properties>;

  /** adapt angular signals to preact signals (readonly) */
  @Input() adaptSignals = true;

  /** wrap functions in properties (1st level only) to run change detection afterwards */
  @Input() wrapFunctions = true;

  get propertiesValue(): Properties {
    return isSignal(this.properties as any) ? (this.properties as Signal<Properties>)() : this.properties as Properties;
  }

  ngOnInit(): void {
    this.render();
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.render();

    if (hasOwnProperty(changes, 'properties')) {
      this.propertiesEffectRef?.destroy();

      if (isSignal(this.properties as any)) {
        this.propertiesEffectRef = effect(() => {
          (this.properties as Signal<Properties>)();
          this.render();
        }, { injector: this.injector });
      }
    }
  }

  ngOnDestroy(): void {
    this.propertiesEffectRef?.destroy();
    render(null, this.elementRef.nativeElement);
  }

  render(): void {
    const properties = this.prepareProperties(this.propertiesValue);
    const element = createElement<Properties>(this.component, properties);
    render(element, this.elementRef.nativeElement);
  }

  private prepareProperties<T extends Record>(properties: T): Properties & Attributes {
    if (!this.adaptSignals && !this.wrapFunctions) {
      return properties;
    }

    const entries = objectEntries(properties)
      .map(([key, value]) => {
        if (isSignal(value)) {
          return [key, this.adaptSignal(value as unknown as Signal<T>)];
        }
        else if (isFunction(value)) {
          return [key, this.wrapFunction(value)];
        }

        return [key, value];
      });

    return fromEntries(entries);
  }
}

function _wrapFunction<T extends (...args: any[]) => any>(fn: T, changeDetector: ChangeDetectorRef): T {
  return ((...args: Parameters<T>): ReturnType<T> => {
    try {
      return fn(...args); // eslint-disable-line @typescript-eslint/no-unsafe-return
    }
    finally {
      changeDetector.markForCheck();
    }
  }) as T;
}

function _adaptSignal<T>(source: Signal<T>, injector: Injector): PreactReadonlySignal<T> {
  const adaptedSignal = preactSignal(source());
  const adaptedSignalWeakRef = new WeakRef(adaptedSignal);

  const subscription = effect(() => {
    const adaptedSignalRef = adaptedSignalWeakRef.deref();

    if (isUndefined(adaptedSignalRef)) {
      subscription.destroy();
      return;
    }

    adaptedSignalRef.value = source();
  }, { injector });

  return adaptedSignal;
}
