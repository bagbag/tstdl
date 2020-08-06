import { NgModule } from '@angular/core';
import { CenterComponent } from './components/center/center.component';
import { LocalizePipe } from './pipes/localize.pipe';

const declarations = [
  LocalizePipe,
  CenterComponent
];

@NgModule({
  declarations: declarations,
  imports: [],
  exports: declarations
})
export class TstdlAngularModule { }
