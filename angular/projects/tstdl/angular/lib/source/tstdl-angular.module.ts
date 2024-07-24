import { APP_INITIALIZER, type EnvironmentProviders, NgModule, importProvidersFrom, inject } from '@angular/core';

import { TstdlColoredProgressbarComponent, TstdlIndeterminateProgressBarComponent, TstdlSkeletonComponent } from './components';
import { AutoForDirective, AutoIdDirective, InputPatternDirective, LazyDirective, LazyListDirective, LetDirective, RepeatDirective, VisibilityObserverDirective } from './directives';
import { DateTimeLocalePipe, DateTimePipe, DateTimeToDatePipe, DecyclePipe, DurationPipe, DynamicTextPipe, LocalizeEnumPipe, LocalizePipe, NumberLocalePipe, NumericDateToDateTimePipe, NumericTimeToDateTimePipe, OptionalLocalizePipe, PadPipe, SafeHtmlPipe, SafeResourceUrlPipe, SafeUrlPipe, SerializePipe } from './pipes';
import { TstdlBridgeService } from './services/tstdl-bridge.service';

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
  SerializePipe
];

const directives = [
  AutoForDirective,
  AutoIdDirective,
  InputPatternDirective,
  LazyDirective,
  LazyListDirective,
  LetDirective,
  RepeatDirective,
  VisibilityObserverDirective
];

const components = [
  TstdlSkeletonComponent,
  TstdlIndeterminateProgressBarComponent,
  TstdlColoredProgressbarComponent
];

const declarations = [
  ...pipes,
  ...directives,
  ...components
];

@NgModule({
  imports: declarations,
  exports: declarations,
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: () => {
        const bridgeService = inject(TstdlBridgeService);
        return () => bridgeService.initialize();
      },
      multi: true
    }
  ]
})
export class TstdlAngularModule { }

export function provideTstdlAngular(): EnvironmentProviders {
  return importProvidersFrom(TstdlAngularModule);
}
