import { firstValueFrom } from '#/rxjs/compat';
import type { Observable, Observer, Subscribable, Subscription } from 'rxjs';
import { BehaviorSubject } from 'rxjs';
import { distinctUntilChanged, filter, mapTo, skip, take } from 'rxjs/operators';
import { iif } from './helpers';
import { isBoolean } from './type-guards';

type InheritanceMode = 'set' | 'unset' | 'both';

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
   * observable which emits whenever this token is set
   */
  readonly set$: Observable<void>;

  /**
   * observable which emits whenever this token is unset
   */
  readonly unset$: Observable<void>;

  /**
   * returns a promise which is resolved whenever this token is set
   */
  readonly $set: Promise<void>;

  /**
   * returns a promise which is resolved whenever this token is unset
   */
  readonly $unset: Promise<void>;

  /**
   * returns a promise which is resolved whenever this token changes is state
   */
  readonly $state: Promise<boolean>;
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
   *
   * - `false`: unset
   * - `true`: set
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

    void (async () => {
      try {
        await promise;
        token.set();

        if (complete) {
          token.complete();
        }
      }
      catch (error: unknown) {
        token.stateSubject.error(error);
      }
    })();

    return token;
  }

  /**
   * creates a token and connets its next, error and complete
   * @param observable observable to subscribe
   * @param once unsubscribe after first emit if true
   * @param complete complete token when observable completes
   */
  static fromObservable(observable: Observable<void | boolean>, options: { once?: boolean, complete?: boolean } = {}): CancellationToken {
    const { once = false, complete = true } = options;

    const token = new CancellationToken();
    const source = once
      ? observable.pipe(take(1))
      : observable;

    source.subscribe({
      next: (value) => token.setState(isBoolean(value) ? value : true),
      error: (error) => token.stateSubject.error(error),
      complete: () => iif(complete, () => token.complete(), () => undefined)
    });

    return token;
  }

  /**
   * create a new token and connect it to this instance
   * @see {@link connect}
   * @param mode which events to propagate
   */
  createChild(mode: InheritanceMode): CancellationToken {
    const child = new CancellationToken();
    this.connect(child, mode);

    return child;
  }

  /**
   * propagate events from this instance to the `child`. Events from the `child` are *not* propagated to this instance
   * @param child child to connect
   * @param mode which events to propagate
   */
  connect(child: CancellationToken, mode: InheritanceMode): void {
    this._connect(mode, this, child);
  }

  /**
   * become a child of the provided parent. Events from the parent are propagated to this token. Events from this token are *not* propagated to the parent
   *
   * * parent: the instance on which `createChild` is called on
   * @param mode which events to propagate
   */
  inherit(parent: CancellationToken, mode: InheritanceMode): void {
    this._connect(mode, parent, this);
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

  async then<TResult>(onfulfilled?: ((value: void) => TResult | PromiseLike<TResult>) | undefined | null): Promise<TResult> {
    await this.$set;
    return onfulfilled?.() as TResult;
  }

  subscribe(observer: Partial<Observer<void>>): Subscription {
    return this.set$.subscribe(observer);
  }

  /**
   * clean up subscriptions
   *
   * keep in mind that *active* awaits (promise) on this token will throw
   */
  complete(): void {
    this.stateSubject.complete();
  }

  private _connect(mode: InheritanceMode, source: CancellationToken, target: CancellationToken): void {
    const sourceValue$ = source.state$.pipe(skip(1));

    switch (mode) {
      case 'set':
        sourceValue$.pipe(filter((state) => state)).subscribe(target.stateSubject);
        break;

      case 'unset':
        sourceValue$.pipe(filter((state) => !state)).subscribe(target.stateSubject);
        break;

      case 'both':
        sourceValue$.subscribe(target.stateSubject);
        break;

      default:
        throw new Error('unsupported mode');
    }
  }
}
