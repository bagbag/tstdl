import type { Observable } from 'rxjs';
import { BehaviorSubject } from 'rxjs';
import { distinctUntilChanged, filter, mapTo, skip, take } from 'rxjs/operators';

type InheritanceMode = 'set' | 'reset' | 'both';

export class CancellationToken implements PromiseLike<void> {
  private readonly stateSubject: BehaviorSubject<boolean>;

  readonly state$: Observable<boolean>;

  get isSet(): boolean {
    return this.stateSubject.value;
  }

  get set$(): Observable<void> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return this.state$.pipe(filter((state) => state), mapTo(undefined));
  }

  get reset$(): Observable<void> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return this.state$.pipe(filter((state) => !state), mapTo(undefined));
  }

  get $set(): Promise<void> {
    return this.set$.pipe(take(1)).toPromise();
  }

  get $reset(): Promise<void> {
    return this.reset$.pipe(take(1)).toPromise();
  }

  constructor() {
    this.stateSubject = new BehaviorSubject<boolean>(false);
    this.state$ = this.stateSubject.pipe(distinctUntilChanged());
  }

  createChild(mode: InheritanceMode): CancellationToken {
    const token = new CancellationToken();
    this.connect(mode, this, token);

    return token;
  }

  inherit(token: CancellationToken, mode: InheritanceMode): void {
    this.connect(mode, token, this);
  }

  set(): void {
    this.stateSubject.next(true);
  }

  reset(): void {
    this.stateSubject.next(false);
  }

  // eslint-disable-next-line @typescript-eslint/promise-function-async
  then<TResult1, TResult2 = never>(onfulfilled?: ((value: void) => TResult1 | PromiseLike<TResult1>) | null | undefined, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null | undefined): Promise<TResult1 | TResult2> {
    return this.$set.then(onfulfilled, onrejected);
  }

  // eslint-disable-next-line class-methods-use-this
  private connect(mode: string, source: CancellationToken, target: CancellationToken): void {
    const sourceValue$ = source.state$.pipe(skip(1));

    switch (mode) {
      case 'set':
        sourceValue$.pipe(filter((state) => state)).subscribe(target.stateSubject);
        break;

      case 'reset':
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
