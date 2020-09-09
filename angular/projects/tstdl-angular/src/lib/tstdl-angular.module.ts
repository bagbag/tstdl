import { NgModule } from '@angular/core';
import { CenterComponent } from './components';
import { DateTimeToDatePipe, DurationPipe, LocalizePipe, NumericDateToDatePipe, PadPipe, SafeUrlPipe } from './pipes';

const declarations = [
  CenterComponent,
  DurationPipe,
  LocalizePipe,
  NumericDateToDatePipe,
  DateTimeToDatePipe,
  PadPipe,
  SafeUrlPipe
];

@NgModule({
  declarations: declarations,
  imports: [],
  exports: declarations
})
export class TstdlAngularModule { }
