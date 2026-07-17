// localStorage 영속화 (버전 키 + 디바운스 저장)

const KEY = 'keycap-keyring:v2';
const LEGACY_KEY = 'keycap-keyring:v1';

export const DEFAULTS = {
  count: 0,
  switchType: 'blue',                       // 'blue' | 'brown' | 'red'
  layout: 'grid',                           // 'row' (1×4) | 'grid' (2×2)
  keys: [                                   // 키 4개 각각의 색/도안 (실물 사진의 파스텔 4색)
    { capColor: 'sky',      design: { type: 'emoji', value: '🐰' } },
    { capColor: 'salmon',   design: { type: 'emoji', value: '🍓' } },
    { capColor: 'mint',     design: { type: 'emoji', value: '⭐' } },
    { capColor: 'lavender', design: { type: 'emoji', value: '❤️' } },
  ],
  ledColor: '#ffd166',                      // null이면 LED 끔
  soundOn: true,
  hapticsOn: true,
  games: { simon: 0, mole: 0, speed: 0, rhythm: 0, speedRanks: [] },  // 게임별 최고 기록 + 연타 TOP5
};

function cloneDefaults() {
  return JSON.parse(JSON.stringify(DEFAULTS));
}

// 옛 반투명 팔레트 색상 이름 → 현 파스텔 팔레트 (로드 시 한 번 정규화)
const LEGACY_COLOR = {
  clear: 'white', pink: 'salmon', blue: 'sky',
  yellow: 'lemon', purple: 'lavender', smoke: 'charcoal',
};
const normalizeColor = (id) => LEGACY_COLOR[id] || id;

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const state = { ...cloneDefaults(), ...parsed };
      // keys 배열 검증: 4개 미만/형식 오류 시 기본값으로 채움
      const defKeys = cloneDefaults().keys;
      state.keys = defKeys.map((def, i) => {
        const k = Array.isArray(parsed.keys) ? parsed.keys[i] : null;
        return k && k.design ? { ...def, ...k, design: { ...def.design, ...k.design } } : def;
      });
      state.keys.forEach((k) => { k.capColor = normalizeColor(k.capColor); });
      state.games = { ...cloneDefaults().games, ...(parsed.games || {}) };
      if (!Array.isArray(state.games.speedRanks)) state.games.speedRanks = [];
      return state;
    }
    // v1(1구 버전)에서 마이그레이션: 기존 키캡 설정을 첫 번째 키로 이어받음
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const v1 = JSON.parse(legacy);
      const state = cloneDefaults();
      state.count = v1.count || 0;
      state.switchType = v1.switchType || state.switchType;
      state.ledColor = 'ledColor' in v1 ? v1.ledColor : state.ledColor;
      state.soundOn = v1.soundOn !== false;
      state.hapticsOn = v1.hapticsOn !== false;
      if (v1.capColor) state.keys[0].capColor = normalizeColor(v1.capColor);
      if (v1.design) state.keys[0].design = v1.design;
      return state;
    }
    return cloneDefaults();
  } catch {
    return cloneDefaults();
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
