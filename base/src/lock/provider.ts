import type { Lock } from './lock';

export interface LockProvider {
  prefix(prefix: string): LockProvider;
  get(ressource: string): Lock;
}
