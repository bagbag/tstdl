import { importProvidersFrom } from '@angular/core';
import { BrowserModule, bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideTstdlAngular } from '@tstdl/angular';
import { AppComponent } from './app/app.component';
import { APP_ROUTES } from './app/routes';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(APP_ROUTES),
    provideTstdlAngular(),
    importProvidersFrom(BrowserModule)
  ]
}).catch((error) => console.error(error));
