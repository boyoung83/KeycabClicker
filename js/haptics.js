// 햅틱 진동 (Android Chrome 등에서만 동작, iOS Safari는 미지원 → 조용히 무시)

export const supported = typeof navigator.vibrate === 'function';

const PATTERN = { blue: 12, brown: 8, red: 6 };

export function tap(switchType) {
  if (!supported) return;
  try { navigator.vibrate(PATTERN[switchType] || 8); } catch { /* no-op */ }
}
