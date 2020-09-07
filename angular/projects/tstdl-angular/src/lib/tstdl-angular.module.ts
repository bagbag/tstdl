import { NgModule } from '@angular/core';
import { CenterComponent } from './components/center/center.component';
import { DurationPipe } from './pipes/duration.pipe';
import { LocalizePipe } from './pipes/localize.pipe';
import { NumericDatePipe } from './pipes/numeric-date.pipe';
import { PadPipe } from './pipes/pad.pipe';
import { SafeUrlPipe } from './pipes/safe-url.pipe';

const declarations = [
  CenterComponent,
  DurationPipe,
  LocalizePipe,
  NumericDatePipe,
  PadPipe,
  SafeUrlPipe
];

@NgModule({
  declarations: declarations,
  imports: [],
  exports: declarations
})
export class TstdlAngularModule { }
