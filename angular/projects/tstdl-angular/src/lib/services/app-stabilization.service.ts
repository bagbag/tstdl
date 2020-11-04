import { ApplicationRef, Injectable, NgZone } from '@angular/core';
import { Observable } from 'rxjs';
import { distinctUntilChanged, first, mapTo, shareReplay } from 'rxjs/operators';
import { runInZone } from '../utils/rxjs';

@Injectable({
  providedIn: 'root'
})
export class AppStabilizationService {
  private readonly applicationRef: ApplicationRef;
  private readonly ngZone: NgZone;

  readonly state$: Observable<boolean>;

  constructor(applicationRef: ApplicationRef, ngZone: NgZone) {
    this.applicationRef = applicationRef;
    this.ngZone = ngZone;

    this.state$ = this.subscribeState();
  }

  private subscribeState(): Observable<boolean> {
    return this.applicationRef.isStable.pipe(
      runInZone(this.ngZone),
      distinctUntilChanged(),
      shareReplay({ bufferSize: 1, refCount: true })
    )
  }

  wait$(state: boolean = true): Observable<void> {
    return this.state$.pipe(
      first((isStable) => isStable == state),
      mapTo(undefined)
    );
  }

  async wait(state: boolean = true): Promise<void> {
    return this.wait$(state).toPromise();
  }
}
