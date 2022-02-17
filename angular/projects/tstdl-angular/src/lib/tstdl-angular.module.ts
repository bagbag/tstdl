import { NgModule } from '@angular/core';
import { SkeletonComponent } from './components';
import { LazyDirective, LazyListDirective, LetDirective, VisibleObserverDirective } from './directives';
import { RepeatDirective } from './directives/repeat.directive';
import { DateTimeLocalePipe, DateTimePipe, DateTimeToDatePipe, DurationPipe, LocalizePipe, NumberLocalePipe, NumericDateToDateTimePipe, OptionalLocalizePipe, PadPipe, SafeUrlPipe, TimestampToDateTimePipe } from './pipes';
import { TstdlBridgeService } from './services/tstdl-bridge.service';

const declarations = [
  DateTimeLocalePipe,
  DateTimePipe,
  DateTimeToDatePipe,
  DurationPipe,
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
  TimestampToDateTimePipe,
  VisibleObserverDirective
];

@NgModule({
  declarations,
  exports: declarations
})
export class TstdlAngularModule {
  constructor(bridge: TstdlBridgeService) {
    bridge.initialize();
  }
}
