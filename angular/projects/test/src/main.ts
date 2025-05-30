import { bootstrapApplication } from '@angular/platform-browser';
import { setDefaultApiClientOptions } from '@tstdl/base/api/client';
import { configureHttpClient } from '@tstdl/base/http';

import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

configureHttpClient({ baseUrl: 'http://localhost:8000' });
setDefaultApiClientOptions({ prefix: null });

bootstrapApplication(AppComponent, appConfig)
  .catch((error) => console.error(error));
