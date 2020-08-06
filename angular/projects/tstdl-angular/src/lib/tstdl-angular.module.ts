import { NgModule } from '@angular/core';
import { CenterComponent } from './components/center/center.component';
import { LocalizePipe } from './pipes/localize.pipe';

@NgModule({
  declarations: [LocalizePipe, CenterComponent],
  imports: [],
  exports: [LocalizePipe]
})
export class TstdlAngularModule { }
