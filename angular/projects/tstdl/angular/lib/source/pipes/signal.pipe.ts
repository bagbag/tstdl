import type { OnDestroy, PipeTransform } from '@angular/core';
import { ChangeDetectorRef, Pipe } from '@angular/core';
import type { EffectRef, Signal } from '../signals';
import { effect } from '../signals';

@Pipe({
  name: 'signal',
  standalone: true,
  pure: false
})
export class SignalPipe implements PipeTransform, OnDestroy {
  private readonly changeDetector: ChangeDetectorRef;

  private currentSignal: Signal<any> | undefined;
  private effectRef: EffectRef | undefined;

  constructor(changeDetector: ChangeDetectorRef) {
    this.changeDetector = changeDetector;
  }

  ngOnDestroy(): void {
    this.effectRef?.destroy();
  }

  transform<T>(signal: Signal<T>): T {
    if (signal != this.currentSignal) {
      this.currentSignal = signal;
      this.effectRef?.destroy();

      let first = true;

      this.effectRef = effect(() => {
        signal();

        if (!first) {
          this.changeDetector.markForCheck();
        }
        else {
          first = false;
        }
      });
    }

    return signal();
  }
}
