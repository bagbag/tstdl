import { ContentChildren, Directive, QueryList } from '@angular/core';
import { GRID_CONTENT } from './grid-content';
import { GridItemDirective } from './grid-item.directive';

@Directive({
  selector: '[gridRow]',
  exportAs: 'gridRow',
  standalone: true,
  providers: [
    { provide: GRID_CONTENT, useExisting: GridRowDirective }
  ]
})
export class GridRowDirective {
  @ContentChildren(GridItemDirective) items: QueryList<GridItemDirective>;
}
