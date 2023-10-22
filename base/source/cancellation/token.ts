import type { Observable, Observer, Subscribable, Unsubscribable } from 'rxjs';
import { BehaviorSubject, defer, filter, first, firstValueFrom, from, fromEvent, isObservable, map, skip, take } from 'rxjs';

import { noopOperator } from '#/rxjs/noop.js';
import { noop } from '../utils/noop.js';
import { isBoolean } from '../utils/type-guards.js';

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

export class CancellationSignal implements PromiseLike<void>, Subscribable<void> {
  readonly #stateSubject: BehaviorSubject<boolean>;

  /**
   * Observable which emits the current state and every state change.
   */
  readonly state$ = defer(() => this.#stateSubject);

  /**
   * Observable which emits when this token is set.
   */
  readonly set$ = this.state$.pipe(filter((state) => state), map(() => undefined));

  /**
   * Observable which emits when this token is unset.
   */
  readonly unset$ = this.state$.pipe(filter((state) => !state), map(() => undefined));

  /**
   * Returns a promise which is resolved when this token changes its state.
   */
  get $state(): Promise<boolean> {
    return firstValueFrom(this.state$.pipe(skip(1)));
  }

  /**
   * Returns a promise which is resolved when this token is set.
   */
  get $set(): Promise<void> {
    return firstValueFrom(this.set$);
  }

  /**
   * Returns a promise which is resolved when this token is unset.
   */
  get $unset(): Promise<void> {
    return firstValueFrom(this.unset$);
  }

  get state(): boolean {
    return this.#stateSubject.value;
  }

  /**
   * Whether this token is set.
   */
  get isSet(): boolean {
    return this.#stateSubject.value;
  }

  /**
   * Whether this token is unset.
   */
  get isUnset(): boolean {
    return !this.#stateSubject.value;
  }

  constructor(stateSubject: BehaviorSubject<boolean>) {
    this.#stateSubject = stateSubject;
  }

  /**
   * Returns an AbortSignal.
   */
  asAbortSignal(): AbortSignal {
    const abortController = new AbortController();

    this.set$.pipe(first()).subscribe(() => abortController.abort());

    return abortController.signal;
  }

  /**
   * Create a new token and connect it to this instance.
   * @see {@link connect}
   */
  createChild(config?: ConnectConfig): CancellationToken {
    const child = new CancellationToken(); // eslint-disable-line @typescript-eslint/no-use-before-define
    this.connect(child, config);

    return child;
  }

  /**
   * Propagate events from this instance to `target`. Events from the `target` are *not* propagated to this instance.
   * @param target receiver to connect
   */
  connect(target: CancellationToken, config?: ConnectConfig): void {
    CancellationToken.connect(this.state$, target, config); // eslint-disable-line @typescript-eslint/no-use-before-define
  }

  async then<TResult>(onfulfilled?: ((value: void) => TResult | PromiseLike<TResult>) | undefined | null): Promise<TResult> {
    await this.$set;
    return onfulfilled?.() as TResult;
  }

  subscribe(observer: Partial<Observer<void>>): Unsubscribable {
    return this.set$.subscribe(observer);
  }
}

export class CancellationToken extends CancellationSignal {
  readonly #stateSubject: BehaviorSubject<boolean>;

  #signal: CancellationSignal | undefined;

  /** Signal for this token */
  get signal(): CancellationSignal {
    return (this.#signal ??= new CancellationSignal(this.#stateSubject));
  }

  /**
   * @param initialState which state to initialze this token to
   * - `false`: unset
   * - `true`: set
   * @default false
   */
  constructor(initialState: boolean = false) {
    const stateSubject = new BehaviorSubject(initialState);

    super(stateSubject);

    this.#stateSubject = stateSubject;
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

  static connect(state$: Observable<boolean>, target: CancellationToken, config: ConnectConfig = {}): void {
    const { set = true, unset = true, complete = true, error = true, immediate = true, once = false } = config;

    const stateObservable = state$
      .pipe(
        immediate ? noopOperator() : skip(1),
        (set && unset) ? noopOperator() : set ? filter((state) => state) : unset ? filter((state) => !state) : filter(() => false),
        once ? take(1) : noopOperator()
      );

    const subscription = stateObservable.subscribe({
      next: (state) => target.setState(state),
      error: error ? ((errorValue) => target.error(errorValue as Error)) : noop,
      complete: complete ? (() => target.complete()) : noop
    });

    target.#stateSubject.subscribe({
      error: () => subscription.unsubscribe(),
      complete: () => subscription.unsubscribe()
    });
  }

  /**
   * Become a child of the provided parent. Events from the parent are propagated to this token. Events from this token are *not* propagated to the parent.
   */
  inherit(parent: CancellationToken | CancellationSignal, config?: ConnectConfig): this {
    const { state$ } = (parent instanceof CancellationToken) ? parent.signal : parent;

    CancellationToken.connect(state$, this, config);
    return this;
  }

  /**
   * Set this token.
   */
  set(): void {
    this.setState(true);
  }

  /**
   * Unset this token.
   */
  unset(): void {
    this.setState(false);
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
}

// export { CancellationSignal as ReadonlyCancellationToken };
