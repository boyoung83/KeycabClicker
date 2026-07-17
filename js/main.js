// 엔트리: 상태 로드 → 장면 구성 → 비주얼 적용 → 입력/사운드/카운터/설정 연결

import { load, save } from './storage.js';
import { buildScene, applyLayout, initPress, applyVisuals } from './scene3d.js';
import { initSettings, isOpen } from './settings.js';
import { initGames, handleGamePress } from './games.js';
import { playDown, playUp } from './audio/switches.js';
import * as haptics from './haptics.js';

const state = load();

buildScene();
applyLayout(state.layout);
applyVisuals(state);

const counterEl = document.getElementById('counter');
const renderCount = () => { counterEl.textContent = state.count.toLocaleString('ko-KR'); };
renderCount();

initPress({
  isBlocked: isOpen,
  onDown(i) {
    // 지연에 민감한 순서: 소리 → 진동 → 화면 → 게임 → 저장
    if (state.soundOn) playDown(state.switchType);
    if (state.hapticsOn) haptics.tap(state.switchType);
    state.count += 1;
    renderCount();
    counterEl.classList.remove('pop');
    void counterEl.offsetWidth;
    counterEl.classList.add('pop');
    handleGamePress(i);
    save(state);
  },
  onUp() {
    if (state.soundOn) playUp(state.switchType);
  },
});

initGames(state, save);

initSettings(
  state,
  (s) => {
    applyLayout(s.layout);
    applyVisuals(s);
    renderCount();
    save(s);
  },
  (switchType) => playDown(switchType), // 스위치 선택 시 미리듣기
);

// ── 카운터 리셋 (숫자 옆 버튼, 누르면 즉시 초기화) ──
document.getElementById('resetBtn').addEventListener('click', () => {
  state.count = 0;
  renderCount();
  save(state);
});

// 오프라인 지원 (단일 파일 배포본에선 window.__NO_SW__로 비활성화)
if (!window.__NO_SW__ && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { /* 등록 실패해도 앱은 동작 */ });
  });
}
