/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import type { Consumer, Edge, ProducerId } from './graph';
import { consumerPollValueStatus, nextReactiveId, setActiveConsumer } from './graph';

/**
 * Watches a reactive expression and allows it to be scheduled to re-run
 * when any dependencies notify of a change.
 *
 * `Watch` doesn't run reactive expressions itself, but relies on a consumer-
 * provided scheduling operation to coordinate calling `Watch.run()`.
 */
export class Watch implements Consumer {
  private dirty = false;

  readonly id = nextReactiveId();
  readonly ref = new WeakRef(this);
  readonly producers = new Map<ProducerId, Edge>();
  trackingVersion = 0;

  constructor(private readonly watch: () => void, private readonly schedule: (watch: Watch) => void) { }

  notify(): void {
    if (!this.dirty) {
      this.schedule(this);
    }
    this.dirty = true;
  }

  /**
   * Execute the reactive expression in the context of this `Watch` consumer.
   *
   * Should be called by the user scheduling algorithm when the provided
   * `schedule` hook is called by `Watch`.
   */
  run(): void {
    this.dirty = false;
    if (this.trackingVersion !== 0 && !consumerPollValueStatus(this)) {
      return;
    }

    const prevConsumer = setActiveConsumer(this);
    this.trackingVersion++;

    try {
      this.watch();
    }
    finally {
      setActiveConsumer(prevConsumer);
    }
  }
}
