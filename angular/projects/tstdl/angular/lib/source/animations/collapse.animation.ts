import { AUTO_STYLE, animate, state, style, transition, trigger, type AnimationTriggerMetadata } from '@angular/animations';
import { filterUndefinedObjectProperties, mapObjectValues } from '@tstdl/base/utils/object';

import type { AnimationOptions } from './animation-options';
import { getAnimateTimings } from './utils';

export type CollapseAnimationOptions = AnimationOptions & {
  width?: boolean,
  height?: boolean,
  opacity?: boolean,
  scale?: boolean,

  /**
   * @default 'void => *, true <=> *'
   */
  stateTransition?: string
};

export function collapseAnimation(options: CollapseAnimationOptions = {}): AnimationTriggerMetadata {
  const animateTimings = getAnimateTimings(options);

  const voidStyle = filterUndefinedObjectProperties({
    height: (options.height != false) ? '0px' : undefined,
    width: (options.width == true) ? '0px' : undefined,
    opacity: (options.opacity == true) ? 0 : undefined,
    scale: (options.scale == true) ? 0 : undefined,
    visibility: 'hidden'
  });

  const targetStyle = mapObjectValues(voidStyle, () => AUTO_STYLE);

  return trigger(options.trigger ?? 'collapse', [
    state('true, void', style(voidStyle)),
    state('*', style(targetStyle)),
    transition(options.stateTransition ?? 'void => *, true <=> *', animate(animateTimings))
  ]);
}
