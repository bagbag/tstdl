import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { TstdlAngularModule } from '@tstdl/angular';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    AppRoutingModule,
    TstdlAngularModule
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
