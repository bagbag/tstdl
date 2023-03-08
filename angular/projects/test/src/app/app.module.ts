import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { TstdlAngularModule } from '@tstdl/angular';
import { TstdlDataGridModule } from '@tstdl/angular/data-grid';
import { ReactComponent } from '@tstdl/angular/react';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { DataGridComponent } from './examples/data-grid/data-grid.component';
import { ReactComponent as ReactExampleComponent } from './examples/react/react.component';

@NgModule({
  declarations: [
    AppComponent,
    DataGridComponent,
    ReactExampleComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    TstdlAngularModule,
    TstdlDataGridModule,
    ReactComponent
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
