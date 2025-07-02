import { type EnvironmentProviders, NgModule, type Provider, importProvidersFrom, inject, makeEnvironmentProviders, provideAppInitializer } from '@angular/core';

import { TstdlColoredProgressbarComponent, TstdlIndeterminateProgressBarComponent, TstdlSkeletonComponent } from './components';
import { AutoForDirective, AutoIdDirective, InputPatternDirective, LazyDirective, LazyListDirective, LetDirective, RepeatDirective, VisibilityObserverDirective } from './directives';
import { DateTimeLocalePipe, DateTimePipe, DateTimeToDatePipe, DecyclePipe, DurationPipe, DynamicTextPipe, LocalizeEnumPipe, LocalizePipe, NumberLocalePipe, NumericDateToDateTimePipe, NumericTimeToDateTimePipe, OptionalLocalizePipe, PadPipe, SafeHtmlPipe, SafeResourceUrlPipe, SafeUrlPipe, SerializePipe } from './pipes';
import { TstdlBridgeService, TstdlBridgeServiceOptions } from './services/tstdl-bridge.service';
import type { Tagged } from 'type-fest';

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

@NgModule({
  imports: declarations,
  exports: declarations,
  providers: [
    provideAppInitializer(appInitializer),
  ],
})
export class TstdlAngularModule { }

function appInitializer(): void {
  const bridgeService = inject(TstdlBridgeService);
  bridgeService.initialize();
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
