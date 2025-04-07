import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';

@Component({
  selector: '[tslMenuOption]',
  imports: [],
  templateUrl: './menu-option.component.html',
  styleUrls: ['./menu-option.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class TslMenuOption { }
