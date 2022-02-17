import { ChangeDetectorRef, Directive, Input, TemplateRef, ViewContainerRef } from '@angular/core';
import { switchMapTo } from 'rxjs';
import { LifecycleUtils } from '../utils';

@Directive({
  selector: '[tslRepeat]'
})
export class RepeatDirective extends LifecycleUtils<RepeatDirective> {
  /** how many times to repeat */
  @Input() tslRepeat: number;

  constructor(templateRef: TemplateRef<any>, viewContainer: ViewContainerRef, changeDetector: ChangeDetectorRef) {
    super();

    this.tslRepeat = 1;

    this.init$
      .pipe(switchMapTo(this.observe('tslRepeat')))
      .subscribe((repeat) => {
        while (viewContainer.length > repeat) {
          viewContainer.remove();
        }

        while (repeat > viewContainer.length) {
          viewContainer.createEmbeddedView(templateRef);
        }

        changeDetector.markForCheck();
      });
  }
}
