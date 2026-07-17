// 키캡 안에 넣는 도안 프리셋 (영상의 "무료 도안 30종" 느낌)

export const EMOJI_PRESETS = [
  '🐰', '🐻', '🐱', '🐶', '🐼', '🦊', '🐥', '🦄',
  '🐳', '🍓', '🍑', '🍉', '🍀', '🌸', '🌈', '⭐',
  '🌙', '❤️', '💙', '🎀', '👑', '⚽', '🎮', '🚀',
];

export const PATTERN_PRESETS = [
  { id: 'dots',    label: '도트' },
  { id: 'stripes', label: '줄무늬' },
  { id: 'checker', label: '체크' },
  { id: 'hearts',  label: '하트' },
  { id: 'stars',   label: '별밤' },
  { id: 'rainbow', label: '무지개' },
];

// 키캡 색상 팔레트 (실물 사진 기준 불투명 파스텔): face = 윗면, side = 스커트(옆면)
export const CAP_COLORS = {
  white:    { label: '화이트',  swatch: '#f3f1ea', face: '#f6f4ee', side: '#d9d4c7' },
  sky:      { label: '하늘',    swatch: '#5fcbe8', face: '#63cfe9', side: '#39a9cb' },
  salmon:   { label: '살구',    swatch: '#f7a58f', face: '#f8ab95', side: '#e58165' },
  mint:     { label: '민트',    swatch: '#a9e8c4', face: '#aeeac8', side: '#7fcda1' },
  lavender: { label: '라벤더',  swatch: '#c7b6e4', face: '#cabae6', side: '#a48ed0' },
  lemon:    { label: '레몬',    swatch: '#f9e08a', face: '#fae393', side: '#e3c25e' },
  charcoal: { label: '차콜',    swatch: '#5a5f6a', face: '#60656f', side: '#41454e' },
};

export const LED_COLORS = [
  { id: 'warm',   color: '#ffd166' },
  { id: 'pink',   color: '#ff7eb0' },
  { id: 'blue',   color: '#6fc3ff' },
  { id: 'mint',   color: '#7ef0c0' },
  { id: 'purple', color: '#c58aff' },
  { id: 'off',    color: null },      // LED 끄기
];

export const TEXT_COLORS = ['#ffffff', '#e2557f', '#3f7de0', '#2fa46a', '#8a5fd6', '#454a55'];

// ── 도안을 캔버스에 그리기 (3D 키캡 윗면 데칼 + 설정 미리보기 공용) ──

const PATTERN_PAINTERS = {
  dots(c, s) {
    c.fillStyle = '#ffe0ec'; c.fillRect(0, 0, s, s);
    c.fillStyle = '#ff7eb0';
    const step = s / 4;
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      c.beginPath();
      c.arc(step * (x + 0.5), step * (y + 0.5), step * 0.24, 0, Math.PI * 2);
      c.fill();
    }
  },
  stripes(c, s) {
    c.fillStyle = '#dcefff'; c.fillRect(0, 0, s, s);
    c.fillStyle = '#79bfff';
    c.save(); c.translate(s / 2, s / 2); c.rotate(Math.PI / 4);
    for (let i = -4; i <= 4; i += 2) c.fillRect(i * s / 6 - s / 12, -s, s / 6, s * 2);
    c.restore();
  },
  checker(c, s) {
    c.fillStyle = '#e8fff4'; c.fillRect(0, 0, s, s);
    c.fillStyle = '#8fe6bd';
    const step = s / 4;
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      if ((x + y) % 2 === 0) c.fillRect(x * step, y * step, step, step);
    }
  },
  hearts(c, s) {
    c.fillStyle = '#fff3f0'; c.fillRect(0, 0, s, s);
    c.font = `${s * 0.28}px system-ui`; c.textAlign = 'center'; c.textBaseline = 'middle';
    for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) {
      c.fillText('❤️', s * (x + 0.5) / 3, s * (y + 0.5) / 3 + ((x % 2) ? s * 0.06 : 0));
    }
  },
  stars(c, s) {
    c.fillStyle = '#2b2f55'; c.fillRect(0, 0, s, s);
    c.font = `${s * 0.24}px system-ui`; c.textAlign = 'center'; c.textBaseline = 'middle';
    for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) {
      c.fillText('⭐', s * (x + 0.5) / 3, s * (y + 0.5) / 3 + ((x % 2) ? s * 0.07 : 0));
    }
  },
  rainbow(c, s) {
    const colors = ['#ff8a8a', '#ffca7a', '#fdf389', '#93e6a8', '#8ec5ff', '#c5a3ff'];
    c.save(); c.translate(s / 2, s / 2); c.rotate(Math.PI / 6); c.translate(-s, -s);
    colors.forEach((col, i) => {
      c.fillStyle = col;
      c.fillRect(0, (s * 2 / 6) * i, s * 2, s * 2 / 6 + 1);
    });
    c.restore();
  },
};

// design {type,value,color}을 size×size 캔버스 2D 컨텍스트에 그림 (배경 투명 or 패턴)
export function drawDesign(c, design, size) {
  c.clearRect(0, 0, size, size);
  if (design.type === 'pattern') {
    (PATTERN_PAINTERS[design.value] || PATTERN_PAINTERS.dots)(c, size);
    return;
  }
  const v = design.value || '';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  if (design.type === 'text') {
    c.fillStyle = design.color || '#ffffff';
    c.font = `800 ${v.length > 1 ? size * 0.42 : size * 0.58}px system-ui, sans-serif`;
    // 새김 느낌의 미세한 그림자
    c.shadowColor = 'rgba(0,0,0,0.18)';
    c.shadowBlur = size * 0.015;
    c.shadowOffsetY = size * 0.008;
  } else {
    c.font = `${size * 0.62}px system-ui, sans-serif`;
  }
  c.fillText(v, size / 2, size * 0.54);
  c.shadowColor = 'transparent';
}

// 설정 시트 미리보기용 패턴 썸네일 (dataURL 캐시)
const previewCache = new Map();
export function patternPreviewURL(id) {
  if (previewCache.has(id)) return previewCache.get(id);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 72;
  drawDesign(canvas.getContext('2d'), { type: 'pattern', value: id }, 72);
  const url = canvas.toDataURL();
  previewCache.set(id, url);
  return url;
}
