// 게임 모드 4종: 따라 누르기(사이먼) / 반짝 키 잡기 / 10초 연타 / 리듬 키캡
// - 모든 게임은 run 토큰으로 타이머를 무효화 (모드 전환 시 즉시 중단)
// - 게임이 끝난 뒤(phase 'over') 아무 키나 누르면 같은 게임 재시작

import { flashKey, setKeyGlow, clearAllGlow, setDim, KEY_COUNT } from './scene3d.js';
import { playDown, playUp } from './audio/switches.js';
import { playFx } from './audio/fx.js';

let state, saveState;
let mode = 'free';
let phase = 'idle';           // idle | show | play | over
let run = 0;                  // 타이머 무효화 토큰

const hud = document.getElementById('gameHud');
const hudBig = document.getElementById('hudBig');
const hudSub = document.getElementById('hudSub');
const hudRank = document.getElementById('hudRank');
const startBtn = document.getElementById('startBtn');
const modeBar = document.getElementById('modeBar');

const rand4 = () => Math.floor(Math.random() * KEY_COUNT);
const now = () => performance.now();
const sw = () => state.switchType;

function setHud(big, sub = '') {
  hud.hidden = mode === 'free';
  hudBig.textContent = big;
  hudSub.textContent = sub;
}

function best(key) { return state.games[key] || 0; }
function updateBest(key, value) {
  if (value > best(key)) {
    state.games[key] = value;
    saveState(state);
    return true;
  }
  return false;
}

function pause(ms, my) {
  return new Promise((res) => setTimeout(() => res(my === run), ms));
}

// 시퀀스 재생용: 키를 누르는 모습 + 소리
function ghostPress(k, dur = 240) {
  flashKey(k, dur);
  playDown(sw());
  setTimeout(() => playUp(sw()), dur - 40);
}

/* ══════════ 따라 누르기 (사이먼) ══════════ */
let seq = [], seqIdx = 0, replayTimer = 0;

async function simonStart() {
  const my = ++run;
  seq = [];
  phase = 'show';
  setHud('잘 보고 따라 누르세요! 🧠', `최고 기록 ${best('simon')}단계`);
  if (!await pause(1100, my)) return;
  seq.push(rand4());
  simonPlay(my);
}

// 시퀀스 시연 → 입력 대기. 입력이 한동안 없으면 자동으로 다시 보여줌
async function simonPlay(my, label = '잘 보세요...') {
  clearTimeout(replayTimer);
  const round = seq.length;
  phase = 'show';
  setHud(`${round}단계`, label);
  if (!await pause(700, my)) return;
  const gap = Math.max(400, 700 - round * 25);
  for (const k of seq) {
    if (my !== run) return;
    ghostPress(k, Math.min(320, gap - 120));
    if (!await pause(gap, my)) return;
  }
  seqIdx = 0;
  phase = 'play';
  setHud(`${round}단계 — 따라 누르세요!`, `최고 기록 ${best('simon')}단계`);
  armReplay(my);
}

function armReplay(my) {
  clearTimeout(replayTimer);
  replayTimer = setTimeout(() => {
    if (my === run && mode === 'simon' && phase === 'play') {
      simonPlay(my, '다시 보여줄게요! 👀');
    }
  }, 6000);
}

function simonPress(i) {
  if (phase !== 'play') return;
  if (i === seq[seqIdx]) {
    seqIdx += 1;
    armReplay(run);              // 입력이 이어지는 동안 재시연 타이머 리셋
    if (seqIdx === seq.length) {
      clearTimeout(replayTimer);
      phase = 'show';
      playFx('success');
      const round = seq.length;
      const isNew = updateBest('simon', round);
      setHud(`${round}단계 성공! 🎉`, isNew ? '✨ 최고 기록!' : '');
      const my = run;
      setTimeout(() => {
        if (my !== run) return;
        seq.push(rand4());
        simonPlay(my);
      }, 1000);
    }
  } else {
    clearTimeout(replayTimer);
    phase = 'over';
    playFx('fail');
    setHud(`아쉬워요! ${seq.length - 1}단계까지 성공`, '아무 키나 누르면 다시 시작');
  }
}

/* ══════════ 반짝 키 잡기 (두더지) ══════════ */
let moleScore = 0, moleTarget = -1, moleTimer = 0;

