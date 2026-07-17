// 실사급 3D 장면 (Three.js): 파스텔 키캡 4개 + 아이보리 케이스 + 골드 체인 키링
// - 물리 기반 재질(clearcoat 플라스틱, 금속 골드) + 환경광 + 소프트 섀도우
// - 키캡 누름은 스프링 물리로 손가락을 따라감 (복귀 시 살짝 튕김)
// - 기존 keycap.js와 같은 API: buildScene / applyLayout / initPress / applyVisuals

import * as THREE from './vendor/three.module.min.js';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';
import { CAP_COLORS, drawDesign } from './designs.js';

export const KEY_COUNT = 4;

// 구버전 저장값(반투명 팔레트 이름) → 파스텔 팔레트 매핑
const LEGACY_COLOR = {
  clear: 'white', pink: 'salmon', blue: 'sky',
  yellow: 'lemon', purple: 'lavender', smoke: 'charcoal',
};

// 치수 (cm 감각): 실물 키캡 ≈ 18mm
const CAP_W = 1.8, CAP_H = 0.92, CAP_TAPER = 0.34;
const PITCH = 1.98;
const CASE_H = 1.15;
const CAP_REST = 0.22;    // 케이스 윗면에서 캡 바닥까지 (스위치 갭)
const CAP_PRESSED = 0.06;

const LAYOUTS = {
  row: {
    caps: [[-1.5 * PITCH, 0], [-0.5 * PITCH, 0], [0.5 * PITCH, 0], [1.5 * PITCH, 0]],
    caseSize: [4 * PITCH + 0.9, 2.9],
    camera: { dir: [0.15, 0.72, 0.98], target: [-0.5, -0.3, 0], frameW: 12.2, frameH: 6.5 },
    toyRotY: -0.05,
  },
  grid: {
    caps: [[-0.5 * PITCH, -0.5 * PITCH], [0.5 * PITCH, -0.5 * PITCH], [-0.5 * PITCH, 0.5 * PITCH], [0.5 * PITCH, 0.5 * PITCH]],
    caseSize: [2 * PITCH + 0.9, 2 * PITCH + 0.9],
    camera: { dir: [0.2, 0.85, 1.0], target: [-0.4, -0.2, 0], frameW: 8.1, frameH: 8.1 },
    toyRotY: -0.16,
  },
};
let currentLayout = LAYOUTS.grid;

// ── 모듈 상태 ──
let renderer, scene, camera, toy, chainGroup, caseMesh, caseGeoCache = {};
const caps = [];          // { group, mesh, decal, decalCtx, decalTex, light, y, vy, target, hit }
let ledColorHex = '#ffd166';
let ledOn = true;
let chainKick = 0, chainKickV = 0;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const stage = document.getElementById('stage');
const canvas = document.getElementById('toy');

// ── 재질 ──
const MAT = {
  case: new THREE.MeshPhysicalMaterial({ color: 0xf3efe4, roughness: 0.42, clearcoat: 0.25, clearcoatRoughness: 0.5 }),
  caseBottom: new THREE.MeshStandardMaterial({ color: 0xd8d1c0, roughness: 0.6 }),
  slot: new THREE.MeshStandardMaterial({ color: 0x17181c, roughness: 0.75 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xd9ab45, metalness: 1, roughness: 0.24 }),
  goldDark: new THREE.MeshStandardMaterial({ color: 0xb8902f, metalness: 1, roughness: 0.32 }),
  charm: new THREE.MeshPhysicalMaterial({
    color: 0xff7eb0, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.1,
    transparent: true, opacity: 0.85,
  }),
};

function capMaterial(hex) {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(hex), roughness: 0.34,
    clearcoat: 0.55, clearcoatRoughness: 0.28,
  });
}

// OEM 키캡: 라운드 박스를 위로 갈수록 좁아지게 테이퍼
function capGeometry() {
  const geo = new RoundedBoxGeometry(CAP_W, CAP_H, CAP_W, 4, 0.14);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const t = (y + CAP_H / 2) / CAP_H;            // 0 = 바닥, 1 = 꼭대기
    const s = 1 - CAP_TAPER * t;
    pos.setX(i, pos.getX(i) * s);
    pos.setZ(i, pos.getZ(i) * s);
  }
  geo.computeVertexNormals();
  geo.translate(0, CAP_H / 2, 0);                 // 원점 = 캡 바닥
  return geo;
}

