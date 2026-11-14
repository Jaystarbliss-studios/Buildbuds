export const LONG_PRESS_DELAY_MS = 400;
export const LONG_PRESS_MOVE_TOLERANCE_PX = 8;

export type HapticStyle = 'light' | 'medium' | 'heavy';

/**
 * Determine whether a touch has moved far enough to be a scroll or swipe gesture
 * rather than a stationary tap-and-hold (long press).
 */
export function shouldCancelLongPress(
  startX: number,
  startY: number,
  currentX: number,
  currentY: number,
  tolerancePx: number = LONG_PRESS_MOVE_TOLERANCE_PX
): boolean {
  const dx = Math.abs(currentX - startX);
  const dy = Math.abs(currentY - startY);
  return dx > tolerancePx || dy > tolerancePx;
}

/**
 * Trigger subtle native device vibration (haptic feedback) on supported mobile browsers.
 * Safely no-ops on desktop browsers or environments without navigator.vibrate.
 */
export function triggerHapticFeedback(style: HapticStyle = 'light'): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
    return false;
  }
  const durationMs = style === 'heavy' ? 30 : style === 'medium' ? 18 : 10;
  try {
    return Boolean(navigator.vibrate(durationMs));
  } catch {
    return false;
  }
}
