import { CdkOverlayOrigin } from '@angular/cdk/overlay';
import { Directive, HostListener, model } from '@angular/core';

@Directive({
  selector: '[tslMenuOrigin]',
  exportAs: 'tslMenuOrigin',
  providers: [
    { provide: CdkOverlayOrigin, useExisting: TslMenuOrigin }
  ]
})
export class TslMenuOrigin extends CdkOverlayOrigin {
  readonly isOpen = model(false);

  open(): void {
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }

  @HostListener('click')
  toggle(): void {
    this.isOpen.update((open) => !open);
  }
}
