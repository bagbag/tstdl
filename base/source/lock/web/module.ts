import { container } from '#/container';
import { Lock } from '../lock';
import { LockProvider } from '../provider';
import { WebLock } from './web-lock';
import { WebLockProvider } from './web-lock.provider';

/**
 * Register {@link WebLock} and {@link WebLockProvider} for {@link Lock} and {@link LockProvider} in global container
 */
export function configureWebLock(): void {
  container.registerSingleton(LockProvider, { useToken: WebLockProvider });
  container.register(Lock, { useToken: WebLock });
}
