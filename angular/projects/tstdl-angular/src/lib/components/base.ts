import { Component, OnDestroy } from '@angular/core';
import type { Observable } from 'rxjs';
import { Subject } from 'rxjs';

@Component({ template: '' })
export class ComponentBase implements OnDestroy {
  private readonly destroySubject: Subject<void>;

  readonly destroy$: Observable<void>;

  constructor() {
    this.destroySubject = new Subject();
    this.destroy$ = this.destroySubject.asObservable();
  }

  ngOnDestroy(): void {
    this.destroySubject.next();
    this.destroySubject.complete();
  }
}
