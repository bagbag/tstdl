import type { StringMap } from '../types.js';
import type { KeyValueStore } from './key-value.store.js';

export abstract class KeyValueStoreProvider {
  abstract get<KV extends StringMap>(module: string): KeyValueStore<KV>;
}
