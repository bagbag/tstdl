import { provideExperimentalZonelessChangeDetection, type ApplicationConfig } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { provideTstdlAngular } from '@tstdl/angular';

import { provideHttpClient, withFetch } from '@angular/common/http';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideExperimentalZonelessChangeDetection(),
    provideRouter(routes),
    provideTstdlAngular(),
    provideHttpClient(withFetch()),
    provideAnimations()
  ]
};
