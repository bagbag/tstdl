import { Directive, HostBinding, Input } from '@angular/core';

@Directive({
  selector: '[tslCardBody]',
  standalone: true
})
export class CardBodyDirective {
  @HostBinding('class.-tw-mx-6')
  @Input() noHorizontalPadding: boolean;

  @HostBinding('class.-tw-mb-5')
  @Input() noBottomPadding: boolean;

  constructor() {
    this.noHorizontalPadding = false;
    this.noBottomPadding = false;
  }
}
