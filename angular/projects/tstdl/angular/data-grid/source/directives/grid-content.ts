import { InjectionToken } from '@angular/core';
import type { GridColumnDirective } from './grid-column.directive';
import type { GridItemDirective } from './grid-item.directive';
import type { GridRowDirective } from './grid-row.directive';

export const GRID_CONTENT = new InjectionToken<GridItemDirective | GridRowDirective | GridColumnDirective>('GridContent');
