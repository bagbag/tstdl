import { DOCUMENT as ANGULAR_DOCUMENT } from '@angular/common';
import { Injectable, Injector, Provider, ProviderToken, isDevMode } from '@angular/core';
import type { Registration } from '@tstdl/base/container';
import { container, getTokenName } from '@tstdl/base/container';
import { HttpClientAdapter } from '@tstdl/base/http/client/http-client.adapter';
import { Logger } from '@tstdl/base/logger';
import { DOCUMENT } from '@tstdl/base/tokens';
import { concat, filter, from } from 'rxjs';
import { configureAngularHttpClientAdapter } from '../http/angular-http-client-adapter';

type R3Injector = Injector & {
  records: Map<ProviderToken<any>, unknown>,
  processProvider(provider: Provider): void
};

@Injectable({
  providedIn: 'root'
})
export class TstdlBridgeService {
  static initialized: boolean = false;

  private readonly injector: R3Injector;

  private logger: Logger;

  constructor(injector: Injector) {
    this.injector = injector as R3Injector;
  }

  initialize(): void {
    if (TstdlBridgeService.initialized) {
      if (isDevMode()) {
        console.warn('TstdlBridgeService.initialize was called more than once. This should not happen.');
      }

      return;
    }

    TstdlBridgeService.initialized = true;

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
