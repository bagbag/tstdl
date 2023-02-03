import { Directive } from '@angular/core';

@Directive({
  selector: '[tslCardNoHorizontalPadding]',
  standalone: true,
  host: {
    '[class.-tsl-mx-6]': 'true'
  }
})
export class CardNoHorizontalPaddingDirective { }
