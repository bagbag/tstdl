import { NgModule } from '@angular/core';

import { CardComponent } from './components';
import { CardActionDirective, CardBodyDirective, CardBottomPaddingDirective, CardFooterDirective, CardHeaderDirective, CardHorizontalPaddingDirective, CardLeftPaddingDirective, CardNoBottomPaddingDirective, CardNoHorizontalPaddingDirective, CardNoLeftPaddingDirective, CardNoRightPaddingDirective, CardNoTopPaddingDirective, CardNoVerticalPaddingDirective, CardPostHeaderDirective, CardPreHeaderDirective, CardRightPaddingDirective, CardSubHeaderDirective, CardTopPaddingDirective, CardVerticalPaddingDirective } from './directives';

export const cardDirectives = [
  CardActionDirective,
  CardBodyDirective,
  CardBottomPaddingDirective,
  CardFooterDirective,
  CardHeaderDirective,
  CardHorizontalPaddingDirective,
  CardLeftPaddingDirective,
  CardNoBottomPaddingDirective,
  CardNoHorizontalPaddingDirective,
  CardNoLeftPaddingDirective,
  CardNoRightPaddingDirective,
  CardNoTopPaddingDirective,
  CardNoVerticalPaddingDirective,
  CardPostHeaderDirective,
  CardPreHeaderDirective,
  CardRightPaddingDirective,
  CardSubHeaderDirective,
  CardTopPaddingDirective,
  CardVerticalPaddingDirective
] as const;

@NgModule({
  imports: [
    CardComponent,
    ...cardDirectives
  ],
  exports: [
    CardComponent,
    ...cardDirectives
  ]
})
export class TstdlCardModule { }
