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
