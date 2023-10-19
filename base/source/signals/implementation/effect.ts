/* eslint-disable */

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { assertNotInReactiveContext } from './asserts.js';
import type { Watch, WatchCleanupRegisterFn } from './watch.js';
import { createWatch } from './watch.js';



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

export interface SchedulableEffect {
  run(): void;
}

/**
 * A scheduler which manages the execution of effects.
 */
export abstract class EffectScheduler {
  /**
   * Schedule the given effect to be executed at a later time.
   *
   * It is an error to attempt to execute any effects synchronously during a scheduling operation.
   */
  abstract scheduleEffect(e: SchedulableEffect): void;
}

/**
 * Interface to an `EffectScheduler` capable of running scheduled effects synchronously.
 */
export interface FlushableEffectRunner {
  /**
   * Run any scheduled effects.
   */
  flush(): void;
}

export class TstdlEffectScheduler implements EffectScheduler, FlushableEffectRunner {
  private readonly queue = new Set<SchedulableEffect>();

  private pendingFlush = false;

  scheduleEffect(effect: SchedulableEffect): void {
    this.queue.add(effect);

    if (!this.pendingFlush) {
      this.pendingFlush = true;

      queueMicrotask(() => {
        this.pendingFlush = false;
        this.flush();
      });
    }
  }

  flush(): void {
    for (const effect of this.queue) {
      this.queue.delete(effect);
      effect.run();
    }
  }
}


/**
 * Core reactive node for an Angular effect.
 *
 * `EffectHandle` combines the reactive graph's `Watch` base node for effects with the framework's
 * scheduling abstraction (`EffectScheduler`) as well as automatic cleanup via `DestroyRef` if
 * available/requested.
 */
class EffectHandle implements EffectRef, SchedulableEffect {
  protected watcher: Watch;

  constructor(private scheduler: EffectScheduler, private effectFn: (onCleanup: EffectCleanupRegisterFn) => void, allowSignalWrites: boolean) {
    this.watcher = createWatch((onCleanup) => this.runEffect(onCleanup), () => this.schedule(), allowSignalWrites);
  }

  private runEffect(onCleanup: WatchCleanupRegisterFn): void {
    this.effectFn(onCleanup);
  }

  run(): void {
    this.watcher.run();
  }

  private schedule(): void {
    this.scheduler.scheduleEffect(this);
  }

  notify(): void {
    this.watcher.notify();
  }

  destroy(): void {
    this.watcher.destroy();

    // Note: if the effect is currently scheduled, it's not un-scheduled, and so the scheduler will
    // retain a reference to it. Attempting to execute it will be a no-op.
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

const effectScheduler = new TstdlEffectScheduler();

/**
 * Create a global `Effect` for the given reactive function.
 */
export function effect(
  effectFn: (onCleanup: EffectCleanupRegisterFn) => void,
  options?: CreateEffectOptions): EffectRef {
  assertNotInReactiveContext(effect, 'Call `effect` outside of a reactive context. For example, schedule the effect inside the component constructor.');

  const handle = new EffectHandle(effectScheduler, effectFn, options?.allowSignalWrites ?? false);

  handle.notify();

  return handle;
}
