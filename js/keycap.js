// 키캡 비주얼 컨트롤러 + 누름 상태 머신 (4구, 실물 사진 기반)
// - Pointer Events만 사용 (touch/mouse 이중 발화 원천 차단)
// - setPointerCapture로 빠른 연타에서도 pointerup을 놓치지 않음
// - 키마다 독립: 멀티터치로 여러 키 동시 누름 가능, pointerdown마다 소리/카운트 발생
// - 글리산도: 누른 채 손가락을 옆 키로 미끄러뜨리면 드르륵 연달아 눌림

import { CAP_COLORS } from './designs.js';

const stage = document.getElementById('stage');
const toy = document.getElementById('toy');
const chain = document.getElementById('chain');
const keysG = document.getElementById('keys');

export const KEY_COUNT = 4;

// 구버전 저장값(반투명 팔레트 이름) → 새 파스텔 팔레트 매핑
const LEGACY_COLOR = {
  clear: 'white', pink: 'salmon', blue: 'sky',
  yellow: 'lemon', purple: 'lavender', smoke: 'charcoal',
};

// 키 유닛 로컬 좌표: 캡 x 14..206 (폭 192), 슬롯 y 152..208
const LAYOUTS = {
  row: {
    pos: [[0, 0], [200, 0], [400, 0], [600, 0]],
    viewBox: '-115 -135 965 485',
    caseTop: { x: -8, y: 44, width: 836, height: 196 },
    caseWall: { x: -8, y: 220, width: 836, height: 66 },
    shadowWide: { cx: 410, cy: 300, rx: 470, ry: 18 },
    shadowTight: { cx: 410, cy: 294, rx: 430, ry: 10 },
  },
  grid: {
    pos: [[0, 0], [200, 0], [0, 180], [200, 180]],
    viewBox: '-115 -135 565 625',
    caseTop: { x: -8, y: 44, width: 436, height: 374 },
    caseWall: { x: -8, y: 386, width: 436, height: 70 },
    shadowWide: { cx: 210, cy: 460, rx: 270, ry: 20 },
    shadowTight: { cx: 210, cy: 454, rx: 230, ry: 11 },
  },
};

export function buildScene() {
  const unit = document.getElementById('keyUnit');
  for (let i = 0; i < KEY_COUNT; i++) {
    const g = unit.cloneNode(true);
    g.removeAttribute('id');
    g.classList.add('key');
    g.dataset.index = String(i);
    keysG.appendChild(g);
  }
}

export function applyLayout(layout) {
  const L = LAYOUTS[layout] || LAYOUTS.grid;
  [...keysG.children].forEach((g, i) =>
    g.setAttribute('transform', `translate(${L.pos[i][0]},${L.pos[i][1]})`));
  toy.setAttribute('viewBox', L.viewBox);
  const setAttrs = (id, attrs) => {
    const el = document.getElementById(id);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  };
  setAttrs('caseTop', L.caseTop);
  setAttrs('caseGlossRect', L.caseTop);
  setAttrs('caseEdge', L.caseTop);
  setAttrs('caseWall', L.caseWall);
  setAttrs('shadowWide', L.shadowWide);
  setAttrs('shadowTight', L.shadowTight);
  stage.classList.toggle('layout-row', L === LAYOUTS.row);
  stage.classList.toggle('layout-grid', L !== LAYOUTS.row);
}