async function moleStart() {
  const my = ++run;
  moleScore = 0;
  phase = 'show';
  for (const n of ['3', '2', '1']) {
    setHud(n, '반짝이는 키를 빨리 잡으세요! ⚡');
    playFx('tick');
    if (!await pause(700, my)) return;
  }
  moleNext(my);
}

async function moleNext(my) {
  phase = 'show';
  setKeyGlow(moleTarget, false);
  if (!await pause(250 + Math.random() * 550, my)) return;
  moleTarget = rand4();
  setKeyGlow(moleTarget, true);
  playFx('tick');
  phase = 'play';
  setHud(`${moleScore}마리`, `최고 기록 ${best('mole')}마리`);
  const windowMs = Math.max(650, 1500 - moleScore * 55);
  clearTimeout(moleTimer);
  moleTimer = setTimeout(() => { if (my === run && phase === 'play') moleOver('시간 초과!'); }, windowMs);
}

function moleOver(reason) {
  phase = 'over';
  clearTimeout(moleTimer);
  setKeyGlow(moleTarget, false);
  playFx('fail');
  const isNew = updateBest('mole', moleScore);
  setHud(`${reason} ${moleScore}마리 잡았어요`, isNew ? '✨ 최고 기록! 아무 키나 누르면 다시' : '아무 키나 누르면 다시 시작');
}

function molePress(i) {
  if (phase !== 'play') return;
  if (i === moleTarget) {
    clearTimeout(moleTimer);
    setKeyGlow(moleTarget, false);
    moleScore += 1;
    playFx('good');
    setHud(`${moleScore}마리`, `최고 기록 ${best('mole')}마리`);
    moleNext(run);
  } else {
    moleOver('앗, 다른 키!');
  }
}

/* ══════════ 10초 연타 챌린지 (TOP 5 랭킹) ══════════ */
let speedCount = 0, speedEnd = 0, speedTicker = 0;

const RANK_MEDALS = ['🥇', '🥈', '🥉', '4위', '5위'];

function showRanks() {
  const ranks = state.games.speedRanks;
  const rows = ranks.length
    ? ranks.map((s, i) => `<div>${RANK_MEDALS[i]} ${s}번</div>`).join('')
    : '<div>기록 없음</div>';
  hudRank.innerHTML = `<b>🏆 랭킹</b>${rows}`;
  hudRank.hidden = false;
}

function hideRanks() { hudRank.hidden = true; }

// 연타 진입 화면: 랭킹을 보여주고 키를 누르면 시작
function speedEnter() {
  ++run;
  clearInterval(speedTicker);
  phase = 'ready';
  setHud('10초 연타 챌린지 ⏱️', '준비되면 시작 버튼!');
  showRanks();
  startBtn.textContent = '▶ 시작!';
  startBtn.hidden = false;
}

async function speedRun() {
  const my = ++run;
  startBtn.hidden = true;
  phase = 'show';
  for (const n of ['3', '2', '1']) {
    setHud(n, '10초 동안 최대한 많이! ⏱️');
    playFx('tick');
    if (!await pause(700, my)) return;
  }
  speedCount = 0;
  speedEnd = now() + 10000;
  phase = 'play';
  playFx('good');
  clearInterval(speedTicker);
  speedTicker = setInterval(() => {
    if (my !== run) { clearInterval(speedTicker); return; }
    const remain = Math.max(0, speedEnd - now());
    setHud(`${speedCount}번`, `남은 시간 ${(remain / 1000).toFixed(1)}초`);
    if (remain <= 0) {
      clearInterval(speedTicker);
      phase = 'over';
      playFx('success');
      updateBest('speed', speedCount);
      // TOP 5 랭킹 갱신
      const ranks = [...state.games.speedRanks, speedCount].sort((a, b) => b - a).slice(0, 5);
      state.games.speedRanks = ranks;
      saveState(state);
      const place = ranks.indexOf(speedCount) + 1;
      setHud(`끝! ${speedCount}번 딸깍! 🎉`,
        place >= 1 ? `${RANK_MEDALS[place - 1]} ${place}위 기록!` : '수고했어요!');
      showRanks();
      startBtn.textContent = '▶ 다시 도전!';
      startBtn.hidden = false;
    }
  }, 100);
}

function speedPress() {
  if (phase === 'play') speedCount += 1;
}

/* ══════════ 리듬 키캡 ══════════ */
const BEAT = 620;             // ≈97 BPM
const LEAD = 520;             // 노트 예고(불빛) 시간
const WINDOW_GOOD = 300, WINDOW_PERFECT = 150;
let notes = [], rhythmScore = 0;

