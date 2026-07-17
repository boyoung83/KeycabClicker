// 설정 바텀 시트: 배치/스위치/키 선택/색상/도안/LED/효과/카운터
// 색상·도안·이름은 "꾸밀 키 고르기"에서 선택한 키에만 적용된다.

import { EMOJI_PRESETS, PATTERN_PRESETS, CAP_COLORS, LED_COLORS, TEXT_COLORS, patternPreviewURL } from './designs.js';
import * as haptics from './haptics.js';

const sheet = document.getElementById('sheet');
const backdrop = document.getElementById('sheetBackdrop');
const btn = document.getElementById('settingsBtn');

let _open = false;
export const isOpen = () => _open;

export function initSettings(state, onChange, previewSound) {
  let selectedKey = 0;

  // ── 열기/닫기 ──
  const open = () => {
    _open = true;
    sheet.hidden = false;
    backdrop.hidden = false;
    requestAnimationFrame(() => {
      sheet.classList.add('open');
      backdrop.classList.add('open');
    });
  };
  const close = () => {
    _open = false;
    sheet.classList.remove('open');
    backdrop.classList.remove('open');
    setTimeout(() => { sheet.hidden = true; backdrop.hidden = true; }, 260);
  };
  btn.addEventListener('click', () => (_open ? close() : open()));
  backdrop.addEventListener('pointerdown', close);

  // ── 배치 (1×4 / 2×2) ──
  const layoutCards = [...document.querySelectorAll('.layout-card')];
  const syncLayout = () => layoutCards.forEach((c) =>
    c.classList.toggle('selected', c.dataset.layout === state.layout));
  layoutCards.forEach((card) => card.addEventListener('click', () => {
    state.layout = card.dataset.layout;
    syncLayout();
    onChange(state);
  }));
  syncLayout();

  // ── 스위치 종류 ──
  const switchCards = [...document.querySelectorAll('.switch-card')];
  const syncSwitch = () => switchCards.forEach((c) =>
    c.classList.toggle('selected', c.dataset.switch === state.switchType));
  switchCards.forEach((card) => card.addEventListener('click', () => {
    state.switchType = card.dataset.switch;
    syncSwitch();
    onChange(state);
    previewSound(state.switchType); // 즉시 미리듣기
  }));
  syncSwitch();

  // ── 꾸밀 키 선택 탭 ──
  const keyTabs = document.getElementById('keyTabs');
  state.keys.forEach((_, i) => {
    const b = document.createElement('button');
    b.className = 'key-tab';
    b.dataset.index = String(i);
    b.addEventListener('click', () => {
      selectedKey = i;
      syncKeyTabs();
      syncColor();
      syncDesign();
      syncText();
    });
    keyTabs.appendChild(b);
  });
  const keyPreview = (k) => {
    if (k.design.type === 'pattern') {
      const pat = PATTERN_PRESETS.find((p) => p.id === k.design.value);
      return pat ? pat.label : '무늬';
    }
    return k.design.value || '?';
  };
  const syncKeyTabs = () => {
    [...keyTabs.children].forEach((tab, i) => {
      tab.classList.toggle('selected', i === selectedKey);
      tab.innerHTML = `<small>키 ${i + 1}</small><span>${keyPreview(state.keys[i])}</span>`;
      const sw = CAP_COLORS[state.keys[i].capColor] || CAP_COLORS.white;
      tab.style.setProperty('--tab-color', sw.swatch);
    });
  };

  // ── 키캡 색상 (선택된 키에 적용) ──
  const colorRow = document.getElementById('colorPicker');
  for (const [id, c] of Object.entries(CAP_COLORS)) {
    const b = document.createElement('button');
    b.className = 'swatch';
    b.style.setProperty('--sw', c.swatch);
    b.title = c.label;
    b.dataset.id = id;
    b.addEventListener('click', () => {
      state.keys[selectedKey].capColor = id;
      syncColor();
      syncKeyTabs();
      onChange(state);
    });
    colorRow.appendChild(b);
  }
  const syncColor = () => syncSel(colorRow, state.keys[selectedKey].capColor);

  // ── 도안 그리드 (이모지 + 패턴, 선택된 키에 적용) ──
  const grid = document.getElementById('designPicker');
  for (const emoji of EMOJI_PRESETS) {
    const b = document.createElement('button');
    b.className = 'design-cell';
    b.textContent = emoji;
    b.dataset.key = `emoji:${emoji}`;
    b.addEventListener('click', () => {
      state.keys[selectedKey].design = { type: 'emoji', value: emoji };
      syncDesign();
      syncKeyTabs();
      onChange(state);
    });
    grid.appendChild(b);
  }
  for (const pat of PATTERN_PRESETS) {
    const b = document.createElement('button');
    b.className = 'design-cell';
    b.title = pat.label;
    b.dataset.key = `pattern:${pat.id}`;
    // 3D 데칼과 같은 캔버스 페인터로 그린 썸네일
    b.innerHTML = `<img src="${patternPreviewURL(pat.id)}" alt="${pat.label}">`;
    b.addEventListener('click', () => {
      state.keys[selectedKey].design = { type: 'pattern', value: pat.id };
      syncDesign();
      syncKeyTabs();
      onChange(state);
    });
    grid.appendChild(b);
  }
  const syncDesign = () => {
    const d = state.keys[selectedKey].design;
    const key = `${d.type}:${d.value}`;
    [...grid.children].forEach((c) => c.classList.toggle('selected', c.dataset.key === key));
  };

  // ── 직접 만들기 (텍스트 + 글자색, 선택된 키에 적용) ──
  const textInput = document.getElementById('customText');
  const textColorRow = document.getElementById('textColorPicker');
  let textColor = TEXT_COLORS[0];
  for (const color of TEXT_COLORS) {
    const b = document.createElement('button');
    b.className = 'swatch';
    b.style.setProperty('--sw', color);
    b.dataset.id = color;
    b.addEventListener('click', () => {
      textColor = color;
      syncSel(textColorRow, color);
      if (textInput.value.trim()) applyText();
    });
    textColorRow.appendChild(b);
  }
  const applyText = () => {
    const v = textInput.value.trim();
    if (!v) return;
    state.keys[selectedKey].design = { type: 'text', value: v, color: textColor };
    syncDesign();
    syncKeyTabs();
    onChange(state);
  };
  textInput.addEventListener('input', applyText);
  const syncText = () => {
    const d = state.keys[selectedKey].design;
    if (d.type === 'text') {
      textInput.value = d.value;
      textColor = d.color || TEXT_COLORS[0];
    } else {
      textInput.value = '';
    }
    syncSel(textColorRow, textColor);
  };

  // 첫 동기화
  syncKeyTabs();
  syncColor();
  syncDesign();
  syncText();

  // ── LED 색상 ──
  const ledRow = document.getElementById('ledPicker');
  for (const led of LED_COLORS) {
    const b = document.createElement('button');
    b.className = 'swatch' + (led.color ? '' : ' led-off-swatch');
    if (led.color) b.style.setProperty('--sw', led.color);
    else b.textContent = '✕';
    b.dataset.id = led.id;
    b.addEventListener('click', () => {
      state.ledColor = led.color;
      syncSel(ledRow, led.id);
      onChange(state);
    });
    ledRow.appendChild(b);
  }
  syncSel(ledRow, (LED_COLORS.find((l) => l.color === state.ledColor) || LED_COLORS[0]).id);

  // ── 효과 토글 ──
  const soundToggle = document.getElementById('soundToggle');
  soundToggle.checked = state.soundOn;
  soundToggle.addEventListener('change', () => {
    state.soundOn = soundToggle.checked;
    onChange(state);
  });

  const hapticsToggle = document.getElementById('hapticsToggle');
  if (!haptics.supported) {
    document.getElementById('hapticsRow').style.display = 'none';
  } else {
    hapticsToggle.checked = state.hapticsOn;
    hapticsToggle.addEventListener('change', () => {
      state.hapticsOn = hapticsToggle.checked;
      onChange(state);
    });
  }

}

function syncSel(row, id) {
  [...row.children].forEach((c) => c.classList.toggle('selected', c.dataset.id === id));
}
