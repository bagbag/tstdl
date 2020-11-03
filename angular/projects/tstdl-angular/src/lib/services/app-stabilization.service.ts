import { ApplicationRef, Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { first, mapTo } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AppStabilizationService {
  private readonly applicationRef: ApplicationRef;
  private readonly ngZone: NgZone;

  private readonly stateSubject: BehaviorSubject<boolean>;

  readonly state$: Observable<boolean>;

  constructor(applicationRef: ApplicationRef, ngZone: NgZone) {
    this.applicationRef = applicationRef;
    this.ngZone = ngZone;

    this.stateSubject = new BehaviorSubject<boolean>(false);
    this.state$ = this.stateSubject.asObservable();

    this.subscribeState();
  }

  private subscribeState() {
    this.applicationRef.isStable.subscribe({
      next: (state) => this.ngZone.run(() => this.stateSubject.next(state)),
      complete: () => this.ngZone.run(() => this.stateSubject.complete()),
      error: (error) => this.ngZone.run(() => this.stateSubject.error(error))
    });
  }

  wait$(state: boolean = true): Observable<void> {
    return this.stateSubject.pipe(
      first((isStable) => isStable == state),
      mapTo(undefined)
    );
  }

  async wait(state: boolean = true): Promise<void> {
    return this.wait$(state).toPromise();
  }
}
