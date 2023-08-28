import type { Observable, Observer, Subscribable, Subscription, Unsubscribable } from 'rxjs';
import { BehaviorSubject, distinctUntilChanged, filter, first, firstValueFrom, from, fromEvent, isObservable, map, skip, take } from 'rxjs';

import { noopOperator } from '#/rxjs/noop.js';
import { noop } from './noop.js';
import { isBoolean } from './type-guards.js';

export type ConnectConfig = {
  /**
   * Propagate parent set to child.
   * @default true
   */
  set?: boolean,

  /**
   * Propagate unset to child.
   * @default true
   */
  unset?: boolean,

  /**
   * Propagate complete to child.
   * @default true
   */
  complete?: boolean,

  /**
   * Propagate errors to child.
   * @default true
   */
  error?: boolean,

  /**
   * Update state immediately and don't wait for next state change.
   * @default true
   */
  immediate?: boolean,

  /**
   * Only update the state once (if immediate is also true it basically just sets the same value).
   * @default false
   */
  once?: boolean
};

export abstract class ReadonlyCancellationToken implements PromiseLike<void>, Subscribable<void> {
  /**
   * Returns whether this token set.
   */
  abstract readonly isSet: boolean;

  /**
   * Returns whether this token unset.
   */
  abstract readonly isUnset: boolean;

  /**
   * Observable which emits the current state and every state change.
   */
  abstract readonly state$: Observable<boolean>;

  /**
   * Observable which emits when this token is set.
   */
  abstract readonly set$: Observable<void>;

  /**
   * Observable which emits when this token is unset.
   */
  abstract readonly unset$: Observable<void>;

  /**
   * Returns a promise which is resolved when this token is set.
   */
  abstract readonly $set: Promise<void>;

  /**
   * Returns a promise which is resolved when this token is unset.
   */
  abstract readonly $unset: Promise<void>;

  /**
   * Returns a promise which is resolved when this token changes its state.
   */
  abstract readonly $state: Promise<boolean>;

  /**
   * Returns an AbortSignal.
   */
  abstract asAbortSignal(): AbortSignal;

  /**
   * Create a new token and connect it to this instance.
   * @see {@link connect}
   */
  abstract createChild(config?: ConnectConfig): CancellationToken;

  /**
   * Propagate events from this instance to the `child`. Events from the `child` are *not* propagated to this instance.
   * @param child child to connect
   */
  abstract connect(child: CancellationToken, config?: ConnectConfig): void;

  abstract subscribe(observer: Partial<Observer<void>>): Unsubscribable;

  abstract then<TResult>(onfulfilled?: ((value: void) => TResult | PromiseLike<TResult>) | undefined | null): Promise<TResult>;
}

export class CancellationToken extends ReadonlyCancellationToken {
  readonly #stateSubject = new BehaviorSubject<boolean>(false);

  readonly state$ = this.#stateSubject.pipe(distinctUntilChanged());
  readonly set$ = this.state$.pipe(filter((state) => state), map(() => undefined));
  readonly unset$ = this.state$.pipe(filter((state) => !state), map(() => undefined));

  get isSet(): boolean {
    return this.#stateSubject.value;
  }

  get isUnset(): boolean {
    return !this.#stateSubject.value;
  }

  get $set(): Promise<void> {
    return firstValueFrom(this.set$);
  }

  get $unset(): Promise<void> {
    return firstValueFrom(this.unset$);
  }

  get $state(): Promise<boolean> {
    return firstValueFrom(this.state$.pipe(skip(1)));
  }

  /**
   * @param initialState which state to initialze this token to
   * - `false`: unset
   * - `true`: set
   * @default false
   */
  constructor(initialState: boolean = false) {
    super();

    this.#stateSubject.next(initialState);
  }

  /**
   * Creates a token and sets it whenever the source signals
   * @param source source to listen to
   * @param complete complete token after signal
   */
  static from(source: AbortSignal | PromiseLike<any> | Observable<void>, options?: { complete?: boolean }): CancellationToken;
  /**
   * Creates a token and connects the source to its next, error and complete.
   * @param observable observable to subscribe. Takes emitted value as state if type is boolean otherwise sets state to true.
   */
  static from(source: Observable<boolean>, config?: ConnectConfig): CancellationToken;
  static from(source: AbortSignal | PromiseLike<any> | Observable<void | boolean>, config?: ConnectConfig): CancellationToken {
    const source$ =
      (source instanceof AbortSignal) ? fromEvent(source, 'abort', () => true)
        : isObservable(source) ? source.pipe(map((state) => (isBoolean(state) ? state : true)))
          : from(source).pipe(map(() => true));

    const token = new CancellationToken();
    CancellationToken.connect(source$, token, config);

    return token;
  }

  private static connect(stateObservable: Observable<boolean>, target: CancellationToken, config: ConnectConfig = {}): void {
    const { set = true, unset = true, complete = true, error = true, immediate = true, once = false } = config;

    const state$ = stateObservable
      .pipe(
        immediate ? noopOperator() : skip(1),
        (set && unset) ? noopOperator() : set ? filter((state) => state) : unset ? filter((state) => !state) : filter(() => false),
        once ? take(1) : noopOperator()
      );

    const subscription = state$.subscribe({
      next: (state) => target.setState(state),
      error: error ? ((errorValue) => target.error(errorValue as Error)) : noop,
      complete: complete ? (() => target.complete()) : noop
    });

    target.#stateSubject.subscribe({
      error: () => subscription.unsubscribe(),
      complete: () => subscription.unsubscribe()
    });
  }

  asAbortSignal(): AbortSignal {
    const abortController = new AbortController();
    this.set$.pipe(first()).subscribe(() => abortController.abort());

    return abortController.signal;
  }

  asReadonly(): ReadonlyCancellationToken {
    return this;
  }

  createChild(config?: ConnectConfig): CancellationToken {
    const child = new CancellationToken();
    this.connect(child, config);

    return child;
  }

  connect(child: CancellationToken, config?: ConnectConfig): void {
    CancellationToken.connect(this.state$, child, config);
  }

  /**
   * Become a child of the provided parent. Events from the parent are propagated to this token. Events from this token are *not* propagated to the parent.
   */
  inherit(parent: ReadonlyCancellationToken, config?: ConnectConfig): this {
    CancellationToken.connect(parent.state$, this, config);
    return this;
  }

  /**
   * Set this token.
   */
  set(): void {
    this.#stateSubject.next(true);
  }

  /**
   * Unset this token.
   */
  unset(): void {
    this.#stateSubject.next(false);
  }

  /**
   * Set the state.
   */
  setState(state: boolean): void {
    this.#stateSubject.next(state);
  }

  /**
   * Errors the token.
   */
  error(error: Error): void {
    this.#stateSubject.error(error);
  }

  /**
   * Clean up subscriptions.
   *
   * Keep in mind that *active* awaits (promise) on this token will throw.
   */
  complete(): void {
    this.#stateSubject.complete();
  }

  async then<TResult>(onfulfilled?: ((value: void) => TResult | PromiseLike<TResult>) | undefined | null): Promise<TResult> {
    await this.$set;
    return onfulfilled?.() as TResult;
  }

  subscribe(observer: Partial<Observer<void>>): Subscription {
    return this.set$.subscribe(observer);
  }
}
