import { HttpClient as AngularHttpClient } from '@angular/common/http';
import { Inject, Injectable, Optional } from '@angular/core';
import type { HttpClientOptions } from '@tstdl/base/http';
import { HttpClient as TstdlHttpClient, HTTP_CLIENT_OPTIONS } from '@tstdl/base/http';
import { AngularHttpClientAdapter } from '../http';

const defaultOptions: HttpClientOptions = { baseUrl: window.location.origin };

@Injectable({
  providedIn: 'root'
})
export class HttpClient extends TstdlHttpClient {
  constructor(angularHttpClient: AngularHttpClient, @Optional() @Inject(HTTP_CLIENT_OPTIONS) options: HttpClientOptions | null) {
    const adapter = new AngularHttpClientAdapter(angularHttpClient);
    const httpClientOptions: HttpClientOptions = options ?? defaultOptions;

    super(adapter, httpClientOptions);
  }
}
