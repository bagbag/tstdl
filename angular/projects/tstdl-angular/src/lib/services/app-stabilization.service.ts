import { ApplicationRef, Injectable, NgZone } from '@angular/core';
import { Observable } from 'rxjs';
import { first } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AppStabilizationService {
  private readonly applicationRef: ApplicationRef;
  private readonly ngZone: NgZone;

  constructor(applicationRef: ApplicationRef, ngZone: NgZone) {
    this.applicationRef = applicationRef;
    this.ngZone = ngZone;

    ngZone.onError.subscribe((error: any) => console.log(error));
  }

  wait$(state: boolean = true): Observable<void> {
    return new Observable((subscriber) => {
      this.applicationRef.isStable.pipe(first((isStable) => isStable == state)).subscribe({
        next: () => this.ngZone.run(() => subscriber.next()),
        complete: () => this.ngZone.run(() => subscriber.complete()),
        error: (error) => this.ngZone.run(() => subscriber.error(error))
      });
    });
  }

  async wait(state: boolean = true): Promise<void> {
    return this.wait$(state).toPromise();
  }
}