export function initPress({ onDown, onUp, isBlocked }) {
  const byPointer = new Map();               // pointerId → keyIndex
  const activeCount = new Array(KEY_COUNT).fill(0);
  const keyEl = (i) => keysG.children[i];

  const keyFromPoint = (x, y) => {
    const el = document.elementFromPoint(x, y);
    const key = el && el.closest ? el.closest('.key') : null;
    return key ? Number(key.dataset.index) : -1;
  };

  function press(i) {
    activeCount[i] += 1;
    keyEl(i).classList.add('is-pressed');
    chain.classList.remove('kick');
    void chain.getBoundingClientRect();
    chain.classList.add('kick');
    onDown(i);
  }

  function release(i) {
    activeCount[i] = Math.max(0, activeCount[i] - 1);
    if (activeCount[i] === 0) {
      keyEl(i).classList.remove('is-pressed');
      onUp(i);
    }
  }

  stage.addEventListener('pointerdown', (e) => {
    if (isBlocked()) return;
    const i = keyFromPoint(e.clientX, e.clientY);
    if (i < 0) return;
    e.preventDefault();
    try { stage.setPointerCapture(e.pointerId); } catch { /* no-op */ }
    byPointer.set(e.pointerId, i);
    press(i);
  });

  // 글리산도: 누른 채 다른 키 위로 이동하면 이전 키를 놓고 새 키를 누름
  stage.addEventListener('pointermove', (e) => {
    if (!byPointer.has(e.pointerId)) return;
    const cur = byPointer.get(e.pointerId);
    const next = keyFromPoint(e.clientX, e.clientY);
    if (next >= 0 && next !== cur) {
      release(cur);
      byPointer.set(e.pointerId, next);
      press(next);
    }
  });

  const up = (e) => {
    if (!byPointer.has(e.pointerId)) return;
    const i = byPointer.get(e.pointerId);
    byPointer.delete(e.pointerId);
    release(i);
  };
  stage.addEventListener('pointerup', up);
  stage.addEventListener('pointercancel', up);
  stage.addEventListener('lostpointercapture', up);

  // 키보드 (A/S/D/F = 키 1~4, 스페이스/엔터 = 키 1) — 데스크톱 보너스
  const KEYMAP = { KeyA: 0, KeyS: 1, KeyD: 2, KeyF: 3, Space: 0, Enter: 0 };
  const held = new Map();                    // e.code → keyIndex
  window.addEventListener('keydown', (e) => {
    if (e.repeat || isBlocked()) return;
    const i = KEYMAP[e.code];
    if (i === undefined || held.has(e.code)) return;
    e.preventDefault();
    held.set(e.code, i);
    press(i);
  });
  window.addEventListener('keyup', (e) => {
    if (!held.has(e.code)) return;
    release(held.get(e.code));
    held.delete(e.code);
  });

  // 길게 눌러 나오는 메뉴/더블탭 확대 차단
  stage.addEventListener('contextmenu', (e) => e.preventDefault());
  stage.addEventListener('dblclick', (e) => e.preventDefault());
}

// 상태 → SVG/CSS 반영
export function applyVisuals(state) {
  const root = document.documentElement.style;

  if (state.ledColor) {
    root.setProperty('--led-color', state.ledColor);
    stage.classList.remove('led-off');
  } else {
    stage.classList.add('led-off');
  }

  state.keys.forEach((keyState, i) => {
    const g = keysG.children[i];
    if (!g) return;

    const colorId = CAP_COLORS[keyState.capColor] ? keyState.capColor : LEGACY_COLOR[keyState.capColor];
    const cap = CAP_COLORS[colorId] || CAP_COLORS.white;
    g.style.setProperty('--cap-face', cap.face);
    g.style.setProperty('--cap-side', cap.side);

    const text = g.querySelector('.design-text');
    const pattern = g.querySelector('.design-pattern');
    const d = keyState.design;
    if (d.type === 'pattern') {
      pattern.setAttribute('visibility', 'visible');
      pattern.setAttribute('fill', `url(#pat-${d.value})`);
      text.textContent = '';
    } else {
      pattern.setAttribute('visibility', 'hidden');
      text.textContent = d.value || '';
      if (d.type === 'text') {
        text.setAttribute('fill', d.color || '#ffffff');
        text.setAttribute('font-size', d.value && d.value.length > 1 ? '52' : '68');
      } else {
        text.removeAttribute('fill');
        text.setAttribute('font-size', '68');
      }
    }
  });
}
