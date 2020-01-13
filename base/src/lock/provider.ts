import { Lock } from './lock';

export interface LockProvider {
  get(ressource: string): Lock;
}
