import { NgModule } from '@angular/core';
import { CenterComponent } from './components';
import { DateTimeLocalePipe, DateTimePipe, DateTimeToDatePipe, DurationPipe, LocalizePipe, NumericDateToDateTimePipe, PadPipe, SafeUrlPipe } from './pipes';

const declarations = [
  CenterComponent,
  DateTimeLocalePipe,
  DateTimePipe,
  DateTimeToDatePipe,
  DurationPipe,
  LocalizePipe,
  NumericDateToDateTimePipe,
  PadPipe,
  SafeUrlPipe
];

@NgModule({
  declarations: declarations,
  imports: [],
  exports: declarations
})
export class TstdlAngularModule { }
