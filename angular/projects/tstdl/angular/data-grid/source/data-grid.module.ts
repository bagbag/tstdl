import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { DateTimeLocalePipe, DynamicTextPipe, LocalizeEnumPipe, NumberLocalePipe, NumericDateToDateTimePipe, NumericTimeToDateTimePipe } from '@tstdl/angular';

import { DataGridComponent, GridLabelComponent, GridValueComponent } from './components';
import { GridColumnDirective, GridHeaderItemDirective, GridItemDirective, GridLabelDirective, GridRowDirective, GridValueDirective } from './directives';

@NgModule({
  declarations: [
    DataGridComponent,
    GridLabelComponent,
    GridValueComponent,

    GridColumnDirective,
    GridHeaderItemDirective,
    GridItemDirective,
    GridLabelDirective,
    GridRowDirective,
    GridValueDirective
  ],
  imports: [
    CommonModule,
    DynamicTextPipe,
    NumberLocalePipe,
    DateTimeLocalePipe,
    NumericDateToDateTimePipe,
    LocalizeEnumPipe,
    NumericTimeToDateTimePipe
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
