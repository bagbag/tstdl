import { NgModule } from '@angular/core';

import { VerticalTabGroupComponent } from './vertical-tab-group.component';
import { VerticalTabLabelDirective } from './vertical-tab/vertical-tab-label.directive';
import { VerticalTabComponent } from './vertical-tab/vertical-tab.component';

@NgModule({
  imports: [VerticalTabGroupComponent, VerticalTabComponent, VerticalTabLabelDirective],
  exports: [VerticalTabGroupComponent, VerticalTabComponent, VerticalTabLabelDirective]
})
export class TslVerticalTabGroupModule { }
