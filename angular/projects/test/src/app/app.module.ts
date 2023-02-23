import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { TstdlAngularModule } from '@tstdl/angular';
import { TstdlDataGridModule } from '@tstdl/angular/data-grid';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { DataGridComponent } from './examples/data-grid/data-grid.component';

@NgModule({
  declarations: [
    AppComponent,
    DataGridComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    TstdlAngularModule,
    TstdlDataGridModule
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
