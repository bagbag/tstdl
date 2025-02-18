import { Subject, type Observable } from 'rxjs';

import { CancellationToken } from '#/cancellation/token.js';
import { DeferredPromise } from '#/promise/deferred-promise.js';
import { cancelableTimeout } from './timing.js';

export class PeriodicReporter {
  private readonly reportSubject: Subject<number>;
  private readonly interval: number;
  private readonly ignoreZero: boolean;
  private readonly resetAfterReport: boolean;
  private readonly stopToken: CancellationToken;
  private readonly stopped: DeferredPromise;

  private running: boolean;
  private counter: number;
  private stopRequested: boolean;

  get report(): Observable<number> {
    return this.reportSubject.asObservable();
  }

  constructor(interval: number, ignoreZero: boolean, resetAfterReport: boolean) {
    this.interval = interval;
    this.ignoreZero = ignoreZero;
    this.resetAfterReport = resetAfterReport;
    this.running = false;

    this.stopToken = new CancellationToken();
    this.stopped = new DeferredPromise();
    this.reportSubject = new Subject();
  }

  increase(count: number): void {
    this.counter += count;
  }

  run(): void {
    if (this.running) {
      throw new Error('already started');
    }

    this.running = true;

    void (async () => {
      this.counter = 0;
      this.stopRequested = false;
      this.stopToken.unset();
      this.stopped.reset();

      while (!this.stopRequested) { // eslint-disable-line @typescript-eslint/no-unnecessary-condition
        await cancelableTimeout(this.interval, this.stopToken);

        if (!this.stopRequested && (!this.ignoreZero || (this.counter > 0))) { // eslint-disable-line @typescript-eslint/no-unnecessary-condition
          this.emitReport(this.resetAfterReport);
        }
      }

      this.running = false;
      this.stopped.resolve();
    })();
  }

  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    this.stopRequested = true;
    this.stopToken.set();
    await this.stopped;
  }

  private emitReport(resetAfterReport: boolean): void {
    this.reportSubject.next(this.counter);

    if (resetAfterReport) {
      this.counter = 0;
    }
  }
}
