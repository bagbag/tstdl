import { bootstrapApplication } from '@angular/platform-browser';
import { setDefaultApiClientOptions } from '@tstdl/base/api/client';
import { configureHttpClient } from '@tstdl/base/http';
import { configureWebLock } from '@tstdl/base/lock/web';
import { configureLocalMessageBus } from '@tstdl/base/message-bus';

import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

configureHttpClient({ baseUrl: 'http://localhost:8000' });
setDefaultApiClientOptions({ prefix: null });
configureLocalMessageBus();
configureWebLock();

bootstrapApplication(AppComponent, appConfig)
  .catch((error) => console.error(error));
