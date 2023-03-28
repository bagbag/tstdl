import { Directive } from '@angular/core';

@Directive({
  selector: '[tslCardLeftPadding]',
  standalone: true,
  host: {
    '[class.pl-6]': 'true'
  }
})
export class CardLeftPaddingDirective { }

@Directive({
  selector: '[tslCardRightPadding]',
  standalone: true,
  host: {
    '[class.pr-6]': 'true'
  }
})
export class CardRightPaddingDirective { }

@Directive({
  selector: '[tslCardHorizontalPadding]',
  standalone: true,
  host: {
    '[class.px-6]': 'true'
  }
})
export class CardHorizontalPaddingDirective { }

@Directive({
  selector: '[tslCardTopPadding]',
  standalone: true,
  host: {
    '[class.pt-5]': 'true'
  }
})
export class CardTopPaddingDirective { }

@Directive({
  selector: '[tslCardBottomPadding]',
  standalone: true,
  host: {
    '[class.pb-5]': 'true'
  }
})
export class CardBottomPaddingDirective { }

@Directive({
  selector: '[tslCardVerticalPadding]',
  standalone: true,
  host: {
    '[class.py-5]': 'true'
  }
})
export class CardVerticalPaddingDirective { }
