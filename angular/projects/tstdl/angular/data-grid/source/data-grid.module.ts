import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { DateTimeLocalePipe, DynamicTextPipe, LocalizeEnumPipe, NumberLocalePipe, NumericDateToDateTimePipe, NumericTimeToDateTimePipe } from '@tstdl/angular';
import { DataGridComponent } from './components/data-grid/data-grid.component';
import { GridLabelComponent } from './components/grid-label/grid-label.component';
import { GridValueComponent } from './components/grid-value/grid-value.component';
import { GridColumnDirective } from './directives/grid-column.directive';
import { GridHeaderItemDirective } from './directives/grid-header-item.directive';
import { GridItemDirective } from './directives/grid-item.directive';
import { GridLabelDirective } from './directives/grid-label.directive';
import { GridRowDirective } from './directives/grid-row.directive';

@NgModule({
  declarations: [
    DataGridComponent,
    GridLabelComponent,
    GridValueComponent,

    GridColumnDirective,
    GridHeaderItemDirective,
    GridItemDirective,
    GridLabelDirective,
    GridRowDirective
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
    GridRowDirective
  ]
})
export class DataGridModule { }
