/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import type { Watch } from './watch.js';
import { watch } from './watch.js';

/**
 * An effect can, optionally, register a cleanup function. If registered, the cleanup is executed
 * before the next effect run. The cleanup function makes it possible to "cancel" any work that the
 * previous effect run might have started.
 */
export type EffectCleanupFn = () => void;

/**
 * A callback passed to the effect function that makes it possible to register cleanup logic.
 */
export type EffectCleanupRegisterFn = (cleanupFn: EffectCleanupFn) => void;

/**
 * Tracks all effects registered within a given application and runs them via `flush`.
 */
export class EffectManager {
  private readonly all = new Set<Watch>();
  private readonly queue = new Set<Watch>();

  private pendingFlush: boolean;

  create(effectFn: (onCleanup: (cleanupFn: EffectCleanupFn) => void) => void, allowSignalWrites: boolean): EffectRef {
    const w = watch(effectFn, () => {
      if (!this.all.has(w)) {
        return;
      }

      this.queue.add(w);

      if (!this.pendingFlush) {
        this.pendingFlush = true;

        queueMicrotask(() => {
          this.pendingFlush = false;
          this.flush();
        });
      }
    }, allowSignalWrites);

    this.all.add(w);

    // Effects start dirty.
    w.notify();

    const destroy = () => {
      w.cleanup();
      this.all.delete(w);
      this.queue.delete(w);
    };

    return {
      destroy
    };
  }

  flush(): void {
    if (this.queue.size === 0) {
      return;
    }

    for (const w of this.queue) {
      this.queue.delete(w);
      w.run();
    }
  }

  get isQueueEmpty(): boolean {
    return this.queue.size === 0;
  }
}

/**
 * A global reactive effect, which can be manually destroyed.
 */
export interface EffectRef {
  /**
   * Shut down the effect, removing it from any upcoming scheduled executions.
   */
  destroy(): void;
}

/**
 * Options passed to the `effect` function.
 */
export interface CreateEffectOptions {
  /**
   * Whether the `effect` should allow writing to signals.
   *
   * Using effects to synchronize data by writing to signals can lead to confusing and potentially
   * incorrect behavior, and should be enabled only when necessary.
   */
  allowSignalWrites?: boolean;
}

const effectManager = new EffectManager();

/**
 * Create a global `Effect` for the given reactive function.
 */
export function effect(effectFn: (onCleanup: EffectCleanupRegisterFn) => void, options?: CreateEffectOptions): EffectRef {
  return effectManager.create(effectFn, options?.allowSignalWrites ?? false);
}
