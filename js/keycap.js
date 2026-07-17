// 키캡 비주얼 컨트롤러 + 누름 상태 머신 (4구)
// - Pointer Events만 사용 (touch/mouse 이중 발화 원천 차단)
// - setPointerCapture로 빠른 연타에서도 pointerup을 놓치지 않음
// - 키마다 독립: 멀티터치로 여러 키 동시 누름 가능, pointerdown마다 소리/카운트 발생
// - 글리산도: 누른 채 손가락을 옆 키로 미끄러뜨리면 드르륵 연달아 눌림

import { CAP_COLORS } from './designs.js';

const stage = document.getElementById('stage');
const toy = document.getElementById('toy');
const keyring = document.getElementById('keyring');
const keysG = document.getElementById('keys');
const plate = document.getElementById('plate');
const shadow = document.getElementById('toyShadow');

export const KEY_COUNT = 4;

// 키 유닛 로컬 좌표: 캡 x 74..286, 스위치 y 296..392
const LAYOUTS = {
  row: {
    pos: [[0, 0], [236, 0], [472, 0], [708, 0]],
    viewBox: '30 0 990 430',
    plate: { x: 58, y: 322, width: 944, height: 86, rx: 18 },
    shadow: { cx: 530, cy: 420, rx: 480, ry: 12 },
  },
  grid: {
    pos: [[0, 0], [240, 0], [0, 300], [240, 300]],
    viewBox: '20 0 550 730',
    plate: { x: 58, y: 322, width: 484, height: 378, rx: 26 },
    shadow: { cx: 300, cy: 714, rx: 230, ry: 14 },
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
  for (const [k, v] of Object.entries(L.plate)) plate.setAttribute(k, v);
  for (const [k, v] of Object.entries(L.shadow)) shadow.setAttribute(k, v);
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
    keyring.classList.remove('kick');
    void keyring.getBoundingClientRect();
    keyring.classList.add('kick');
    onDown(i);
  }

  function release(i, silent = false) {
    activeCount[i] = Math.max(0, activeCount[i] - 1);
    if (activeCount[i] === 0) {
      keyEl(i).classList.remove('is-pressed');
      if (!silent) onUp(i);
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

  const stemColors = { blue: '#2f9dff', brown: '#9d7362', red: '#ff5f5f' };
  root.setProperty('--stem-color', stemColors[state.switchType] || stemColors.blue);

  if (state.ledColor) {
    root.setProperty('--led-color', state.ledColor);
    stage.classList.remove('led-off');
  } else {
    stage.classList.add('led-off');
  }

  state.keys.forEach((keyState, i) => {
    const g = keysG.children[i];
    if (!g) return;

    const cap = CAP_COLORS[keyState.capColor] || CAP_COLORS.clear;
    g.style.setProperty('--cap-tint', cap.tint);
    g.style.setProperty('--cap-face', cap.face);

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
        text.setAttribute('fill', d.color || '#e2557f');
        text.setAttribute('font-size', d.value && d.value.length > 1 ? '64' : '92');
      } else {
        text.removeAttribute('fill');
        text.setAttribute('font-size', '92');
      }
    }
  });
}