function heartShape() {
  const s = new THREE.Shape();
  const k = 0.34;
  s.moveTo(0, -1.1 * k);
  s.bezierCurveTo(-1.4 * k, -0.2 * k, -1.15 * k, 0.85 * k, 0, 0.35 * k);
  s.bezierCurveTo(1.15 * k, 0.85 * k, 1.4 * k, -0.2 * k, 0, -1.1 * k);
  return s;
}

function torusLink(r, tube) {
  return new THREE.Mesh(new THREE.TorusGeometry(r, tube, 12, 28), MAT.gold);
}

function buildChain() {
  const g = new THREE.Group();

  // 러그 링 (케이스에 걸린 고리)
  const lug = torusLink(0.16, 0.045);
  lug.rotation.y = Math.PI / 2;
  g.add(lug);

  // 체인 링크 2개 (교차 방향)
  const l1 = torusLink(0.17, 0.045);
  l1.position.set(-0.22, 0.26, 0.05);
  l1.rotation.set(0.3, 0.9, 0.4);
  const l2 = torusLink(0.17, 0.045);
  l2.position.set(-0.42, 0.55, 0.1);
  l2.rotation.set(-0.2, 0.2, 0.6);
  g.add(l1, l2);

  // 스위블
  const swivel = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.16, 6, 12), MAT.goldDark);
  swivel.position.set(-0.56, 0.82, 0.13);
  swivel.rotation.z = 0.5;
  g.add(swivel);

  // 가재 클래스프: 열린 토러스 + 게이트 + 꼬리
  const clasp = new THREE.Group();
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.075, 12, 32, Math.PI * 1.55), MAT.gold);
  hook.rotation.z = Math.PI * 0.7;
  const gate = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.34, 6, 12), MAT.goldDark);
  gate.position.set(0.16, -0.24, 0);
  gate.rotation.z = -0.9;
  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), MAT.gold);
  tail.position.set(0.3, -0.32, 0);
  clasp.add(hook, gate, tail);
  clasp.position.set(-0.82, 1.35, 0.16);
  clasp.rotation.z = -0.4;
  g.add(clasp);

  // 아크릴 하트 참 (링크에 매달림)
  const charmRing = torusLink(0.09, 0.03);
  charmRing.position.set(-0.42, 0.32, 0.18);
  const heart = new THREE.Mesh(
    new THREE.ExtrudeGeometry(heartShape(), { depth: 0.07, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 3 }),
    MAT.charm,
  );
  heart.position.set(-0.52, -0.02, 0.24);
  heart.rotation.z = 0.25;
  g.add(charmRing, heart);

  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });
  return g;
}