async function rhythmStart() {
  const my = ++run;
  phase = 'show';
  rhythmScore = 0;
  for (const n of ['3', '2', '1']) {
    setHud(n, '불이 켜지면 박자에 맞춰 누르세요! 🎵');
    playFx('tick');
    if (!await pause(700, my)) return;
  }
  // 16박 패턴 생성 (박자당 75% 확률, 최소 10개)
  notes = [];
  const start = now() + 1200;
  for (let b = 0; b < 16; b++) {
    if (Math.random() < 0.75 || notes.length < (b + 1) * 0.6) {
      notes.push({ key: rand4(), t: start + b * BEAT, hit: false, missed: false });
    }
  }
  phase = 'play';
  setHud('0점', `최고 기록 ${best('rhythm')}점`);

  for (const note of notes) {
    const untilLead = note.t - LEAD - now();
    if (!await pause(Math.max(0, untilLead), my)) return;
    setKeyGlow(note.key, true);
    // 판정 종료 시점에 놓침 처리 + 불 끄기
    setTimeout(() => {
      if (my !== run) return;
      setKeyGlow(note.key, false);
      if (!note.hit) { note.missed = true; setHud(`${rhythmScore}점`, '놓쳤어요 😅'); }
    }, LEAD + WINDOW_GOOD);
  }
  const last = notes[notes.length - 1];
  if (!await pause(last.t + WINDOW_GOOD + 600 - now(), my)) return;
  phase = 'over';
  playFx('success');
  const maxScore = notes.length * 2;
  const isNew = updateBest('rhythm', rhythmScore);
  setHud(`연주 끝! ${rhythmScore}점 / ${maxScore}점`, isNew ? '✨ 최고 기록! 아무 키나 누르면 다시' : '아무 키나 누르면 다시 시작');
}

function rhythmPress(i) {
  if (phase !== 'play') return;
  const t = now();
  let bestNote = null, bestDt = Infinity;
  for (const n of notes) {
    if (n.hit || n.missed || n.key !== i) continue;
    const dt = Math.abs(t - n.t);
    if (dt < bestDt) { bestDt = dt; bestNote = n; }
  }
  if (bestNote && bestDt <= WINDOW_GOOD) {
    bestNote.hit = true;
    setKeyGlow(bestNote.key, false);
    if (bestDt <= WINDOW_PERFECT) {
      rhythmScore += 2;
      playFx('perfect');
      setHud(`${rhythmScore}점`, '완벽해요! ✨');
    } else {
      rhythmScore += 1;
      playFx('good');
      setHud(`${rhythmScore}점`, '좋아요!');
    }
  }
}

/* ══════════ 모드 관리 ══════════ */
const STARTERS = { simon: simonStart, mole: moleStart, speed: speedEnter, rhythm: rhythmStart };
const PRESSERS = { simon: simonPress, mole: molePress, speed: speedPress, rhythm: rhythmPress };

export function setMode(m) {
  run += 1;                    // 진행 중인 모든 타이머 무효화
  clearTimeout(moleTimer);
  clearTimeout(replayTimer);
  clearInterval(speedTicker);
  clearAllGlow();
  hideRanks();
  mode = m;
  phase = 'idle';
  startBtn.hidden = true;
  // 불빛을 봐야 하는 게임은 장면을 톤다운해 반짝임이 잘 보이게
  setDim(m === 'simon' || m === 'mole' || m === 'rhythm');
  [...modeBar.children].forEach((b) => b.classList.toggle('selected', b.dataset.mode === m));
  if (m === 'free') {
    hud.hidden = true;
  } else {
    STARTERS[m]();
  }
}

export function handleGamePress(i) {
  if (mode === 'free') return;
  if (phase === 'over') {
    if (mode === 'speed') return;   // 연타는 전용 시작 버튼으로만 재시작
    STARTERS[mode]();
    return;
  }
  PRESSERS[mode](i);
}

export function initGames(appState, save) {
  state = appState;
  saveState = save;
  [...modeBar.children].forEach((b) => {
    b.addEventListener('click', () => setMode(b.dataset.mode));
  });
  startBtn.addEventListener('click', () => {
    if (mode === 'speed' && (phase === 'ready' || phase === 'over')) speedRun();
  });
  // 테스트/디버깅용
  window.__gameDebug = () => ({ mode, phase, seq: [...seq], moleTarget, speedCount, rhythmScore });
}
