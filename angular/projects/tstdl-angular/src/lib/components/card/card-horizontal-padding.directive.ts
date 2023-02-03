import { Directive } from '@angular/core';

@Directive({
  selector: '[tslCardHorizontalPadding]',
  standalone: true,
  host: {
    '[class.-tw-px-6]': 'true'
  }
})
export class CardHorizontalPaddingDirective { }
