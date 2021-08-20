import { HttpClient as AngularHttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { HttpClient as TstdlHttpClient } from '@tstdl/base/cjs/http';
import { AngularHttpClientAdapter } from '../http';

@Injectable({
  providedIn: 'root'
})
export class HttpClient extends TstdlHttpClient {
  constructor(angularHttpClient: AngularHttpClient) {
    const adapter = new AngularHttpClientAdapter(angularHttpClient);
    super(adapter, window.location.origin);
  }
}
