/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Injectable } from '@angular/core';
import { Watch } from './watch';

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
 * An effect can, optionally, register a cleanup function. If registered, the cleanup is executed
 * before the next effect run. The cleanup function makes it possible to "cancel" any work that the
 * previous effect run might have started.
 */
export type EffectCleanupFn = () => void;

/**
 * A callback passed to the effect function that makes it possible to register cleanup logic.
 */
export type EffectCleanupRegisterFn = (cleanupFn: EffectCleanupFn) => void;

export type CreateEffectOptions = {

  /**
   * Whether the `effect` should allow writing to signals.
   *
   * Using effects to synchronize data by writing to signals can lead to confusing and potentially
   * incorrect behavior, and should be enabled only when necessary.
   */
  allowSignalWrites?: boolean,

  /**
   * Immediately run effect after creation without scheduling - for advanced use cases.
   */
  runImmediately?: boolean
};

/**
 * Tracks all effects registered within a given application and runs them via `flush`.
 */
@Injectable({
  providedIn: 'root'
})
export class EffectManager {
  private readonly all = new Set<Watch>();
  private readonly queue = new Set<Watch>();

  private pendingFlush: boolean;

  create(effectFn: (onCleanup: (cleanupFn: EffectCleanupFn) => void) => void, { allowSignalWrites = false, runImmediately = false }: CreateEffectOptions = {}): EffectRef {
    const watch = new Watch(effectFn, (watch) => {
      if (!this.all.has(watch)) {
        return;
      }

      this.queue.add(watch);

      if (!this.pendingFlush) {
        this.pendingFlush = true;

        queueMicrotask(() => {
          this.pendingFlush = false;
          this.flush();
        });
      }
    }, allowSignalWrites);

    this.all.add(watch);

    if (runImmediately) {
      watch.run();
    }
    else {
      watch.notify();
    }

    const destroy = (): void => {
      watch.cleanup();
      this.all.delete(watch);
      this.queue.delete(watch);
    };

    return {
      destroy
    };
  }

  flush(): void {
    if (this.queue.size === 0) {
      return;
    }

    for (const watch of this.queue) {
      this.queue.delete(watch);
      watch.run();
    }
  }

  get isQueueEmpty(): boolean {
    return this.queue.size === 0;
  }
}

const effectManager = new EffectManager();

/**
 * Create a global `Effect` for the given reactive function.
 */
export function effect(effectFn: (onCleanup: EffectCleanupRegisterFn) => void, options?: CreateEffectOptions): EffectRef {
  return effectManager.create(effectFn, options);
}
