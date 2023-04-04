import type { OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, Input } from '@angular/core';
import type { ReadonlySignal as PreactReadonlySignal } from '@preact/signals';
import { signal as preactSignal } from '@preact/signals';
import type { EffectRef, Signal } from '@tstdl/angular';
import { effect, isSignal } from '@tstdl/angular';
import type { Record, Type } from '@tstdl/base/types';
import { isFunction, isUndefined } from '@tstdl/base/utils';
import { memoize, memoizeSingle } from '@tstdl/base/utils/function/memoize';
import { fromEntries, hasOwnProperty, objectEntries } from '@tstdl/base/utils/object';
import type { Attributes, FunctionComponent, Component as PreactComponent } from 'preact';
import { createElement, render } from 'preact';

const wrapFunction = memoize(_wrapFunction, { weak: true });
const adaptSignal = memoizeSingle(_adaptSignal, { weak: true });

@Component({
  selector: 'tsl-react',
  standalone: true,
  templateUrl: './react.component.html',
  styleUrls: ['./react.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReactComponent<Properties extends Record = any, State = any> implements OnInit, OnChanges, OnDestroy {
  private readonly elementRef: ElementRef<HTMLElement>;
  private readonly changeDetector: ChangeDetectorRef;

  private effectRef: EffectRef | undefined;

  @Input() component: FunctionComponent<Properties> | Type<PreactComponent<Properties, State>>;
  @Input() properties: Properties | Signal<Properties>;

  /** adapt angular signals to preact signals (readonly) */
  @Input() adaptSignals: boolean;

  /** wrap functions in properties (1st level only) to run change detection afterwards */
  @Input() wrapFunctions: boolean;

  get propertiesValue(): Properties {
    return isSignal(this.properties as any) ? (this.properties as Signal<Properties>)() : this.properties as Properties;
  }

  constructor(elementRef: ElementRef, changeDetector: ChangeDetectorRef) {
    this.elementRef = elementRef;
    this.changeDetector = changeDetector;

    this.adaptSignals = true;
    this.wrapFunctions = true;
  }

  ngOnInit(): void {
    this.render();
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.render();

    if (hasOwnProperty(changes, 'properties')) {
      this.effectRef?.destroy();

      if (isSignal(this.properties as any)) {
        this.effectRef = effect(() => {
          (this.properties as Signal<Properties>)();
          this.render();
        });
      }
    }
  }

  ngOnDestroy(): void {
    this.effectRef?.destroy();
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
          return [key, adaptSignal(value as unknown as Signal<T>)];
        }
        else if (isFunction(value)) {
          return [key, wrapFunction(value, this.changeDetector)];
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

function _adaptSignal<T>(signal: Signal<T>): PreactReadonlySignal<T> {
  const adaptedSignal = preactSignal(signal());
  const adaptedSignalWeakRef = new WeakRef(adaptedSignal);

  const subscription = effect(() => {
    const adaptedSignalRef = adaptedSignalWeakRef.deref();

    if (isUndefined(adaptedSignalRef)) {
      subscription.destroy();
      return;
    }

    adaptedSignalRef.value = signal();
  });

  return adaptedSignal;
}
