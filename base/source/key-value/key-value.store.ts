import type { StringMap } from '../types';

export interface KeyValueStore<KV extends StringMap> {
  get<K extends keyof KV>(key: K): Promise<KV[K] | undefined>;
  get<K extends keyof KV, D>(key: K, defaultValue: D): Promise<KV[K] | D>;

  set<K extends keyof KV>(key: K, value: KV[K]): Promise<void>;

  delete<K extends keyof KV>(key: K): Promise<boolean>;
}
