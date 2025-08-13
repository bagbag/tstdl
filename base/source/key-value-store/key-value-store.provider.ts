import type { Record } from '#/types/index.js';
import type { KeyValueStore } from './key-value.store.js';

export abstract class KeyValueStoreProvider {
  abstract get<KV extends Record<string>>(module: string): KeyValueStore<KV>;
}
