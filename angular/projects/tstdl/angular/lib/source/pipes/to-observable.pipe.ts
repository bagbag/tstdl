import type { PipeTransform, Signal } from '@angular/core';
import { Injector, Pipe, inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import type { Observable } from 'rxjs';

@Pipe({
  name: 'toObservable',
  standalone: true
})
export class ToObservablePipe implements PipeTransform {
  private readonly injector = inject(Injector);

  private source: Signal<any> | undefined;
  private observable: Observable<any> | undefined;

  transform<T>(source: Signal<T>): Observable<T> {
    if (source != this.source) {
      this.source = source;
      this.observable = toObservable(source, { injector: this.injector });
    }

    return this.observable as Observable<T>;
  }
}
