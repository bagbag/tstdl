import { booleanAttribute, ChangeDetectionStrategy, Component, input, output, ViewEncapsulation } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent, type IconName } from '@tstdl/angular/icon';

export type TreeViewItem<T = unknown> = {
  label: string,
  icon?: IconName,
  value: T,
  active?: boolean,
  link?: Partial<Pick<RouterLink, 'routerLink' | 'queryParams' | 'queryParamsHandling' | 'fragment' | 'relativeTo'>>,
  children: TreeViewItem[],
};

@Component({
  selector: 'tsl-tree-view',
  imports: [IconComponent, RouterLink],
  templateUrl: './tree-view.component.html',
  styleUrl: './tree-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'tsl-tw',
    '[class.space-y-8]': 'gapOnFirstLevel()',
  },
})
export class TreeViewComponent<T> {
  readonly items = input<TreeViewItem<T>[]>();
  readonly selectedItem = input<TreeViewItem<T> | undefined | null>(null);
  readonly gapOnFirstLevel = input<boolean, boolean | `${boolean}`>(true, { transform: booleanAttribute });

  readonly itemSelected = output<TreeViewItem<T>>();
}
