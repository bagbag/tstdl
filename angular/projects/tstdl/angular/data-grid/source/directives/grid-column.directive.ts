import { ContentChildren, Directive, QueryList } from '@angular/core';
import { GRID_CONTENT } from './grid-content';
import { GridItemDirective } from './grid-item.directive';

@Directive({
  selector: '[gridColumn]',
  exportAs: 'gridColumn',
  providers: [
    { provide: GRID_CONTENT, useExisting: GridColumnDirective }
  ]
})
export class GridColumnDirective {
  @ContentChildren(GridItemDirective) items: QueryList<GridItemDirective>;
}
