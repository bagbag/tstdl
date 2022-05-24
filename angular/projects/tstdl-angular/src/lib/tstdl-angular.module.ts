import { NgModule } from '@angular/core';
import { configureTstdl } from '@tstdl/base';
import { SkeletonComponent } from './components';
import { AutoForDirective, AutoIdDirective, InputPatternDirective, LazyDirective, LazyListDirective, LetDirective, RepeatDirective, VisibilityObserverDirective } from './directives';
import { DateTimeLocalePipe, DateTimePipe, DateTimeToDatePipe, DurationPipe, LocalizePipe, NumberLocalePipe, NumericDateToDateTimePipe, OptionalLocalizePipe, PadPipe, SafeUrlPipe, TimestampToDateTimePipe } from './pipes';
import { TextPipe } from './pipes/text.pipe';
import { TstdlBridgeService } from './services/tstdl-bridge.service';

const declarations = [
  AutoForDirective,
  AutoIdDirective,
  DateTimeLocalePipe,
  DateTimePipe,
  DateTimeToDatePipe,
  DurationPipe,
  InputPatternDirective,
  LazyDirective,
  LazyListDirective,
  LetDirective,
  LocalizePipe,
  NumberLocalePipe,
  NumericDateToDateTimePipe,
  OptionalLocalizePipe,
  PadPipe,
  RepeatDirective,
  SafeUrlPipe,
  SkeletonComponent,
  TextPipe,
  TimestampToDateTimePipe,
  VisibilityObserverDirective
];

@NgModule({
  declarations: declarations,
  exports: declarations
})
export class TstdlAngularModule {
  constructor(bridge: TstdlBridgeService) {
    configureTstdl();
    bridge.initialize();
  }
}
