import { DOCUMENT as ANGULAR_DOCUMENT } from '@angular/common';
import type { CreateEffectOptions, Provider, ProviderToken, Signal } from '@angular/core';
import { Injectable, Injector, assertInInjectionContext, computed, effect, inject, isDevMode, isSignal, signal, untracked } from '@angular/core';
import { ToObservableOptions, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { configureTstdl } from '@tstdl/base';
import type { Registration } from '@tstdl/base/container';
import { container, getTokenName } from '@tstdl/base/container';
import { HttpClientAdapter } from '@tstdl/base/http/client/http-client.adapter';
import { Logger } from '@tstdl/base/logger';
import { configureSignals } from '@tstdl/base/signals';
import { DOCUMENT } from '@tstdl/base/tokens';
import { concat, filter, from } from 'rxjs';

import { configureAngularHttpClientAdapter } from '../http/angular-http-client-adapter';

let instances = 0;

type R3Injector = Injector & {
  records: Map<ProviderToken<any>, unknown>,
  processProvider(provider: Provider): void
};

@Injectable({
  providedIn: 'root'
})
export class TstdlBridgeService {
  static initialized: boolean = false;

  private readonly injector = inject(Injector) as R3Injector;

  private logger: Logger;

  constructor() {
    if (isDevMode() && (++instances > 1)) {
      console.warn('TstdlBridgeService instantiated more than once. This should not happen.');
    }
  }

  initialize(): void {
    if (TstdlBridgeService.initialized) {
      return;
    }

    TstdlBridgeService.initialized = true;

    configureTstdl({ production: !isDevMode() });
    this.configureSignals();
    this.logger = container.resolve(Logger);

    if (!container.hasRegistration(HttpClientAdapter)) {
      configureAngularHttpClientAdapter(true);
    }

    container.register(Injector, { useValue: this.injector }, { metadata: { skipAngularInjection: true } });
    container.register(DOCUMENT, { useFactory: () => this.injector.get(ANGULAR_DOCUMENT) }, { metadata: { skipAngularInjection: true } });

    concat(
      from(container.registrations).pipe(filter((registration) => registration.options.metadata?.['skipAngularInjection'] !== true)),
      container.registration$
    )
      .subscribe((registration) => this.injectRegistration(registration));
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
          return effect(effectFn, { injector: this.injector, ...options });
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
          return toObservable(source, { injector: this.injector, ...options });
        }
      }
    });
  }

  private injectRegistration(registration: Registration): void {
    const tokenName = getTokenName(registration.token);

    if (this.injector.records.has(registration.token as ProviderToken<any>)) {
      if (isDevMode()) {
        this.logger.warn(`Angular injector already has a record for ${tokenName}, skipping.`);
      }

      return;
    }

    if (isDevMode()) {
      this.logger.verbose(`Adding ${tokenName} to angular injector.`);
    }

    this.injector.processProvider({ provide: registration.token, useFactory: () => container.resolve(registration.token) });
  }
}
