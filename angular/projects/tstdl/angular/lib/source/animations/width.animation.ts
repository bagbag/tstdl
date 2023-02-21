import type { AnimationTriggerMetadata } from '@angular/animations';
import { animate, state, style, transition, trigger } from '@angular/animations';

export function widthAnimation({ timing = '350ms ease', defaultWidth = '0%' }: { timing?: string, defaultWidth?: string } = {}): AnimationTriggerMetadata {
  return trigger('width', [
    state('void', style({ width: defaultWidth })),
    state('*', style({ width: '{{ width }}' }), { params: { width: defaultWidth } }),
    transition('* => *', animate(timing))
  ]);
}
