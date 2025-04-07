import { CdkConnectedOverlay } from '@angular/cdk/overlay';
import { Directive, effect, inject, input, type OnInit } from '@angular/core';
import type { TslMenuOrigin } from './menu-origin.directive';

@Directive({
  selector: '[tslMenuOverlay]',
  hostDirectives: [CdkConnectedOverlay]
})
export class TslMenuOverlay implements OnInit {
  readonly #cdkConnectedOverlay = inject(CdkConnectedOverlay);

  readonly tslMenuOverlayOrigin = input<TslMenuOrigin>();

  constructor() {
    console.log(CdkConnectedOverlay)

    this.#cdkConnectedOverlay.hasBackdrop = true;
    this.#cdkConnectedOverlay.growAfterOpen = true;
    this.#cdkConnectedOverlay.push = true;
    this.#cdkConnectedOverlay.flexibleDimensions = true;
    this.#cdkConnectedOverlay.backdropClass = 'cdk-overlay-transparent-backdrop';
    this.#cdkConnectedOverlay.viewportMargin = 5;

    effect(() => this.#cdkConnectedOverlay.origin = this.tslMenuOverlayOrigin()!);

    effect(() => {
      if (this.tslMenuOverlayOrigin()?.isOpen()) {
        this.#cdkConnectedOverlay.attachOverlay();
      } else {
        this.#cdkConnectedOverlay.detachOverlay();
      }
    });
  }

  ngOnInit(): void {
    this.#cdkConnectedOverlay.backdropClick.subscribe(() => {
      this.tslMenuOverlayOrigin()?.isOpen.set(false);
    });
  }
}
