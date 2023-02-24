import type { Record, StringMap } from '#/types.js';
import type { Observable } from 'rxjs';
import { debounceTime, defaultIfEmpty, firstValueFrom, merge, Subject, takeUntil } from 'rxjs';
import { CancellationToken } from './cancellation-token.js';
import { timeout } from './timing.js';
import { isDefined, isObject, isUndefined } from './type-guards.js';

const defaultDebounceTime = 5000;
const defaultRetryDelay = 10000;

export type PatchWorkerOptions<T extends StringMap> = {
  debounceTime?: number,
  retryDelay?: number,
  handleOn?: Observable<any>,
  completeOn?: Observable<any>,
  handler: (patch: Partial<T>) => void | Promise<void>,
  errorHandler?: (error: Error) => void | Promise<void>
};

export class PatchWorker<T extends Record> {
  private readonly patchAddedSubject: Subject<void>;
  private readonly handleSubject: Subject<void>;
  private readonly completeToken: CancellationToken;
  private readonly options: PatchWorkerOptions<T>;

  private patch: Partial<T> | undefined;

  constructor(options: PatchWorkerOptions<T>) {
    this.options = options;

    this.patchAddedSubject = new Subject();
    this.handleSubject = new Subject();
    this.completeToken = new CancellationToken();
    this.patch = undefined;

    if (isDefined(options.handleOn)) {
      this.handleOn(options.handleOn);
    }

    if (isDefined(options.completeOn)) {
      this.completeOn(options.completeOn);
    }

    void this.handleLoop();
  }

  handleOn(observable: Observable<any>): void {
    observable.pipe(takeUntil(this.completeToken)).subscribe(() => this.handle());
  }

  completeOn(observable: Observable<any>): void {
    observable.pipe(takeUntil(this.completeToken)).subscribe(() => this.complete());
  }

  add(patch: Partial<T>): void;
  add<P extends keyof T>(key: P, value: T[P]): void;
  add<P extends keyof T>(patchOrKey: Partial<T> | P, value?: T[P]): void {
    if (this.completeToken.isSet) {
      throw new Error('instance is completed');
    }

    if (isObject(patchOrKey)) {
      this.patch = { ...this.patch, ...patchOrKey };
    }
    else {
      this.patch = { ...this.patch, [patchOrKey]: value } as Partial<T>;
    }

    this.patchAddedSubject.next();
  }

  handle(): void {
    this.handleSubject.next();
  }

  complete(): void {
    this.patchAddedSubject.complete();
    this.handleSubject.next();
    this.handleSubject.complete();
    this.completeToken.set();
  }

  private async handleLoop(): Promise<void> {
    const debounce$ = this.patchAddedSubject.pipe(debounceTime(this.options.debounceTime ?? defaultDebounceTime));
    const handle$ = merge(debounce$, this.handleSubject).pipe(takeUntil(this.completeToken), defaultIfEmpty(undefined));

    let patch: Partial<T> | undefined;

    while (this.completeToken.isUnset || isDefined(patch) || isDefined(this.patch)) {
      await firstValueFrom(handle$);

      if (isUndefined(patch) && isUndefined(this.patch)) {
        continue;
      }

      patch = { ...patch, ...this.patch } as Partial<T>;
      this.patch = undefined;

      try {
        await this.options.handler(patch);
        patch = undefined;
      }
      catch (error: unknown) {
        await this.options.errorHandler?.(error as Error);
        await timeout(this.options.retryDelay ?? defaultRetryDelay);
      }
    }
  }
}
