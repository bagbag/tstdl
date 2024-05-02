import { animate, state, style, transition, trigger, type AnimationTriggerMetadata } from '@angular/animations';

import type { AnimationOptions } from './animation-options';
import { getAnimateTimings } from './utils';

export function fadeInOutAnimation(options?: AnimationOptions & { targetOpacity?: number }): AnimationTriggerMetadata {
  const animateTimings = getAnimateTimings(options);

  return trigger(options?.trigger ?? 'fadeInOut', [
    state('*', style({ opacity: options?.targetOpacity ?? 1 })),
    state('void', style({ opacity: 0 })),
    transition('* <=> *', animate(animateTimings))
  ]);
}
