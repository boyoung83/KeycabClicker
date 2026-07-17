// 키캡 비주얼 컨트롤러 + 누름 상태 머신
// - Pointer Events만 사용 (touch/mouse 이중 발화 원천 차단)
// - setPointerCapture로 빠른 연타에서도 pointerup을 놓치지 않음
// - 멀티터치: 활성 포인터 Set — 손가락이 하나라도 닿아 있으면 눌린 상태 유지,
//   단 pointerdown마다 소리/카운트는 매번 발생 (두 엄지로 드럼치기 가능)

import { CAP_COLORS } from './designs.js';

const stage = document.getElementById('stage');
const keyring = document.getElementById('keyring');
const designText = document.getElementById('designText');
const designPattern = document.getElementById('designPattern');

export function initPress({ onDown, onUp, isBlocked }) {
  const active = new Set();

  stage.addEventListener('pointerdown', (e) => {
    if (isBlocked()) return;
    e.preventDefault();
    try { stage.setPointerCapture(e.pointerId); } catch { /* no-op */ }
    active.add(e.pointerId);
    press();
  });

  const release = (e) => {
    if (!active.has(e.pointerId)) return;
    active.delete(e.pointerId);
    if (active.size === 0) releaseAll();
  };
  stage.addEventListener('pointerup', release);
  stage.addEventListener('pointercancel', release);
  stage.addEventListener('lostpointercapture', release);

  // 키보드 (스페이스/엔터) — 데스크톱 보너스
  let keyHeld = false;
  window.addEventListener('keydown', (e) => {
    if (e.repeat || keyHeld || isBlocked()) return;
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      keyHeld = true;
      press();
    }
  });
  window.addEventListener('keyup', (e) => {
    if (!keyHeld) return;
    if (e.code === 'Space' || e.code === 'Enter') {
      keyHeld = false;
      if (active.size === 0) releaseAll();
    }
  });

  function press() {
    stage.classList.add('is-pressed');
    // 키링 반동 애니메이션 재시작
    keyring.classList.remove('kick');
    void keyring.getBoundingClientRect();
    keyring.classList.add('kick');
    onDown();
  }

  function releaseAll() {
    stage.classList.remove('is-pressed');
    onUp();
  }

  // 길게 눌러 나오는 메뉴/더블탭 확대 차단
  stage.addEventListener('contextmenu', (e) => e.preventDefault());
  stage.addEventListener('dblclick', (e) => e.preventDefault());
}

// 상태 → SVG/CSS 반영
export function applyVisuals(state) {
  const root = document.documentElement.style;

  const cap = CAP_COLORS[state.capColor] || CAP_COLORS.clear;
  root.setProperty('--cap-tint', cap.tint);
  root.setProperty('--cap-face', cap.face);

  const stemColors = { blue: '#2f9dff', brown: '#9d7362', red: '#ff5f5f' };
  root.setProperty('--stem-color', stemColors[state.switchType] || stemColors.blue);

  if (state.ledColor) {
    root.setProperty('--led-color', state.ledColor);
    stage.classList.remove('led-off');
  } else {
    stage.classList.add('led-off');
  }

  // 도안
  const d = state.design;
  if (d.type === 'pattern') {
    designPattern.setAttribute('visibility', 'visible');
    designPattern.setAttribute('fill', `url(#pat-${d.value})`);
    designText.textContent = '';
  } else {
    designPattern.setAttribute('visibility', 'hidden');
    designText.textContent = d.value || '';
    if (d.type === 'text') {
      designText.setAttribute('fill', d.color || '#e2557f');
      designText.setAttribute('font-size', d.value && d.value.length > 1 ? '64' : '88');
    } else {
      designText.removeAttribute('fill');
      designText.setAttribute('font-size', '88');
    }
  }
}
