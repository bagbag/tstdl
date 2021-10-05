import type { Observable } from 'rxjs';
import { fromEventPattern } from 'rxjs';

export function timeout$(milliseconds: number = 0): Observable<void> {
  return fromEventPattern((handler) => setTimeout(handler, milliseconds), (handle: any) => clearTimeout(handle));
}

export function immediate$(): Observable<void> {
  return fromEventPattern((handler) => setImmediate(handler), (handle: any) => clearImmediate(handle));
}

export function nextTick$(): Observable<void> {
  return fromEventPattern((handler) => process.nextTick(handler));
}

export function animationFrame$(): Observable<number> {
  return fromEventPattern((handler) => requestAnimationFrame(handler), (handle: any) => cancelAnimationFrame(handle));
}

export function idle$(timeout?: number): Observable<IdleDeadline> {
  return fromEventPattern((handler) => requestIdleCallback(handler, { timeout }), (handle: any) => cancelIdleCallback(handle));
}
