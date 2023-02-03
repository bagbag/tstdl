import { Directive } from '@angular/core';

@Directive({
  selector: '[tslCardNoHorizontalPadding]',
  host: {
    '[class.-mx-6]': 'true'
  }
})
export class CardNoHorizontalPaddingDirective { }
