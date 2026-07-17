// AudioContext 수명주기 + 마스터 버스
// - 첫 사용자 제스처 안에서 lazy 생성 (iOS/Chrome 자동재생 정책)
// - 모든 히트는 masterGain → 컴프레서 → destination (연타 시 클리핑 방지)

let _ctx = null;
let _master = null;
let _noise = null;

export function ensure() {
  if (!_ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    _ctx = new AC({ latencyHint: 'interactive' });

    const comp = _ctx.createDynamicsCompressor();
    comp.threshold.value = -12;
    comp.ratio.value = 4;
    comp.attack.value = 0.002;
    comp.release.value = 0.1;

    _master = _ctx.createGain();
    _master.gain.value = 0.9;
    _master.connect(comp);
    comp.connect(_ctx.destination);

    // 공유 화이트 노이즈 버퍼 (히트마다 새 소스, 버퍼는 재사용)
    const len = Math.floor(_ctx.sampleRate * 0.5);
    const buf = _ctx.createBuffer(1, len, _ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    _noise = buf;

    // iOS 언락: 무음 버퍼 1샘플 재생
    const s = _ctx.createBufferSource();
    s.buffer = _ctx.createBuffer(1, 1, _ctx.sampleRate);
    s.connect(_ctx.destination);
    s.start(0);
  }
  // iOS의 'interrupted' 상태 포함, 매 제스처마다 기회주의적으로 resume
  if (_ctx.state !== 'running') _ctx.resume();
  return _ctx;
}

export const ctx = () => _ctx;
export const bus = () => _master;
export const noiseBuffer = () => _noise;

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && _ctx && _ctx.state !== 'running') {
    _ctx.resume();
  }
});
