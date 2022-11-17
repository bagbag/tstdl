import { ChangeDetectorRef, Directive, Input, TemplateRef, ViewContainerRef } from '@angular/core';
import { switchMap } from 'rxjs';
import { LifecycleUtils } from '../utils';

export interface RepeatContext {
  $implicit: number;
  index: number;
}

@Directive({
  selector: '[tslRepeat]',
  standalone: true
})
export class RepeatDirective extends LifecycleUtils<RepeatDirective> {
  /** how many times to repeat */
  @Input() tslRepeat: number;

  constructor(templateRef: TemplateRef<RepeatContext>, viewContainer: ViewContainerRef, changeDetector: ChangeDetectorRef) {
    super();

    this.tslRepeat = 1;

    this.init$
      .pipe(switchMap(() => this.observe('tslRepeat')))
      .subscribe((repeat) => {
        while (viewContainer.length > repeat) {
          viewContainer.remove();
        }

        while (repeat > viewContainer.length) {
          viewContainer.createEmbeddedView(templateRef, { $implicit: viewContainer.length, index: viewContainer.length });
        }

        changeDetector.markForCheck();
      });
  }
}