export function buildScene() {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  scene = new THREE.Scene();

  // 환경광 (금속/플라스틱 반사의 핵심)
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;

  camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);

  // 키 라이트 (부드러운 그림자)
  const key = new THREE.DirectionalLight(0xfff4ec, 2.2);
  key.position.set(3.5, 7, 4.5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -7; key.shadow.camera.right = 7;
  key.shadow.camera.top = 7; key.shadow.camera.bottom = -7;
  key.shadow.radius = 7;
  key.shadow.bias = -0.0004;
  scene.add(key);

  // 핑크 바운스 (배경 테이블 반사광)
  const bounce = new THREE.HemisphereLight(0xfff0f4, 0xffb9cf, 0.5);
  scene.add(bounce);

  toy = new THREE.Group();
  scene.add(toy);

  // 바닥 (그림자 받기 전용)
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.ShadowMaterial({ opacity: 0.16, color: 0x6b2c48 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -CASE_H;
  ground.receiveShadow = true;
  scene.add(ground);

  // 키캡 4개
  const geo = capGeometry();
  for (let i = 0; i < KEY_COUNT; i++) {
    const group = new THREE.Group();

    const mesh = new THREE.Mesh(geo, capMaterial('#eeeeee'));
    mesh.castShadow = true;
    group.add(mesh);

    // 윗면 데칼 (도안)
    const dCanvas = document.createElement('canvas');
    dCanvas.width = dCanvas.height = 256;
    const decalCtx = dCanvas.getContext('2d');
    const decalTex = new THREE.CanvasTexture(dCanvas);
    decalTex.colorSpace = THREE.SRGBColorSpace;
    decalTex.anisotropy = 4;
    const decal = new THREE.Mesh(
      new THREE.PlaneGeometry(1.02, 1.02),
      new THREE.MeshStandardMaterial({ map: decalTex, transparent: true, roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -1 }),
    );
    decal.rotation.x = -Math.PI / 2;
    decal.position.y = CAP_H + 0.004;
    group.add(decal);

    // LED (캡 아래에서 새어나오는 빛)
    const light = new THREE.PointLight(0xffd166, 0, 2.2, 2);
    light.position.y = 0.08;
    group.add(light);

    // 히트 박스 (아이 손가락용, 넉넉하게)
    const hit = new THREE.Mesh(
      new THREE.BoxGeometry(PITCH, CAP_H + CAP_REST + 0.6, PITCH),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    hit.position.y = (CAP_H + CAP_REST) / 2;
    hit.userData.keyIndex = i;
    group.add(hit);

    toy.add(group);
    caps.push({ group, mesh, decalCtx, decalTex, light, hit, y: CAP_REST, vy: 0, target: CAP_REST });
  }

  chainGroup = buildChain();
  toy.add(chainGroup);

  window.addEventListener('resize', resize);
  resize();
  renderer.setAnimationLoop(tick);

  // 테스트/디버깅용: 각 키캡의 화면 좌표
  window.__toyDebug = {
    capsScreen() {
      const r = canvas.getBoundingClientRect();
      return caps.map((c) => {
        const v = new THREE.Vector3(0, CAP_H / 2, 0);
        c.mesh.localToWorld(v).project(camera);
        return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height };
      });
    },
  };
}

function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  updateCamera();
}

// 화면비에 맞춰 장난감 전체(+체인)가 들어오도록 카메라 거리 자동 계산
function updateCamera() {
  const C = currentLayout.camera;
  const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const dist = Math.max(
    (C.frameW / 2) / (tanHalf * camera.aspect),
    (C.frameH / 2) / tanHalf,
  );
  const dir = new THREE.Vector3(...C.dir).normalize();
  const target = new THREE.Vector3(...C.target);
  camera.position.copy(target).addScaledVector(dir, dist);
  camera.lookAt(target);
}

export function applyLayout(layout) {
  const L = LAYOUTS[layout] || LAYOUTS.grid;

  // 케이스 (라운드 박스, 레이아웃별 캐시)
  if (caseMesh) toy.remove(caseMesh);
  if (!caseGeoCache[layout]) {
    const [w, d] = L.caseSize;
    const g = new THREE.Group();
    const body = new THREE.Mesh(new RoundedBoxGeometry(w, CASE_H, d, 3, 0.28), MAT.case);
    body.position.y = -CASE_H / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    g.add(body);
    // 캡 자리의 어두운 슬롯
    for (const [x, z] of L.caps) {
      const slot = new THREE.Mesh(new RoundedBoxGeometry(CAP_W + 0.06, 0.12, CAP_W + 0.06, 2, 0.04), MAT.slot);
      slot.position.set(x, 0.02, z);
      slot.receiveShadow = true;
      g.add(slot);
    }
    caseGeoCache[layout] = g;
  }
  caseMesh = caseGeoCache[layout];
  toy.add(caseMesh);

  const [w] = L.caseSize;
  caps.forEach((c, i) => {
    c.group.position.set(L.caps[i][0], c.y, L.caps[i][1]);
  });
  chainGroup.position.set(-w / 2 - 0.02, -0.25, 0.6);

  currentLayout = L;
  toy.rotation.y = L.toyRotY;
  updateCamera();
}

// ── 스프링 물리 + 렌더 루프 ──
let lastT = 0;
function tick(t) {
  const dt = Math.min(0.033, (t - lastT) / 1000 || 0.016);
  lastT = t;

  for (const c of caps) {
    const pressed = c.target === CAP_PRESSED;
    const k = pressed ? 1400 : 600;          // 내려갈 땐 빠르고 단단하게
    const zeta = pressed ? 1.0 : 0.42;       // 올라올 땐 살짝 튕김
    const damp = 2 * Math.sqrt(k) * zeta;
    // 반암시적 적분 + 지수 감쇠: 프레임이 길어져도 발산하지 않음
    c.vy += k * (c.target - c.y) * dt;
    c.vy *= Math.exp(-damp * dt);
    c.y = Math.min(CAP_REST + 0.25, Math.max(CAP_PRESSED - 0.04, c.y + c.vy * dt));
    c.group.position.y = c.y;

    // LED 페이드
    const goal = pressed && ledOn ? 2.6 : 0;
    c.light.intensity += (goal - c.light.intensity) * Math.min(1, dt * (pressed ? 30 : 7));
  }

  // 체인: idle 흔들림 + 누를 때 반동
  chainKickV += (-chainKick * 90 - chainKickV * 6) * dt;
  chainKick += chainKickV * dt;
  const idle = reducedMotion ? 0 : Math.sin(t / 1400) * 0.045;
  chainGroup.rotation.z = idle + chainKick;
  chainGroup.rotation.x = (reducedMotion ? 0 : Math.sin(t / 1900) * 0.03) + chainKick * 0.4;

  renderer.render(scene, camera);
}

// ── 입력 (Pointer Events + 레이캐스트, 멀티터치/글리산도) ──
export function initPress({ onDown, onUp, isBlocked }) {
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const byPointer = new Map();               // pointerId → keyIndex
  const activeCount = new Array(KEY_COUNT).fill(0);

  const keyFromEvent = (e) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(caps.map((c) => c.hit), false);
    return hits.length ? hits[0].object.userData.keyIndex : -1;
  };

  function press(i) {
    activeCount[i] += 1;
    caps[i].target = CAP_PRESSED;
    chainKickV += 1.6;                       // 반동
    onDown(i);
  }
  function release(i) {
    activeCount[i] = Math.max(0, activeCount[i] - 1);
    if (activeCount[i] === 0) {
      caps[i].target = CAP_REST;
      onUp(i);
    }
  }

  stage.addEventListener('pointerdown', (e) => {
    if (isBlocked()) return;
    const i = keyFromEvent(e);
    if (i < 0) return;
    e.preventDefault();
    try { stage.setPointerCapture(e.pointerId); } catch { /* no-op */ }
    byPointer.set(e.pointerId, i);
    press(i);
  });

  // 글리산도: 누른 채 옆 키로 미끄러뜨리면 드르륵
  stage.addEventListener('pointermove', (e) => {
    if (!byPointer.has(e.pointerId)) return;
    const cur = byPointer.get(e.pointerId);
    const next = keyFromEvent(e);
    if (next >= 0 && next !== cur) {
      release(cur);
      byPointer.set(e.pointerId, next);
      press(next);
    }
  });

  const up = (e) => {
    if (!byPointer.has(e.pointerId)) return;
    const i = byPointer.get(e.pointerId);
    byPointer.delete(e.pointerId);
    release(i);
  };
  stage.addEventListener('pointerup', up);
  stage.addEventListener('pointercancel', up);
  stage.addEventListener('lostpointercapture', up);

  // 키보드 (A/S/D/F = 키 1~4, 스페이스/엔터 = 키 1)
  const KEYMAP = { KeyA: 0, KeyS: 1, KeyD: 2, KeyF: 3, Space: 0, Enter: 0 };
  const held = new Map();
  window.addEventListener('keydown', (e) => {
    if (e.repeat || isBlocked()) return;
    const i = KEYMAP[e.code];
    if (i === undefined || held.has(e.code)) return;
    e.preventDefault();
    held.set(e.code, i);
    press(i);
  });
  window.addEventListener('keyup', (e) => {
    if (!held.has(e.code)) return;
    release(held.get(e.code));
    held.delete(e.code);
  });

  stage.addEventListener('contextmenu', (e) => e.preventDefault());
  stage.addEventListener('dblclick', (e) => e.preventDefault());
}

// ── 상태 → 3D 반영 ──
export function applyVisuals(state) {
  ledOn = !!state.ledColor;
  if (state.ledColor) ledColorHex = state.ledColor;

  state.keys.forEach((keyState, i) => {
    const c = caps[i];
    if (!c) return;

    const colorId = CAP_COLORS[keyState.capColor] ? keyState.capColor : LEGACY_COLOR[keyState.capColor];
    const cap = CAP_COLORS[colorId] || CAP_COLORS.white;
    c.mesh.material.color.set(cap.swatch);

    drawDesign(c.decalCtx, keyState.design, 256);
    c.decalTex.needsUpdate = true;

    c.light.color.set(ledColorHex);
  });
}
