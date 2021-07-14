import type { StringMap } from '../types';
import type { KeyValueStore } from './key-value.store';

export interface KeyValueStoreProvider {
  get<KV extends StringMap>(scope: string): KeyValueStore<KV>;
}
