import type { OnDestroy, PipeTransform } from '@angular/core';
import { ChangeDetectorRef, Pipe } from '@angular/core';
import type { Effect, Signal } from '../signals';
import { effect } from '../signals';

@Pipe({
  name: 'signal',
  standalone: true,
  pure: false
})
export class SignalPipe<T> implements PipeTransform, OnDestroy {
  private readonly changeDetector: ChangeDetectorRef;

  private currentSignal: Signal<T> | undefined;
  private currentEffect: Effect | undefined;

  constructor(changeDetector: ChangeDetectorRef) {
    this.changeDetector = changeDetector;
  }

  ngOnDestroy(): void {
    this.currentEffect?.destroy();
  }

  transform(signal: Signal<T>): T {
    if (signal != this.currentSignal) {
      this.currentSignal = signal;
      this.currentEffect?.destroy();

      let first = true;

      console.log('create effect');
      this.currentEffect = effect(() => {
        console.log('inside effect')
        signal();

        if (!first) {
          console.log('mark')
          this.changeDetector.markForCheck();
        }
        else {
          first = false;
        }
      });
    }

    console.log('return');
    return signal();
  }
}
