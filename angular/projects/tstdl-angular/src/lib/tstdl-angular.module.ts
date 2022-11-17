import { NgModule } from '@angular/core';
import { configureTstdl } from '@tstdl/base';
import { TstdlBridgeService } from './services/tstdl-bridge.service';

@NgModule({
  declarations: [],
  imports: [],
  exports: []
})
export class TstdlAngularModule {
  constructor(bridge: TstdlBridgeService) {
    configureTstdl();
    bridge.initialize();
  }
}
