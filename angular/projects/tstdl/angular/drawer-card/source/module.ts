import { NgModule } from '@angular/core';

import { DrawerCardContentComponent } from './drawer-card-content/drawer-card-content.component';
import { DrawerCardDrawerContentComponent } from './drawer-card-drawer-content/drawer-card-drawer-content.component';
import { DrawerCardComponent } from './drawer-card.component';

@NgModule({
  imports: [DrawerCardComponent, DrawerCardContentComponent, DrawerCardDrawerContentComponent],
  exports: [DrawerCardComponent, DrawerCardContentComponent, DrawerCardDrawerContentComponent]
})
export class TslDrawerCardModule { }
