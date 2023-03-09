import type { AnimationTriggerMetadata } from '@angular/animations';
import { animate, state, style, transition, trigger } from '@angular/animations';
import type { AnimationOptions } from './animation-options';
import { getAnimateTimings } from './utils';

export function widthAnimation(options?: AnimationOptions & { defaultWidth?: string }): AnimationTriggerMetadata {
  const animateTimings = getAnimateTimings({ duration: 350, ease: 'ease', ...options });
  const defaultWidth = options?.defaultWidth ?? '0%';

  return trigger(options?.trigger ?? 'width', [
    state('void', style({ width: defaultWidth })),
    state('*', style({ width: '{{ width }}' }), { params: { width: defaultWidth } }),
    transition('* => *', animate(animateTimings))
  ]);
}

export function heightAnimation(options?: AnimationOptions & { defaultHeight?: string }): AnimationTriggerMetadata {
  const animateTimings = getAnimateTimings({ duration: 350, ease: 'ease', ...options });
  const defaultHeight = options?.defaultHeight ?? '0%';

  return trigger(options?.trigger ?? 'height', [
    state('void', style({ height: defaultHeight })),
    state('*', style({ height: '{{ height }}' }), { params: { height: defaultHeight } }),
    transition('* => *', animate(animateTimings))
  ]);
}
