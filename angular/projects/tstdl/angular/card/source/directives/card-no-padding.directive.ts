import { Directive } from '@angular/core';

@Directive({
  selector: '[tslCardNoLeftPadding]',
  standalone: true,
  host: {
    '[class.-ml-6]': 'true'
  }
})
export class CardNoLeftPaddingDirective { }

@Directive({
  selector: '[tslCardNoRightPadding]',
  standalone: true,
  host: {
    '[class.-mr-6]': 'true'
  }
})
export class CardNoRightPaddingDirective { }

@Directive({
  selector: '[tslCardNoHorizontalPadding]',
  standalone: true,
  host: {
    '[class.-mx-6]': 'true'
  }
})
export class CardNoHorizontalPaddingDirective { }

@Directive({
  selector: '[tslCardNoTopPadding]',
  standalone: true,
  host: {
    '[class.-mt-5]': 'true'
  }
})
export class CardNoTopPaddingDirective { }

@Directive({
  selector: '[tslCardNoBottomPadding]',
  standalone: true,
  host: {
    '[class.-mb-5]': 'true'
  }
})
export class CardNoBottomPaddingDirective { }

@Directive({
  selector: '[tslCardNoVerticalPadding]',
  standalone: true,
  host: {
    '[class.-my-5]': 'true'
  }
})
export class CardNoVerticalPaddingDirective { }
