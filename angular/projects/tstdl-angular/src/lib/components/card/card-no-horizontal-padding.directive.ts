import { Directive } from '@angular/core';

@Directive({
  selector: '[tslCardNoHorizontalPadding]',
  standalone: true,
  host: {
    '[class.-tw-mx-6]': 'true'
  }
})
export class CardNoHorizontalPaddingDirective { }
