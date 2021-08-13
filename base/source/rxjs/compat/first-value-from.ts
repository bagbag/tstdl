import type { Observable } from 'rxjs';
import { first } from 'rxjs/operators';

export async function firstValueFrom<T>(source: Observable<T>): Promise<T> {
  return source.pipe(first()).toPromise() as Promise<T>;
}
