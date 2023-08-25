import { Injector } from '#/injector/injector.js';
import { Lock } from '../lock.js';
import { LockProvider } from '../provider.js';
import { WebLock } from './web-lock.js';
import { WebLockProvider } from './web-lock.provider.js';

/**
 * Register {@link WebLock} and {@link WebLockProvider} for {@link Lock} and {@link LockProvider} in global container
 */
export function configureWebLock(): void {
  Injector.registerSingleton(LockProvider, { useToken: WebLockProvider });
  Injector.register(Lock, { useToken: WebLock });
}
