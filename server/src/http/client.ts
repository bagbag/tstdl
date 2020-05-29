import Got, { OptionsOfTextResponseBody } from 'got';
import { Readable } from 'stream';

export type HttpResponse<T extends string | Buffer> = {
  statusCode: number,
  statusMessage: string,
  body: T
};

const gotOptions: OptionsOfTextResponseBody = {
  retry: 0,
  followRedirect: true
};

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class HttpClient {
  static async get(url: string): Promise<HttpResponse<Buffer>> {
    const response = await Got.get(url, { ...gotOptions, responseType: 'buffer' });

    const result: HttpResponse<Buffer> = {
      statusCode: response.statusCode,
      statusMessage: response.statusMessage ?? '',
      body: response.body as any as Buffer
    };

    return result;
  }

  static async getString(url: string): Promise<string> {
    const response = await Got.get(url, { ...gotOptions, responseType: 'text' });
    return response.body;
  }

  static getStream(url: string): Readable {
    const stream = Got.stream.get(url, { ...gotOptions, isStream: true })
    return stream;
  }
}
