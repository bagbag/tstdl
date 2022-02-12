import { ApplicationRef, Injector, NgModule } from '@angular/core';
import type { Registration } from '@tstdl/base/container';
import { container, getTokenName } from '@tstdl/base/container';
import { HttpClientAdapter } from '@tstdl/base/http/client.adapter';
import { Logger } from '@tstdl/base/logger';
import { filter, from, merge } from 'rxjs';
import { LazyListDirective, VisibleObserverDirective } from './directives';
import { LetDirective } from './directives/let.directive';
import { configureAngularHttpClientAdapter } from './http';
import { DateTimeLocalePipe, DateTimePipe, DateTimeToDatePipe, DurationPipe, LocalizePipe, NumberLocalePipe, NumericDateToDateTimePipe, OptionalLocalizePipe, PadPipe, SafeUrlPipe, TimestampToDateTimePipe } from './pipes';

type PrivateApplicationRef = { _injector: { records: Map<unknown, unknown> } };

const declarations = [
  DateTimeLocalePipe,
  DateTimePipe,
  DateTimeToDatePipe,
  DurationPipe,
  LazyListDirective,
  LetDirective,
  LocalizePipe,
  NumberLocalePipe,
  NumericDateToDateTimePipe,
  OptionalLocalizePipe,
  PadPipe,
  SafeUrlPipe,
  TimestampToDateTimePipe,
  VisibleObserverDirective
];

@NgModule({
  declarations,
  exports: declarations
})
export class TstdlAngularModule {
  private readonly privateApplicationRef: PrivateApplicationRef;
  private readonly injector: Injector;
  private readonly logger: Logger;

  constructor(applicationRef: ApplicationRef, injector: Injector) {
    this.privateApplicationRef = applicationRef as unknown as PrivateApplicationRef;
    this.injector = injector;
    this.logger = container.resolve(Logger);

    this.initialize();
  }

  private initialize(): void {
    if (!container.hasRegistration(HttpClientAdapter)) {
      configureAngularHttpClientAdapter(true);
    }

    container.register(Injector, { useValue: this.injector });

    merge(
      from(container.registrations).pipe(
        filter((registration) => registration.token != Injector)
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
