import { Directive } from '@angular/core';

@Directive({
  selector: '[tslCardHorizontalPadding]',
  host: {
    '[class.px-6]': 'true'
  }
})
export class CardHorizontalPaddingDirective { }
