import type { Observable } from 'rxjs';
import { BehaviorSubject } from 'rxjs';
import { distinctUntilChanged, filter, map, skip, take } from 'rxjs/operators';

type InheritanceMode = 'set' | 'reset' | 'both';

export class CancellationToken implements PromiseLike<void> {
  private readonly stateSubject: BehaviorSubject<boolean>;
  private readonly value$: Observable<boolean>;

  get isSet(): boolean {
    return this.stateSubject.value;
  }

  get set$(): Observable<void> {
    return this.value$.pipe(filter((state) => state), map(() => undefined));
  }

  get reset$(): Observable<void> {
    return this.value$.pipe(filter((state) => !state), map(() => undefined));
  }

  get setAwaitable(): Promise<void> {
    return this.set$.pipe(take(1)).toPromise();
  }

  get resetAwaitable(): Promise<void> {
    return this.reset$.pipe(take(1)).toPromise();
  }

  constructor() {
    this.stateSubject = new BehaviorSubject<boolean>(false);
    this.value$ = this.stateSubject.pipe(distinctUntilChanged());
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
    return this.setAwaitable.then(onfulfilled, onrejected);
  }

  // eslint-disable-next-line class-methods-use-this
  private connect(mode: string, source: CancellationToken, target: CancellationToken): void {
    const sourceValue$ = source.value$.pipe(skip(1));

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
