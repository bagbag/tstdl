import type { AnimationTriggerMetadata } from '@angular/animations';
import { animate, state, style, transition, trigger } from '@angular/animations';
import type { AnimationOptions } from './animation-options';
import { getAnimateTimings } from './utils';

export function slideInOutAnimation(options?: AnimationOptions & { direction?: 'left' | 'right' }): AnimationTriggerMetadata {
  const animateTimings = getAnimateTimings(options);
  const offset = options?.direction == 'right' ? '100%' : '-100%';

  return trigger(options?.trigger ?? 'slideInOut', [
    state('void', style({ transform: `translateX(${offset})` })),
    state('*', style({ transform: 'translateX(0)' })),
    transition('* => *', animate(animateTimings))
  ]);
}
