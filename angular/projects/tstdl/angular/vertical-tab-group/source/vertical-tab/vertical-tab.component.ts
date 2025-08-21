import { ChangeDetectionStrategy, Component, TemplateRef, ViewEncapsulation, computed, contentChild, input, viewChild } from '@angular/core';
import type { ActivatedRoute, QueryParamsHandling, UrlTree } from '@angular/router';
import type { IconName } from '@tstdl/angular/icon';
import type { DynamicText } from '@tstdl/base/text';
import type { Record } from '@tstdl/base/types';

import { VerticalTabLabelDirective } from './vertical-tab-label.directive';

@Component({
  selector: 'tsl-vertical-tab',
  imports: [],
  templateUrl: './vertical-tab.component.html',
  styleUrl: './vertical-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class VerticalTabComponent {
  readonly contentTemplate = viewChild(TemplateRef);
  readonly labelRef = contentChild(VerticalTabLabelDirective);

  readonly label = input<DynamicText | null>();
  readonly description = input<DynamicText | null>();
  readonly icon = input<IconName | null>();
  readonly class = input<string>();
  readonly routerLink = input<readonly any[] | string | UrlTree | null | undefined>(null);

  readonly routerLinkOptions = input<{
    target?: string,
    queryParams?: Record<string> | null,
    fragment?: string,
    queryParamsHandling?: QueryParamsHandling | null,
    state?: Record<string>,
    info?: unknown,
    relativeTo?: ActivatedRoute | null,
    preserveFragment?: boolean,
    skipLocationChange?: boolean,
    replaceUrl?: boolean,
  }>();

  readonly labelTemplateRef = computed(() => this.labelRef()?.templateRef);
}
