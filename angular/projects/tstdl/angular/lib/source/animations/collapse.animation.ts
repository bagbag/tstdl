import { AUTO_STYLE, animate, state, style, transition, trigger, type AnimationTriggerMetadata } from '@angular/animations';

import type { AnimationOptions } from './animation-options';
import { getAnimateTimings } from './utils';

export function collapseAnimation(options?: AnimationOptions & { direction?: 'vertical' | 'horizontal' }): AnimationTriggerMetadata {
  const animateTimings = getAnimateTimings(options);

  const property = options?.direction == 'horizontal' ? 'width' : 'height';

  return trigger(options?.trigger ?? 'collapse', [
    state('true, void', style({ [property]: '0px', visibility: 'hidden' })),
    state('false', style({ [property]: AUTO_STYLE, visibility: AUTO_STYLE })),
    transition(
      'false <=> true, void => true',
      animate(animateTimings)
    ),
  ]);
}

export function horizontalCollapseAnimation(options?: AnimationOptions): AnimationTriggerMetadata {
  return collapseAnimation({ trigger: 'horizontalCollapse', ...options, direction: 'horizontal' });
}
