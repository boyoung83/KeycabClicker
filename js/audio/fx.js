// 게임용 효과음 (성공/실패/카운트다운 등) — 스위치 사운드와 같은 버스로 합성

import { ensure, ctx, bus } from './engine.js';

function tone(t, freq, dur, type = 'triangle', peak = 0.2) {
  const c = ctx();
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  const g = c.createGain();
  g.gain.setValueAtTime(peak, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(bus());
  o.start(t);
  o.stop(t + dur + 0.05);
}

export function playFx(name) {
  const c = ensure();
  if (!c) return;
  const t = c.currentTime;
  switch (name) {
    case 'tick':                                     // 카운트다운/목표 등장
      tone(t, 1200, 0.06, 'square', 0.1);
      break;
    case 'good':                                     // 맞았을 때
      tone(t, 880, 0.09, 'triangle', 0.2);
      break;
    case 'perfect':                                  // 리듬 퍼펙트
      tone(t, 1046, 0.07, 'triangle', 0.22);
      tone(t + 0.07, 1568, 0.1, 'triangle', 0.18);
      break;
    case 'success':                                  // 라운드/게임 클리어 팡파레
      [523, 659, 784, 1046].forEach((f, i) => tone(t + i * 0.09, f, 0.13, 'triangle', 0.22));
      break;
    case 'fail':                                     // 실패
      tone(t, 220, 0.18, 'sawtooth', 0.16);
      tone(t + 0.12, 150, 0.26, 'sawtooth', 0.16);
      break;
  }
}
