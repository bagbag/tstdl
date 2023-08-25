import { DOCUMENT as ANGULAR_DOCUMENT } from '@angular/common';
import type { CreateEffectOptions, Signal } from '@angular/core';
import { Injectable, Injector, assertInInjectionContext, computed, effect, inject, isDevMode, isSignal, signal, untracked } from '@angular/core';
import type { ToObservableOptions } from '@angular/core/rxjs-interop';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { configureTstdl } from '@tstdl/base';
import { HttpClientAdapter } from '@tstdl/base/http/client/http-client.adapter';
import { Injector as TstdlInjector } from '@tstdl/base/injector';
import { configureSignals } from '@tstdl/base/signals';
import { DOCUMENT } from '@tstdl/base/tokens';

import { configureAngularHttpClientAdapter } from '../http/angular-http-client-adapter';
import type { R3Injector } from './wrapped-r3-injector-records-map';
import { WrappedR3InjectorRecordsMap } from './wrapped-r3-injector-records-map';

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
      configureAngularHttpClientAdapter(true);
    }

    this.#tstdlInjector.register(Injector, { useValue: this.#injector });
    this.#tstdlInjector.register(DOCUMENT, { useFactory: () => this.#injector.get(ANGULAR_DOCUMENT) });

    WrappedR3InjectorRecordsMap.wrap(this.#tstdlInjector, this.#injector);
  }

  private configureSignals(): void {
    configureSignals({
      signal,
      computed,
      effect: (effectFn: Parameters<typeof effect>[0], options?: CreateEffectOptions) => {
        try {
          assertInInjectionContext(TstdlBridgeService);
          return effect(effectFn, options);
        }
        catch {
          return effect(effectFn, { injector: this.#injector, ...options });
        }
      },
      untracked,
      isSignal,
      toSignal,
      toObservable: <T>(source: Signal<T>, options?: ToObservableOptions) => {
        try {
          assertInInjectionContext(TstdlBridgeService);
          return toObservable(source, options);
        }
        catch {
          return toObservable(source, { injector: this.#injector, ...options });
        }
      }
    });
  }
}
