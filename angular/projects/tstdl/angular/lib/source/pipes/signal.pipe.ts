import type { OnDestroy, PipeTransform } from '@angular/core';
import { ChangeDetectorRef, Pipe, inject } from '@angular/core';
import { ApplicationTickService } from '../services/application-tick.service';
import type { EffectRef, Signal } from '../signals';
import { effect } from '../signals';

@Pipe({
  name: 'signal',
  standalone: true,
  pure: false
})
export class SignalPipe implements PipeTransform, OnDestroy {
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly applicationTickService = inject(ApplicationTickService);

  private currentSignal: Signal<any> | undefined;
  private effectRef: EffectRef | undefined;

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
          this.applicationTickService.schedule();
        }
        else {
          first = false;
        }
      });
    }

    return signal();
  }
}
