// localStorage 영속화 (버전 키 + 디바운스 저장)

const KEY = 'keycap-keyring:v1';

export const DEFAULTS = {
  count: 0,
  switchType: 'blue',                       // 'blue' | 'brown' | 'red'
  capColor: 'clear',
  design: { type: 'emoji', value: '🐰' },   // {type:'emoji'|'pattern'|'text', value, color?}
  ledColor: '#ffd166',                      // null이면 LED 끔
  soundOn: true,
  hapticsOn: true,
};

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed, design: { ...DEFAULTS.design, ...(parsed.design || {}) } };
  } catch {
    return { ...DEFAULTS };
  }
}

let pending = null;
let timer = 0;

export function save(state) {
  pending = state;
  clearTimeout(timer);
  timer = setTimeout(flush, 500);
}

export function flush() {
  if (!pending) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(pending));
  } catch { /* 저장 실패(시크릿 모드 등)해도 앱은 계속 동작 */ }
  pending = null;
}

// 탭이 백그라운드로 갈 때 확실히 저장 (beforeunload는 모바일에서 불안정)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flush();
});
