import { NgModule } from '@angular/core';

import { DataGridComponent } from './components';
import { GridColumnDirective, GridHeaderItemDirective, GridItemDirective, GridLabelDirective, GridRowDirective, GridValueDirective } from './directives';

@NgModule({
  imports: [
    DataGridComponent,

    GridColumnDirective,
    GridHeaderItemDirective,
    GridItemDirective,
    GridLabelDirective,
    GridRowDirective,
    GridValueDirective
  ],
  exports: [
    DataGridComponent,

    GridColumnDirective,
    GridHeaderItemDirective,
    GridItemDirective,
    GridLabelDirective,
    GridRowDirective,
    GridValueDirective
  ]
})
export class TstdlDataGridModule { }
