import type { MonoTypeOperatorFunction, Observable } from 'rxjs';
import { switchMapTo } from 'rxjs/operators';
import type { AppStabilizationService } from '../../services';

export function waitForAppStabilization<T>(appStabilizationService: AppStabilizationService): MonoTypeOperatorFunction<T> {
  return function waitForAppStabilization<T>(source: Observable<T>): Observable<T> { // eslint-disable-line @typescript-eslint/no-shadow
    return appStabilizationService.wait$().pipe(switchMapTo(source)); // eslint-disable-line @typescript-eslint/no-unsafe-argument
  };
}
