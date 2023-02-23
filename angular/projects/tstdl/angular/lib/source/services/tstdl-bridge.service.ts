import { DOCUMENT as ANGULAR_DOCUMENT } from '@angular/common';
import { ApplicationRef, Injectable, Injector } from '@angular/core';
import type { Registration } from '@tstdl/base/container';
import { container, getTokenName } from '@tstdl/base/container';
import { HttpClientAdapter } from '@tstdl/base/http/client/http-client.adapter';
import { Logger } from '@tstdl/base/logger';
import { DOCUMENT } from '@tstdl/base/tokens';
import { filter, from, merge } from 'rxjs';
import { configureAngularHttpClientAdapter } from '../http/angular-http-client-adapter';

type PrivateApplicationRef = { _injector: { records: Map<unknown, unknown> } };

@Injectable({
  providedIn: 'root'
})
export class TstdlBridgeService {
  static initialized: boolean = false;

  private readonly privateApplicationRef: PrivateApplicationRef;
  private readonly injector: Injector;
  private logger: Logger;

  constructor(applicationRef: ApplicationRef, injector: Injector) {
    this.privateApplicationRef = applicationRef as unknown as PrivateApplicationRef;
    this.injector = injector;
  }

  initialize(): void {
    if (TstdlBridgeService.initialized) {
      return;
    }

    TstdlBridgeService.initialized = true;

    this.logger = container.resolve(Logger);

    if (!container.hasRegistration(HttpClientAdapter)) {
      configureAngularHttpClientAdapter(true);
    }

    container.register(Injector, { useValue: this.injector }, { metadata: { skipAngularInjection: true } });
    container.register(DOCUMENT, { useFactory: () => this.injector.get(ANGULAR_DOCUMENT) });

    merge(
      from(container.registrations).pipe(
        filter((registration) => registration.options.metadata?.['skipAngularInjection'] !== true)
      ),
      container.registration$
    )
      .subscribe((registration) => this.injectRegistration(registration));
  }

  private injectRegistration(registration: Registration): void {
    const tokenName = getTokenName(registration.token);

    if (this.privateApplicationRef._injector.records.has(registration.token)) {
      this.logger.warn(`angular injector already has a record for ${tokenName}, skipping`);
      return;
    }

    const record = {
      get value(): unknown {
        return container.resolve<unknown>(registration.token);
      }
    };

    this.logger.verbose(`adding ${tokenName} to angular injector`);
    this.privateApplicationRef._injector.records.set(registration.token, record);
  }
}
