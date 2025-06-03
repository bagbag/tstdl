import type { CreateEffectOptions, Signal } from '@angular/core';
import { DOCUMENT as ANGULAR_DOCUMENT, Injectable, Injector, assertInInjectionContext, computed, effect, inject, isDevMode, isSignal, runInInjectionContext, signal, untracked } from '@angular/core';
import type { ToObservableOptions } from '@angular/core/rxjs-interop';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { configureTstdl } from '@tstdl/base';
import { HttpClientAdapter } from '@tstdl/base/http';
import { Injector as TstdlInjector, isInInjectionContext, isInInjectionContext as isInTstdlInjectionContext, runInInjectionContext as runInTstdlInjectionContext } from '@tstdl/base/injector';
import { type CreateEffectOptions as TstdlCreateEffectOptions, type ToObservableOptions as TstdlToObservableOptions, type ToSignalOptions as TstdlToSignalOptions, configureSignals } from '@tstdl/base/signals';
import { DOCUMENT } from '@tstdl/base/tokens';
import { Observable, type Subscribable } from 'rxjs';

import { configureAngularHttpClientAdapter } from '../http/angular-http-client-adapter';
import { type R3Injector, WrappedR3InjectorRecordsMap } from './wrapped-r3-injector-records-map';

@Injectable({
  providedIn: 'root'
})
export class TstdlBridgeService {
  readonly #injector = inject(Injector) as R3Injector;
  readonly #tstdlInjector = new TstdlInjector('TstdlBridgeServiceInjector');

  private initialized = false;

  initialize(): void {
    if (this.initialized) {
      return;
    }

    this.initialized = true;

    configureTstdl({ production: !isDevMode() });
    this.configureSignals();

    if (!this.#tstdlInjector.hasRegistration(HttpClientAdapter)) {
      configureAngularHttpClientAdapter();
    }

    this.#tstdlInjector.register(Injector, { useValue: this.#injector });
    this.#tstdlInjector.register(DOCUMENT, { useFactory: () => this.#injector.get(ANGULAR_DOCUMENT) });

    WrappedR3InjectorRecordsMap.wrap(this.#tstdlInjector, this.#injector);
    this.wrapInjector(this.#injector);
  }

  private wrapInjector(injector: Injector): void {
    const tstdlInjector = this.#tstdlInjector;
    const originalGet = injector.constructor.prototype.get as Function;

    function tstdlGetWrapper(this: R3Injector, ...args: any[]): any {
      if (isInTstdlInjectionContext()) {
        return originalGet.apply(this, args);
      }

      return runInTstdlInjectionContext(tstdlInjector, () => originalGet.apply(this, args));
    }

    injector.constructor.prototype.get = tstdlGetWrapper;
  }

  private configureSignals(): void {
    configureSignals<Injector>({
      signal,
      computed,
      effect: (effectFn: Parameters<typeof effect>[0], options?: TstdlCreateEffectOptions) => {
        try {
          assertInInjectionContext(TstdlBridgeService);
          return effect(effectFn, options as CreateEffectOptions);
        }
        catch {
          return effect(effectFn, { injector: this.#injector as Injector, ...options } as CreateEffectOptions);
        }
      },
      untracked,
      isSignal,
      toSignal: <T>(source: Observable<T> | Subscribable<T>, options?: TstdlToSignalOptions<T>) => {
        try {
          assertInInjectionContext(TstdlBridgeService);
          return toSignal(source, options as any);
        }
        catch {
          return toSignal(source, { injector: this.#injector, ...options } as any);
        }
      },
      toObservable: <T>(source: Signal<T>, options?: TstdlToObservableOptions) => {
        try {
          assertInInjectionContext(TstdlBridgeService);
          return toObservable(source, options as ToObservableOptions);
        }
        catch {
          return toObservable(source, { injector: this.#injector, ...options } as ToObservableOptions);
        }
      },
      isInSignalsInjectionContext: () => isInInjectionContext(),
      getCurrentSignalsInjector: () => inject(Injector),
      runInSignalsInjectionContext: (injector, fn) => runInInjectionContext(injector, fn)
    });
  }
}
