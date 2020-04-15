import { NgModule } from '@angular/core';
import { LocalizePipe } from './pipes/localize.pipe';

@NgModule({
  declarations: [LocalizePipe],
  imports: [
  ],
  exports: [LocalizePipe]
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class TstdlModule { }
