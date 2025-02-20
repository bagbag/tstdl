import { injectionToken } from '#/injector/token.js';

export const ENCRYPTION_SECRET = injectionToken<Uint8Array>('EncryptionSecret');
