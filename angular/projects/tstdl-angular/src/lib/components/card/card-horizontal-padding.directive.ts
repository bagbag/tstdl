import { Directive } from '@angular/core';

@Directive({
  selector: '[tslCardHorizontalPadding]',
  standalone: true,
  host: {
    '[class.px-6]': 'true'
  }
})
export class CardHorizontalPaddingDirective { }
