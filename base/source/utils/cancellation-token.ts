import { firstValueFrom } from '#/rxjs/compat';
import type { Observable, Observer, Subscribable, Unsubscribable } from 'rxjs';
import { BehaviorSubject } from 'rxjs';
import { distinctUntilChanged, filter, mapTo, skip, take } from 'rxjs/operators';

type InheritanceMode = 'set' | 'unset' | 'both';

export class CancellationToken implements PromiseLike<void>, Subscribable<void> {
  private readonly stateSubject: BehaviorSubject<boolean>;

  /**
   * observable which emits the current state and every state change
   */
  readonly state$: Observable<boolean>;

  /**
   * returns whether this token set
   */
  get isSet(): boolean {
    return this.stateSubject.value;
  }

  /**
   * returns whether this token unset
   */
  get isUnset(): boolean {
    return !this.stateSubject.value;
  }

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
  get $set(): Promise<void> {
    return firstValueFrom(this.set$);
  }

  /**
   * returns a promise which is resolved whenever this token is unset
   */
  get $unset(): Promise<void> {
    return firstValueFrom(this.unset$);
  }

  /**
   * returns a promise which is resolved whenever this token changes is state
   */
  get $state(): Promise<boolean> {
    return firstValueFrom(this.state$.pipe(skip(1)));
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
   */
  static fromPromise(promise: PromiseLike<any>): CancellationToken {
    const token = new CancellationToken();

    void (async () => {
      await promise;
      token.set();
    })();

    return token;
  }

  /**
   * creates a token and sets it whenever the observable emits
   * @param observable observable to subscribe
   * @param once unsubscribe after first emit if true
   */
  static fromObservable(observable: Observable<void>, once: boolean = false): CancellationToken {
    const token = new CancellationToken();

    (once ? observable.pipe(take(1)) : observable).subscribe(() => token.set());

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

  async then<TResult>(onfulfilled?: ((value: void) => TResult | PromiseLike<TResult>) | undefined | null): Promise<TResult> {
    await this.$set;
    return onfulfilled?.() as TResult;
  }

  subscribe(observer: Partial<Observer<void>>): Unsubscribable {
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
