import { NgModule } from '@angular/core';
import { LazyListComponent } from './components';
import { VisibleObserverDirective } from './directives';
import { DateTimeLocalePipe, DateTimePipe, DateTimeToDatePipe, DurationPipe, LocalizePipe, NumericDateToDateTimePipe, PadPipe, SafeUrlPipe, TimestampToDateTimePipe } from './pipes';

const declarations = [
  LazyListComponent,
  VisibleObserverDirective,
  DateTimeLocalePipe,
  DateTimePipe,
  DateTimeToDatePipe,
  DurationPipe,
  LocalizePipe,
  NumericDateToDateTimePipe,
  PadPipe,
  SafeUrlPipe,
  TimestampToDateTimePipe
];

@NgModule({
  declarations,
  imports: [],
  exports: declarations
})
export class TstdlAngularModule { }
