import type { AnimationTriggerMetadata } from '@angular/animations';
import { animate, state, style, transition, trigger } from '@angular/animations';

export function fadeInOutAnimation(duration: number, targetOpacity: number = 1): AnimationTriggerMetadata {
  return trigger('fadeInOut', [
    state('*', style({ opacity: targetOpacity })),
    state('void', style({ opacity: 0 })),
    transition('* <=> *', animate(duration))
  ]);
}
