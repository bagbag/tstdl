import { Directive, HostBinding, Input } from '@angular/core';

@Directive({
  selector: '[tslCardBody]',
  standalone: true
})
export class CardBodyDirective {
  @HostBinding('class.-tsl-mx-6')
  @Input() noHorizontalPadding: boolean;

  @HostBinding('class.-tsl-mb-5')
  @Input() noBottomPadding: boolean;

  constructor() {
    this.noHorizontalPadding = false;
    this.noBottomPadding = false;
  }
}
