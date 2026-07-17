// 기계식 스위치 사운드 합성 (샘플 파일 없이 Web Audio로 전부 생성)
//
// 구성 요소:
//  - noiseHit: 노이즈 버스트 → (highpass) → bandpass → (lowpass) → 게인 엔벨로프
//              → 클릭/바닥침의 "탁" 하는 비주기 성분
//  - ping:     짧은 감쇠 오scillator → 플라스틱/클릭잭 공진의 "띵" 성분
//  - 히트마다 주파수 ±6%, 게인 ±2dB, 감쇠 ±10% 랜덤화 → 기관총처럼 똑같은 소리 방지

import { ensure, ctx, bus, noiseBuffer } from './engine.js';

const rand = (spread) => 1 + (Math.random() - 0.5) * spread;

function noiseHit(t, { bp = 2000, q = 1, hp = 0, lp = 0, peak = 0.3, decay = 0.03, attack = 0 }) {
  const c = ctx();
  const src = c.createBufferSource();
  src.buffer = noiseBuffer();
  src.playbackRate.value = 0.94 + Math.random() * 0.12;

  let node = src;
  if (hp) {
    const f = c.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = hp * rand(0.12);
    node.connect(f); node = f;
  }
  const band = c.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = bp * rand(0.12);
  band.Q.value = q;
  node.connect(band); node = band;
  if (lp) {
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = lp;
    node.connect(f); node = f;
  }

  const g = c.createGain();
  const p = Math.max(0.001, peak * rand(0.25));
  const d = decay * rand(0.2);
  if (attack > 0) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(p, t + attack);
  } else {
    g.gain.setValueAtTime(p, t);
  }
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + d);
  node.connect(g);
  g.connect(bus());

  src.start(t);
  src.stop(t + attack + d + 0.05);
}

function ping(t, { freq = 1000, type = 'triangle', peak = 0.2, decay = 0.03, drop = 0.85 }) {
  const c = ctx();
  const o = c.createOscillator();
  o.type = type;
  const f0 = freq * rand(0.12);
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(f0 * drop, t + decay);

  const g = c.createGain();
  g.gain.setValueAtTime(Math.max(0.001, peak * rand(0.25)), t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  o.connect(g);
  g.connect(bus());

  o.start(t);
  o.stop(t + decay + 0.05);
}

const RECIPES = {
  // 청축: 클릭잭의 날카로운 금속성 "찰칵" — 누를 때/뗄 때 모두 클릭
  blue: {
    down(t) {
      noiseHit(t, { hp: 2500, bp: 5500, q: 2, peak: 0.9, decay: 0.012 });        // 클릭 트랜지언트
      ping(t, { freq: 2300, peak: 0.25, decay: 0.022 });                          // 클릭잭 공진
      ping(t, { freq: 3400, peak: 0.15, decay: 0.015 });
      noiseHit(t, { bp: 900, q: 1, peak: 0.3, decay: 0.035 });                    // 바닥침 몸통
      ping(t, { freq: 180, type: 'sine', peak: 0.25, decay: 0.045, drop: 0.7 }); // 하우징 "톡"
    },
    up(t) {
      noiseHit(t, { hp: 2500, bp: 6300, q: 2, peak: 0.7, decay: 0.011 });         // 릴리즈 클릭
      ping(t, { freq: 2800, peak: 0.18, decay: 0.015 });
      noiseHit(t, { bp: 1400, q: 1, peak: 0.12, decay: 0.02 });                   // 탑아웃
    },
  },

  // 갈축: 클릭 없는 "톡톡" — 부드러운 범프 + 어두운 바닥침
  brown: {
    down(t) {
      noiseHit(t, { hp: 800, bp: 2000, q: 0.8, lp: 6000, peak: 0.35, decay: 0.018, attack: 0.002 });
      ping(t, { freq: 150, type: 'sine', peak: 0.35, decay: 0.05, drop: 0.7 });
      noiseHit(t, { bp: 500, q: 1, lp: 6000, peak: 0.3, decay: 0.04 });
    },
    up(t) {
      noiseHit(t, { bp: 1800, q: 1, lp: 6000, peak: 0.15, decay: 0.015 });
      ping(t, { freq: 1100, peak: 0.08, decay: 0.02 });
    },
  },

  // 적축: 리니어 — 마찰음 거의 없이 가장 깊은 바닥침 "톡"
  red: {
    down(t) {
      noiseHit(t, { bp: 3000, q: 1, lp: 4500, peak: 0.08, decay: 0.008 });
      ping(t, { freq: 120, type: 'sine', peak: 0.45, decay: 0.06, drop: 0.75 });
      noiseHit(t, { bp: 350, q: 0.7, lp: 4500, peak: 0.35, decay: 0.045 });
    },
    up(t) {
      ping(t, { freq: 900, peak: 0.1, decay: 0.018 });
      noiseHit(t, { bp: 1200, q: 1, lp: 5000, peak: 0.12, decay: 0.015 });
    },
  },
};

export function playDown(type) {
  const c = ensure();
  if (!c) return;
  (RECIPES[type] || RECIPES.blue).down(c.currentTime);
}

export function playUp(type) {
  const c = ensure();
  if (!c) return;
  (RECIPES[type] || RECIPES.blue).up(c.currentTime);
}
