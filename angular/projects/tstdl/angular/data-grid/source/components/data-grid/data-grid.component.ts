import type { AfterContentInit, OnChanges } from '@angular/core';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ContentChildren, Inject, Input, Optional, QueryList } from '@angular/core';
import type { DynamicText } from '@tstdl/base/text';
import type { Record } from '@tstdl/base/types';
import { isDefined } from '@tstdl/base/utils';
import { createArray } from '@tstdl/base/utils/array';
import { merge, startWith, switchMap } from 'rxjs';
import { GridColumnDirective } from '../../directives/grid-column.directive';
import { GridHeaderItemDirective } from '../../directives/grid-header-item.directive';
import { GridItemDirective } from '../../directives/grid-item.directive';
import { GridRowDirective } from '../../directives/grid-row.directive';
import type { DataGridDefaultOptions } from '../../models';
import { DATA_GRID_OPTIONS } from '../../tokens';

export type DataGridDisplayType = 'columns' | 'table' | 'items';

const columnClasses: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
  7: 'grid-cols-7',
  8: 'grid-cols-8',
  9: 'grid-cols-9',
  10: 'grid-cols-10'
};

const colSpanClasses: Record<number, string> = {
  1: 'col-span-1',
  2: 'col-span-2',
  3: 'col-span-3',
  4: 'col-span-4',
  5: 'col-span-5',
  6: 'col-span-6',
  7: 'col-span-7',
  8: 'col-span-8',
  9: 'col-span-9',
  10: 'col-span-10'
};

const rowSpanClasses: Record<number, string> = {
  1: 'row-span-1',
  2: 'row-span-2',
  3: 'row-span-3',
  4: 'row-span-4',
  5: 'row-span-5',
  6: 'row-span-6',
  7: 'row-span-7',
  8: 'row-span-8',
  9: 'row-span-9',
  10: 'row-span-10'
};

@Component({
  selector: 'tsl-data-grid',
  templateUrl: './data-grid.component.html',
  styleUrls: ['./data-grid.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.block]': 'true',
    '[class.break-words]': 'true',
    '[class.text-sm]': 'true',
    '[class.leading-4]': 'true',
    '[class.break-inside-avoid]': 'true',
    '[class.border-[1.5px]]': 'true',
    '[class.border-neutral-300]': 'true',
    '[class.rounded-lg]': 'true',
    '[class.overflow-hidden]': 'true',
    '[class.isolate]': 'true'
  }
})
export class DataGridComponent implements AfterContentInit, OnChanges {
  private readonly changeDetector: ChangeDetectorRef;

  private contentInit: boolean;

  readonly columnClasses = columnClasses;
  readonly colSpanClasses = colSpanClasses;
  readonly rowSpanClasses = rowSpanClasses;

  @Input() heading: DynamicText | undefined;
  @Input() displayType: DataGridDisplayType;
  @Input() itemColumns: number;
  @Input() booleanTrueText: DynamicText | null | undefined;
  @Input() booleanFalseText: DynamicText | null | undefined;
  @Input() noValueText: DynamicText | null | undefined;

  @ContentChildren(GridHeaderItemDirective) headerItemRefs: QueryList<GridHeaderItemDirective>;
  @ContentChildren(GridItemDirective) itemRefs: QueryList<GridItemDirective>;
  @ContentChildren(GridColumnDirective) columnRefs: QueryList<GridColumnDirective>;
  @ContentChildren(GridRowDirective) rowRefs: QueryList<GridRowDirective>;

  matrix: (GridItemDirective | undefined)[][];
  columns: number;
  actualDisplayType: DataGridDisplayType;

  get empty(): boolean {
    return this.matrix.length == 0;
  }

  constructor(changeDetector: ChangeDetectorRef, @Inject(DATA_GRID_OPTIONS) @Optional() options: DataGridDefaultOptions | null) {
    this.changeDetector = changeDetector;

    this.itemColumns = options?.itemColumns ?? 4;
    this.booleanTrueText = options?.booleanTrueText;
    this.booleanFalseText = options?.booleanFalseText;
    this.noValueText = options?.noValueText;

    this.contentInit = false;
  }

  ngAfterContentInit(): void {
    this.contentInit = true;

    const columnItemsChange$ = this.columnRefs.changes.pipe(
      switchMap(() => merge(this.columnRefs.map((column) => column.items.changes)))
    );

    const rowItemsChange$ = this.rowRefs.changes.pipe(
      switchMap(() => merge(this.rowRefs.map((row) => row.items.changes)))
    );

    merge(this.headerItemRefs.changes, this.itemRefs.changes, this.columnRefs.changes, this.rowRefs.changes, columnItemsChange$, rowItemsChange$)
      .pipe(startWith(undefined))
      .subscribe(() => this.update());
  }

  ngOnChanges(): void {
    this.update();
  }

  isOddItemsRow(index: number): boolean {
    return Math.floor(index / this.itemColumns) % 2 == 1;
  }

  private update(): void {
    if (!this.contentInit) {
      return;
    }

    this.updateMatrix();
    this.updateActualDisplayType();
    this.changeDetector.markForCheck();
  }

  private updateMatrix(): void {
    if (this.rowRefs.length > 0) {
      this.columns = this.rowRefs.map((row) => row.items.length).reduce((max, length) => Math.max(max, length), 0);
      this.matrix = this.rowRefs.map((row) => createArray(this.columns, (column) => row.items.get(column)));
    }
    else if (this.columnRefs.length > 0) {
      this.columns = this.columnRefs.length;
      const rows = this.columnRefs.map((column) => column.items.length).reduce((max, length) => Math.max(max, length), 0);
      this.matrix = createArray(rows, (row) => createArray(this.columns, (column) => this.columnRefs.get(column)?.items.get(row)));
    }
    else if (this.itemRefs.length > 0) {
      this.columns = this.itemColumns;
      const rows = Math.ceil(this.itemRefs.length / this.itemColumns);
      this.matrix = createArray(rows, (row) => createArray(this.itemColumns, (column) => this.itemRefs.get((row * this.itemColumns) + column)));
    }
    else {
      this.matrix = [];
      this.columns = this.headerItemRefs.length;
    }
  }

  private updateActualDisplayType(): void {
    if (isDefined(this.displayType)) {
      this.actualDisplayType = this.displayType;
    }
    else if (this.rowRefs.length > 0) {
      this.actualDisplayType = 'table';
    }
    else if (this.columnRefs.length > 0) {
      this.actualDisplayType = 'columns';
    }
    else {
      this.actualDisplayType = 'items';
    }
  }

  trackBy(_index: number, _item: any): true {
    return true;
  }
}
