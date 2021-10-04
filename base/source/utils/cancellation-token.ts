import { noopOperator } from '#/rxjs';
import { firstValueFrom } from '#/rxjs/compat';
import type { Observable, Observer, Subscribable, Subscription } from 'rxjs';
import { BehaviorSubject, distinctUntilChanged, filter, from, map, mapTo, skip, take } from 'rxjs';
import { noop } from './helpers';
import { isBoolean } from './type-guards';

export type ConnectConfig = {
  /**
   * propagate parent set to child
   * @default true
   */
  set?: boolean,

  /**
   * propagate unset to child
   * @default true
   */
  unset?: boolean,

  /**
   * propagate complete to child
   * @default true
   */
  complete?: boolean,

  /**
   * propagate errors to child
   * @default true
   */
  error?: boolean,

  /**
   * update state immediately and don't first for next state change
   * @default true
   */
  immediate?: boolean,

  /**
   * only update the state once (if immediate is also true it basically just sets the same value)
   * @default false
   */
  once?: boolean
};

export interface ReadonlyCancellationToken extends PromiseLike<void>, Subscribable<void> {
  /**
   * returns whether this token set
   */
  readonly isSet: boolean;

  /**
   * returns whether this token unset
   */
  readonly isUnset: boolean;

  /**
   * observable which emits the current state and every state change
   */
  readonly state$: Observable<boolean>;

  /**
   * observable which emits when this token is set
   */
  readonly set$: Observable<void>;

  /**
   * observable which emits when this token is unset
   */
  readonly unset$: Observable<void>;

  /**
   * returns a promise which is resolved when this token is set
   */
  readonly $set: Promise<void>;

  /**
   * returns a promise which is resolved when this token is unset
   */
  readonly $unset: Promise<void>;

  /**
   * returns a promise which is resolved when this token changes its state
   */
  readonly $state: Promise<boolean>;

  /**
   * create a new token and connect it to this instance
   * @see {@link connect}
   */
  createChild(config?: ConnectConfig): CancellationToken;

  /**
   * propagate events from this instance to the `child`. Events from the `child` are *not* propagated to this instance
   * @param child child to connect
   */
  connect(child: CancellationToken, config?: ConnectConfig): void;
}

export class CancellationToken implements ReadonlyCancellationToken {
  private readonly stateSubject: BehaviorSubject<boolean>;

  readonly state$: Observable<boolean>;
  readonly set$: Observable<void>;
  readonly unset$: Observable<void>;

  get isSet(): boolean {
    return this.stateSubject.value;
  }

  get isUnset(): boolean {
    return !this.stateSubject.value;
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

  get readonly(): ReadonlyCancellationToken {
    return this;
  }

  /**
   * @param initialState which state to initialze this token to
   * - `false`: unset
   * - `true`: set
   * @default false
   */
  constructor(initialState: boolean = false) {
    this.stateSubject = new BehaviorSubject<boolean>(initialState);
    this.state$ = this.stateSubject.pipe(distinctUntilChanged());
    this.set$ = this.state$.pipe(filter((state) => state), mapTo(undefined)); // eslint-disable-line @typescript-eslint/no-unsafe-argument
    this.unset$ = this.state$.pipe(filter((state) => !state), mapTo(undefined)); // eslint-disable-line @typescript-eslint/no-unsafe-argument
  }

  /**
   * creates a token and sets it whenever the promise is resolved
   * @param promise promise to await
   * @param complete complete token after resolve
   */
  static fromPromise(promise: PromiseLike<any>, complete: boolean = true): CancellationToken {
    const token = new CancellationToken();
    CancellationToken.connect(from(promise).pipe(mapTo(true)), token, { complete });

    return token;
  }

  /**
   * creates a token and connets its next, error and complete
   * @param observable observable to subscribe. Takes emitted value as state if type is boolean otherwise sets state to true
   */
  static fromObservable(observable: Observable<void | boolean>, config?: ConnectConfig): CancellationToken {
    const token = new CancellationToken();
    const source$ = observable.pipe(map((state) => (isBoolean(state) ? state : true)));
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

    target.stateSubject.subscribe({
      error: () => subscription.unsubscribe(),
      complete: () => subscription.unsubscribe()
    });
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
   * become a child of the provided parent. Events from the parent are propagated to this token. Events from this token are *not* propagated to the parent
   */
  inherit(parent: ReadonlyCancellationToken, config?: ConnectConfig): this {
    CancellationToken.connect(parent.state$, this, config);
    return this;
  }

  /**
   * set this token
   */
  set(): void {
    this.stateSubject.next(true);
  }

  /**
   * unset this token
   */
  unset(): void {
    this.stateSubject.next(false);
  }

  /**
   * set the state
   */
  setState(state: boolean): void {
    this.stateSubject.next(state);
  }

  /**
   * errors the token
   */
  error(error: Error): void {
    this.stateSubject.error(error);
  }

  /**
   * clean up subscriptions
   *
   * keep in mind that *active* awaits (promise) on this token will throw
   */
  complete(): void {
    this.stateSubject.complete();
  }

  async then<TResult>(onfulfilled?: ((value: void) => TResult | PromiseLike<TResult>) | undefined | null): Promise<TResult> {
    await this.$set;
    return onfulfilled?.() as TResult;
  }

  subscribe(observer: Partial<Observer<void>>): Subscription {
    return this.set$.subscribe(observer);
  }
}
