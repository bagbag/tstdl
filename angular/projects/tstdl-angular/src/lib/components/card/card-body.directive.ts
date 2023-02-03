import { Directive, HostBinding, Input } from '@angular/core';

@Directive({
  selector: '[tslCardBody]'
})
export class CardBodyDirective {
  @HostBinding('class.-mx-6')
  @Input() noHorizontalPadding: boolean;

  @HostBinding('class.-mb-5')
  @Input() noBottomPadding: boolean;

  constructor() {
    this.noHorizontalPadding = false;
    this.noBottomPadding = false;
  }
}
