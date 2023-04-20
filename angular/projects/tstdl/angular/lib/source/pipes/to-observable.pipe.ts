import type { PipeTransform } from '@angular/core';
import { Pipe } from '@angular/core';
import type { Observable } from 'rxjs';
import type { Signal } from '../signals';
import { toObservable } from '../signals';

@Pipe({
  name: 'toObservable',
  standalone: true
})
export class ToObservablePipe implements PipeTransform {
  private source: Signal<any> | undefined;
  private observable: Observable<any> | undefined;

  transform<T>(source: Signal<T>): Observable<T> {
    if (source != this.source) {
      this.source = source;
      this.observable = toObservable(source);
    }

    return this.observable as Observable<T>;
  }
}
