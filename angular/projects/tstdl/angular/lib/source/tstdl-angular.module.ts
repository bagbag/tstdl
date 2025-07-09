import type { CreateEffectOptions, Signal } from '@angular/core';
import { DOCUMENT as ANGULAR_DOCUMENT, DestroyRef, type EnvironmentProviders, Injector, NgModule, type Provider, computed, effect, importProvidersFrom, inject, isDevMode, isSignal, makeEnvironmentProviders, provideAppInitializer, runInInjectionContext, signal, untracked } from '@angular/core';
import type { ToObservableOptions } from '@angular/core/rxjs-interop';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { configureTstdl } from '@tstdl/base';
import { HttpClientAdapter } from '@tstdl/base/http';
import { Injector as TstdlInjector, isInInjectionContext, isInInjectionContext as isInTstdlInjectionContext, runInInjectionContext as runInTstdlInjectionContext } from '@tstdl/base/injector';
import { type CreateEffectOptions as TstdlCreateEffectOptions, type ToObservableOptions as TstdlToObservableOptions, type ToSignalOptions as TstdlToSignalOptions, configureSignals } from '@tstdl/base/signals';
import { DOCUMENT } from '@tstdl/base/tokens';
import { Observable, type Subscribable } from 'rxjs';
import type { Tagged } from 'type-fest';

import { TstdlColoredProgressbarComponent, TstdlIndeterminateProgressBarComponent, TstdlSkeletonComponent } from './components';
import { AutoForDirective, AutoIdDirective, InputPatternDirective, LazyDirective, LazyListDirective, LetDirective, RepeatDirective, VisibilityObserverDirective } from './directives';
import { configureAngularHttpClientAdapter } from './http';
import { DateTimeLocalePipe, DateTimePipe, DateTimeToDatePipe, DecyclePipe, DurationPipe, DynamicTextPipe, LocalizeEnumPipe, LocalizePipe, NumberLocalePipe, NumericDateToDateTimePipe, NumericTimeToDateTimePipe, OptionalLocalizePipe, PadPipe, SafeHtmlPipe, SafeResourceUrlPipe, SafeUrlPipe, SerializePipe } from './pipes';
import { type R3Injector, WrappedR3InjectorRecordsMap } from './services/wrapped-r3-injector-records-map';

let tstdlInitialized = false;

const pipes = [
  DateTimeLocalePipe,
  DateTimePipe,
  DateTimeToDatePipe,
  DecyclePipe,
  DurationPipe,
  DynamicTextPipe,
  LocalizeEnumPipe,
  LocalizePipe,
  NumberLocalePipe,
  NumericDateToDateTimePipe,
  NumericTimeToDateTimePipe,
  OptionalLocalizePipe,
  PadPipe,
  SafeHtmlPipe,
  SafeResourceUrlPipe,
  SafeUrlPipe,
  SerializePipe,
];

const directives = [
  AutoForDirective,
  AutoIdDirective,
  InputPatternDirective,
  LazyDirective,
  LazyListDirective,
  LetDirective,
  RepeatDirective,
  VisibilityObserverDirective,
];

const components = [
  TstdlSkeletonComponent,
  TstdlIndeterminateProgressBarComponent,
  TstdlColoredProgressbarComponent,
];

const declarations = [
  ...pipes,
  ...directives,
  ...components,
];

export class TstdlBridgeServiceOptions {
  debugInjectorWrapper?: boolean;
}

@NgModule({
  imports: declarations,
  exports: declarations,
  providers: [
    provideAppInitializer(tstdlInitializer),
    { provide: TstdlInjector, useFactory: () => new TstdlInjector('TstdlAngularBridgeInjector') },
  ],
})
export class TstdlAngularModule { }

function tstdlInitializer(): void {
  if (!tstdlInitialized) {
    configureTstdl({ production: !isDevMode() });
    tstdlSignalsInitializer();
  }

  injectorInitializer();

  tstdlInitialized = true;
}

function injectorInitializer(): void {
  const injector = inject(Injector);
  const tstdlInjector = inject(TstdlInjector);

  if (!tstdlInitialized) {
    wrapInjector(injector, tstdlInjector);
  }

  inject(DestroyRef).onDestroy(() => void tstdlInjector.dispose());

  tstdlInjector.register(Injector, { useValue: injector });
  tstdlInjector.register(DOCUMENT, { useFactory: () => injector.get(ANGULAR_DOCUMENT) });

  if (!tstdlInjector.hasRegistration(HttpClientAdapter)) {
    configureAngularHttpClientAdapter();
  }
}

function tstdlSignalsInitializer(): void {
  configureSignals<Injector>({
    signal,
    computed,
    effect: (effectFn: Parameters<typeof effect>[0], options?: TstdlCreateEffectOptions) => {
      return effect(effectFn, options as CreateEffectOptions);
    },
    untracked,
    isSignal,
    toSignal: <T>(source: Observable<T> | Subscribable<T>, options?: TstdlToSignalOptions<T>) => {
      return toSignal(source, options as any);
    },
    toObservable: <T>(source: Signal<T>, options?: TstdlToObservableOptions) => {
      return toObservable(source, options as ToObservableOptions);
    },
    isInSignalsInjectionContext: () => isInInjectionContext(),
    getCurrentSignalsInjector: () => inject(Injector),
    runInSignalsInjectionContext: (injector, fn) => runInInjectionContext(injector, fn),
  });
}

export function provideTstdlAngular(...providers: Tagged<Provider, 'tstdl-angular'>[][]): EnvironmentProviders {
  return makeEnvironmentProviders([
    importProvidersFrom(TstdlAngularModule),
    ...providers,
  ]);
}

export function withTstdlBridgeServiceOptions(options: TstdlBridgeServiceOptions): Tagged<Provider, 'tstdl-angular'>[] {
  return [
    {
      provide: TstdlBridgeServiceOptions,
      useValue: options,
    },
  ] as Tagged<Provider, 'tstdl-angular'>[];
}

function wrapInjector(injector: Injector, tstdlInjector: TstdlInjector): void {
  const debug = inject(TstdlBridgeServiceOptions, { optional: true })?.debugInjectorWrapper ?? false;

  WrappedR3InjectorRecordsMap.wrap(tstdlInjector, injector as R3Injector);

  const originalGet = injector.constructor.prototype.get as Injector['get']; // eslint-disable-line @typescript-eslint/no-unsafe-member-access

  function tstdlGetWrapper(this: Injector, ...args: Parameters<Injector['get']>): any {
    if (debug) {
      console.trace('TstdlBridgeService: injector get called with args:', args);
    }

    if (isInTstdlInjectionContext()) {
      return originalGet.apply(this, args);
    }

    const tstdlInjector = originalGet.apply(this, [TstdlInjector]) as TstdlInjector;

    return runInTstdlInjectionContext(tstdlInjector, () => originalGet.apply(this, args)); // eslint-disable-line @typescript-eslint/no-unsafe-return
  }

  injector.constructor.prototype.get = tstdlGetWrapper; // eslint-disable-line @typescript-eslint/no-unsafe-member-access
}
