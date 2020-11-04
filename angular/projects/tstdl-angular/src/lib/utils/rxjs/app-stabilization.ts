import { NgZone } from '@angular/core';
import { MonoTypeOperatorFunction, Observable } from 'rxjs';
import { switchMapTo } from 'rxjs/operators';
import { AppStabilizationService } from '../../services';

export function waitForAppStabilization<T>(appStabilizationService: AppStabilizationService): MonoTypeOperatorFunction<T> {
  return function <T>(source: Observable<T>): Observable<T> {
    return appStabilizationService.wait$().pipe(
      switchMapTo(source)
    );
  }
}
