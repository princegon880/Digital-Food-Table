/**
 * haptic.js — Shared Web Vibration API helper
 *
 * Works on Android Chrome/Firefox and any browser that supports navigator.vibrate.
 * iOS Safari does NOT support the Vibration API — calls are silently ignored.
 *
 * Pattern guide:
 *   'light'   — 40 ms  — tap feedback (add to cart, pill select, toggle)
 *   'medium'  — 85 ms  — open drawer/modal, scroll to section
 *   'double'  — 40,60,40 — double tap confirm
 *   'success' — 80,80,80 — order placed, save confirmed
 *   'error'   — 120,80,120 — validation fail, blocked action
 *   'heavy'   — 200 ms — destructive / permanent action
 */

const PATTERNS = {
  light:   40,
  medium:  85,
  double:  [40, 60, 40],
  success: [80, 80, 80],
  error:   [120, 80, 120],
  heavy:   200,
};

/**
 * Trigger a haptic/vibration pattern.
 * @param {'light'|'medium'|'double'|'success'|'error'|'heavy'} type
 */
export function triggerHaptic(type = 'light') {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;
  try {
    const pattern = PATTERNS[type] ?? PATTERNS.light;
    navigator.vibrate(pattern);
  } catch (_) {
    // Silently ignore — some browsers throw even if the API exists
  }
}

export default triggerHaptic;
