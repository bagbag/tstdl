import { Subject, type Observable } from 'rxjs';

export class ObservableFinalizationRegistry<T> extends FinalizationRegistry<T> {
  private readonly finalizeSubject: Subject<T>;

  readonly finalize$: Observable<T>;

  constructor() {
    super((value) => this.finalizeSubject.next(value));

    this.finalizeSubject = new Subject();
    this.finalize$ = this.finalizeSubject.asObservable();
  }
}
