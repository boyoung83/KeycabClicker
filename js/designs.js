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

// 키캡 색상 팔레트: 스와치 표시색 + 캡 옆면/윗면의 반투명 틴트
export const CAP_COLORS = {
  clear:  { label: '투명',   swatch: '#eef2fb', tint: 'rgba(236,242,255,0.42)', face: 'rgba(248,250,255,0.34)' },
  pink:   { label: '핑크',   swatch: '#ff9dbf', tint: 'rgba(255,120,170,0.42)', face: 'rgba(255,150,190,0.34)' },
  blue:   { label: '블루',   swatch: '#8ec5ff', tint: 'rgba(90,160,255,0.42)',  face: 'rgba(130,185,255,0.34)' },
  mint:   { label: '민트',   swatch: '#8fe6bd', tint: 'rgba(80,210,160,0.42)',  face: 'rgba(120,225,180,0.34)' },
  yellow: { label: '옐로우', swatch: '#ffd975', tint: 'rgba(255,200,80,0.42)',  face: 'rgba(255,215,120,0.34)' },
  purple: { label: '퍼플',   swatch: '#c9a8ff', tint: 'rgba(170,120,255,0.42)', face: 'rgba(195,160,255,0.34)' },
  smoke:  { label: '스모크', swatch: '#9aa0ad', tint: 'rgba(60,65,80,0.45)',    face: 'rgba(80,86,102,0.38)' },
};

export const LED_COLORS = [
  { id: 'warm',   color: '#ffd166' },
  { id: 'pink',   color: '#ff7eb0' },
  { id: 'blue',   color: '#6fc3ff' },
  { id: 'mint',   color: '#7ef0c0' },
  { id: 'purple', color: '#c58aff' },
  { id: 'off',    color: null },      // LED 끄기
];

export const TEXT_COLORS = ['#e2557f', '#3f7de0', '#2fa46a', '#e09b2f', '#8a5fd6', '#454a55'];
