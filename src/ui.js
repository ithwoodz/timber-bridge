/* ───────────────── 모델·프리셋 ───────────────── */
const CM = 5;                                  // 격자 1칸 = 5 cm
const MATMAP = { wood1: { wood: 1 }, wood2: { wood: 2 }, wood3: { wood: 3 }, wood10: { wood: BIG }, steel: { steel: true } };
function blankModel() { return { segs: {}, plan: {}, wraps: {}, loadType: 'udl', udl: { y: 0, x0: 0, x1: 12 }, load: nk(6, 0), width: 2, bracingOn: true, name: '빈 캔버스' }; }
function setPlan(m, y, xa, xb, mat) {
  const k = planKey(y, xa, xb);
  const p = m.plan[k] || (m.plan[k] = { y, xa, xb, wood: 0, steel: false });
  if (mat.wood) p.wood = mat.wood;
  if (mat.steel) p.steel = true;
}
function autoBrace(m, y) {
  const xs = nodesAtLevel(m, y);
  for (const x of xs) setPlan(m, y, x, x, { wood: 1 });
  for (let i = 0; i < xs.length - 1; i++) if (chordPath(m, y, xs[i], xs[i + 1])) {
    setPlan(m, y, xs[i], xs[i + 1], { wood: 1 }); setPlan(m, y, xs[i + 1], xs[i], { wood: 1 });
  }
}
function build(name, list) {
  const m = blankModel(); m.name = name;
  for (const [x1, y1, x2, y2, mt] of list) addMember(m, { x: x1, y: y1 }, { x: x2, y: y2 }, MATMAP[mt]);
  const ls = levelsOf(m); autoBrace(m, 0); if (ls[0] !== 0) autoBrace(m, ls[0]);
  return m;
}
function prattList(h, steel) {
  const L = [];
  for (let x = 0; x < 12; x += 2) L.push([x, 0, x + 2, 0, 'wood1']);
  for (let x = 2; x < 10; x += 2) L.push([x, h, x + 2, h, 'wood2']);
  L.push([0, 0, 2, h, 'wood2'], [12, 0, 10, h, 'wood2']);
  for (let x = 2; x <= 10; x += 2) L.push([x, 0, x, h, 'wood1']);
  L.push([2, h, 4, 0, 'wood1'], [4, h, 6, 0, 'wood1'], [10, h, 8, 0, 'wood1'], [8, h, 6, 0, 'wood1']);
  if (steel) for (let x = 0; x < 12; x += 2) L.push([x, 0, x + 2, 0, 'steel']);
  return L;
}
function warrenList() {
  const L = [];
  for (let x = 0; x < 12; x += 2) L.push([x, 0, x + 2, 0, 'wood1']);
  for (let x = 1; x < 11; x += 2) L.push([x, 3, x + 2, 3, 'wood2']);
  for (let x = 0; x < 12; x += 2) L.push([x, 0, x + 1, 3, 'wood1'], [x + 1, 3, x + 2, 0, 'wood1']);
  return L;
}
// 고강도 프리셋: 분포하중(바닥 전체 0–60 cm)에서, 5 mm 1→2→3겹→10 mm 각재 순으로 키우며 가장 약한 곳(절점·부재)을 함께 한 단계씩 보강하기를
// 더 이상 안 될 때까지 반복한 뒤, 하중이 줄지 않는 범위에서 겹·고무줄을 덜어 낸 결과.
// 부재 = [x1, y1, x2, y2, 목재 겹, 철물], 감기 수는 3회가 아닌 곳만 적는다(최소 2회).
function buildFull(name, members, wraps) {
  const m = blankModel(); m.name = name;
  for (const [x1, y1, x2, y2, wood, steel] of members) {
    addMember(m, { x: x1, y: y1 }, { x: x2, y: y2 }, { wood });
    if (steel) addMember(m, { x: x1, y: y1 }, { x: x2, y: y2 }, { steel: true });
  }
  Object.assign(m.wraps, wraps);
  const ls = levelsOf(m); autoBrace(m, 0); if (ls[0] !== 0) autoBrace(m, ls[0]);
  return m;
}
const S_PRATT4 = [[0,0,2,0,1,0],[2,0,4,0,1,0],[4,0,6,0,1,0],[6,0,8,0,1,0],[8,0,10,0,1,0],[10,0,12,0,1,0],[2,4,4,4,2,0],[4,4,6,4,2,0],[6,4,8,4,2,0],[8,4,10,4,2,0],[0,0,2,4,10,0],[12,0,10,4,10,0],[2,0,2,4,1,0],[4,0,4,4,2,0],[6,0,6,4,1,0],[8,0,8,4,2,0],[10,0,10,4,1,0],[2,4,4,0,1,0],[4,4,6,0,1,0],[10,4,8,0,1,0],[8,4,6,0,1,0]];
const S_PRATT4_W = {'0,0':7,'2,0':5,'4,0':8,'8,0':8,'10,0':5,'12,0':7,'2,4':8,'6,4':2,'10,4':8};
const S_PRATT3 = [[0,0,2,0,1,0],[2,0,4,0,1,0],[4,0,6,0,1,0],[6,0,8,0,1,0],[8,0,10,0,1,0],[10,0,12,0,1,0],[2,3,4,3,2,0],[4,3,6,3,2,0],[6,3,8,3,2,0],[8,3,10,3,2,0],[0,0,2,3,10,0],[12,0,10,3,10,0],[2,0,2,3,1,0],[4,0,4,3,1,0],[6,0,6,3,1,0],[8,0,8,3,1,0],[10,0,10,3,1,0],[2,3,4,0,1,0],[4,3,6,0,1,0],[10,3,8,0,1,0],[8,3,6,0,1,0]];
const S_PRATT3_W = {'0,0':8,'2,0':5,'4,0':8,'8,0':8,'10,0':5,'12,0':8,'2,3':8,'6,3':2,'10,3':8};
const S_HOWE4 = [[0,0,2,0,1,0],[2,0,4,0,1,0],[4,0,6,0,1,0],[6,0,8,0,1,0],[8,0,10,0,1,0],[10,0,12,0,1,0],[2,4,4,4,1,0],[4,4,6,4,1,0],[6,4,8,4,1,0],[8,4,10,4,1,0],[0,0,2,4,10,0],[12,0,10,4,10,0],[2,0,2,4,1,0],[4,0,4,4,1,0],[6,0,6,4,1,0],[8,0,8,4,1,0],[10,0,10,4,1,0],[2,0,4,4,10,0],[4,0,6,4,2,0],[10,0,8,4,10,0],[8,0,6,4,2,0]];
const S_HOWE4_W = {'0,0':5,'2,0':8,'4,0':5,'6,0':4,'8,0':5,'10,0':8,'12,0':5,'2,4':8,'4,4':5,'6,4':4,'8,4':5,'10,4':8};
const PRESETS = {
  prattTallStrong: () => buildFull('Pratt h20 고강도', S_PRATT4, S_PRATT4_W),
  prattStrong: () => buildFull('Pratt h15 고강도', S_PRATT3, S_PRATT3_W),
  howeStrong: () => buildFull('Howe h20 고강도', S_HOWE4, S_HOWE4_W),
  pratt: () => build('Pratt 트러스 (기본)', prattList(3, false)),
  empty: () => blankModel()
};

/* ───────────────── 상태 ───────────────── */
const $ = id => document.getElementById(id);
const MATS = { wood1: { name: '5 mm 1겹', wood: 1 }, wood2: { name: '5 mm 2겹', wood: 2 }, wood3: { name: '5 mm 3겹', wood: 3 }, wood10: { name: '10 mm 각재', wood: BIG }, steel: { name: '철물 Ø3', steel: true } };
const ICON = {
  wood: n => { let s = ''; const cols = ['#c89a5b', '#b07d42', '#d9b07a']; for (let l = 0; l < n; l++) { const o = (l - (n - 1) / 2) * 3; for (let i = 0; i < 12; i++) s += `<rect x="${2 + i + o}" y="${12 - i + o}" width="2.2" height="2.2" fill="${i % 3 === 0 ? '#8a5a2b' : cols[l % 3]}"/>`; } return s; },
  big: () => { let s = ''; for (let i = 0; i < 10; i++) s += `<rect x="${1 + i}" y="${10 - i}" width="4.2" height="4.2" fill="${i % 3 === 0 ? '#7a4f24' : i % 2 ? '#b8874a' : '#a4733a'}"/>`; return s; },
  steel: () => { let s = ''; for (let i = 0; i < 13; i++) s += `<rect x="${1.5 + i}" y="${13 - i}" width="1.6" height="1.6" fill="${i % 2 ? '#d5dde4' : '#7c8790'}"/>`; return s; },
  rubber: () => { const p = [[5,2],[6,2],[7,2],[8,2],[9,2],[10,2],[11,3],[12,4],[13,5],[13,6],[13,7],[13,8],[13,9],[13,10],[12,11],[11,12],[10,13],[9,13],[8,13],[7,13],[6,13],[5,13],[4,12],[3,11],[2,10],[2,9],[2,8],[2,7],[2,6],[2,5],[3,4],[4,3]]; return p.map(([x, y], i) => `<rect x="${x}" y="${y}" width="1.2" height="1.2" fill="${i % 4 ? '#f5c518' : '#c99a00'}"/>`).join(''); },
  load: () => `<rect x="7.3" y="1" width="1.4" height="4" fill="#4b3a2a"/><rect x="3" y="5" width="10" height="9" fill="#5a5f66"/><rect x="3" y="5" width="10" height="2" fill="#8d949c"/><rect x="5" y="9" width="6" height="2" fill="#3a3e43"/>`,
  erase: () => { let s = ''; for (let i = 0; i < 10; i++) s += `<rect x="${3 + i}" y="${3 + i}" width="2" height="2" fill="#d32f2f"/><rect x="${3 + i}" y="${12 - i}" width="2" height="2" fill="#d32f2f"/>`; return s; }
};
const TOOLS = [
  { id: 'wood1', label: '5 mm 각재 1겹 (지급 20개)', icon: ICON.wood(1) },
  { id: 'wood2', label: '5 mm 각재 2겹 (접착 집성재)', icon: ICON.wood(2) },
  { id: 'wood3', label: '5 mm 각재 3겹 (접착 집성재)', icon: ICON.wood(3) },
  { id: 'wood10', label: '10 mm 각재 (지급 10개)', icon: ICON.big() },
  { id: 'steel', label: '철사·철물 Ø3 mm (계획 발표 때 승인 필요)', icon: ICON.steel() },
  { id: 'rubber', label: '고무줄: 절점 클릭 +1 · Shift/우클릭 −1', icon: ICON.rubber() },
  { id: 'load', label: '하중: 분포는 시작·끝 절점을 드래그, 집중은 절점 클릭 (측면 보기)', icon: ICON.load() },
  { id: 'erase', label: '지우개 (철물이 겹쳐 있으면 철물부터)', icon: ICON.erase() }
];
const VIEWS = { side: '측면', plan: '위', '3d': '3D' };
const HINTS = {
  side: '측면 트러스 한 면을 짓습니다. 앞면에 놓으면 흐리게 보이는 뒷면에도 똑같이 놓여요(두 면이 같다고 보고 계산). 흰 ◇ = 횡지지된 절점',
  under: '밑에서 올려다본 모습입니다(앞면 트러스가 위쪽). 바닥 높이를 골라 하현재 사이에 가로보와 X자 브레이싱을 놓으세요. 추를 거는 바닥 판도 여기서 확인해요.',
  plan: '위에서 본 모습입니다. 앞·뒤 트러스를 잇는 가로보와 X자 브레이싱을 놓으세요. 삼각형이 생긴 칸의 절점이 옆으로 잡힙니다.',
  '3d': '드래그해서 돌려 보고(아래까지 돌아가요), 휠·핀치로 확대합니다. 지우개(7)로 부재를 클릭해 지우고, 고무줄(5)로 노란 절점을 클릭해 감을 수 있어요.'
};

let S = blankModel();
let tool = 'wood1', view = 'side', level = 0, undoStack = [], R = null, mode = 'build', anim = null, lastCrit = null, showForces = false;
let hover = null, startNode = null, dragMoved = false, hoverItem = null, pieces = [], history = [];
const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
const W_ = k => getWraps(S, k);
const Pk = k => k.split(',').map(Number);

function save() { try { localStorage.setItem('tb-lab-3d-v1', JSON.stringify({ S, history })); } catch (e) {} }
function load() {
  try {
    const d = JSON.parse(localStorage.getItem('tb-lab-3d-v1'));
    if (d && d.S && d.S.segs) { S = Object.assign(blankModel(), d.S); history = Array.isArray(d.history) ? d.history : []; return true; }
  } catch (e) {}
  return false;
}
function snapshot() { undoStack.push(JSON.stringify(S)); if (undoStack.length > 100) undoStack.shift(); }
function markEdited() { if (!/\(수정\)$/.test(S.name)) S.name = (S.name || '사용자 설계') + ' (수정)'; }
function changed(edited = true) {
  prunePlan(S);
  if (edited) markEdited();
  lastCrit = null; R = analyze(S);
  const ls = levelsOf(S); if (!ls.includes(level)) level = ls[0] ?? 0;
  save(); updatePanel(); buildLevels(); rebuild3D(); dirty = true;
}

/* ───────────────── 패널 ───────────────── */
const cm = v => (v * CM) + '';
function elemLabel(e) { const a = R.nodes[e.i], b = R.nodes[e.j]; return `${e.kind === 'wood' ? woodName(e.n) : '철물'} (${cm(a.x)},${cm(a.y)})→(${cm(b.x)},${cm(b.y)})`; }
function capLabel(c) {
  if (c.type === 'joint') { const n = R.nodes[c.idx]; return `절점 (${cm(n.x)},${cm(n.y)}) 고무줄 미끄러짐`; }
  const e = R.elements[c.idx]; return `${elemLabel(e)} · ${e.mode}`;
}
function critHTML(c) {
  if (c.type === 'joint') {
    const n = R.nodes[c.idx];
    return `<span class="bad">절점 (${cm(n.x)}, ${cm(n.y)}) cm 고무줄 미끄러짐</span><br>감기 ${n.w}회 → 저항 ${n.joint.R.toFixed(0)} N. 고무줄을 더 감거나(5번), 힘이 큰 부재를 일직선으로 이어 주세요.`;
  }
  const e = R.elements[c.idx], F = e.f * R.Pface;
  const tip = e.f < 0
    ? (e.mode === '면외 좌굴' ? `옆으로 잡아 주는 점이 없어 ${(e.Lout / 10).toFixed(0)} cm 길이로 좌굴해요. 위 보기에서 이 높이에 X자 브레이싱을 넣으세요.`
      : e.mode.includes('좌굴') ? '더 짧게 나누거나 겹을 늘리세요 (P<sub>cr</sub> ∝ I/L²).' : '단면을 키우세요 (겹 늘리기).')
    : (e.kind === 'wood' ? '철물을 겹치거나 겹을 늘리세요.' : '목재를 겹쳐 힘을 나누세요.');
  return `<span class="bad">${elemLabel(e)} · ${e.mode}</span><br>${F > 0 ? '인장' : '압축'} ${Math.abs(F).toFixed(0)} N에서 파괴. ${tip}`;
}
function updatePanel() {
  const r = R, ok = r && r.status === 'ok';
  $('lrange').textContent = loadSummary() + (S.loadType === 'point' ? '' : ' · 6번 도구로 범위 드래그');
  $('lfull').hidden = S.loadType === 'point';
  renderComp();
  $('pname').textContent = S.name;
  $('wt').textContent = r.weight.toFixed(1) + ' g';
  $('lw').textContent = (r.woodLen / 10).toFixed(0) + ' cm';
  $('ls').textContent = (r.steelLen / 10).toFixed(0) + ' cm · ' + (r.steelLen * MAT.steel.A * MAT.steel.rho).toFixed(1) + ' g';
  $('nr').textContent = r.wraps + ' 회';
  $('nb').textContent = [...r.braced].filter(k => r.nodeIndex.has(k)).length + ' / ' + r.nodes.length;
  $('stat').className = 'pill ' + (ok ? 'ok' : r.status === 'unstable' ? 'bad' : 'idle');
  $('stat').textContent = ok ? '안정' : r.status === 'unstable' ? '불안정 (메커니즘)' : '해석 대기';
  if (!ok) {
    $('kg').textContent = '—'; $('kgsub').textContent = ''; $('kgwater').textContent = '';
    $('cause').innerHTML = `<span class="bad">${r.msg}</span>`;
    ['eff', 'defl'].forEach(i => $(i).textContent = '—');
    $('weak').innerHTML = '<li class="muted">해석이 끝나면 보여요</li>';
    return;
  }
  $('kg').textContent = r.kg.toFixed(1) + ' kg';
  $('kgwater').textContent = `물 약 ${r.kg.toFixed(1)} L (1 kg ≈ 1 L, 바구니 무게 제외)`;
  $('kgsub').textContent = `한 면 ${r.Pface.toFixed(0)} N × 2면 = ${r.Ptotal.toFixed(0)} N · ${loadSummary()}`;
  $('cause').innerHTML = critHTML(r.govern) + (r.warn ? `<div class="warn">⚠ ${r.warn}</div>` : '');
  $('eff').textContent = `${(r.kg / r.weight).toFixed(3)} kg/g (자기 무게의 ${(r.kg * 1000 / r.weight).toFixed(0)}배)`;
  $('defl').textContent = r.defl.toFixed(1) + ' mm';
  const top = r.ranked.slice(0, 3), mx = top.length ? 2 * top[top.length - 1].cap / G_ACC : 1;
  $('weak').innerHTML = top.map((c, i) => {
    const kg = 2 * c.cap / G_ACC;
    return `<li><span class="wl">${i + 1}. ${capLabel(c)}</span><span class="wbar"><i style="width:${Math.max(6, kg / mx * 100)}%"></i></span><span class="wk">${kg.toFixed(1)} kg</span></li>`;
  }).join('');
}
function renderHistory() {
  $('hist').innerHTML = history.length ? history.map(h => `<tr><td>${h.name}</td><td>${h.kg}</td><td>${h.g}</td><td>${h.eff}</td></tr>`).join('')
    : '<tr><td colspan="4" class="muted">하중 시험을 돌리면 결과가 여기 쌓여요</td></tr>';
}

/* ───────────────── 2D 화면 ───────────────── */
const cv = $('cv'), ctx = cv.getContext('2d'), vp = $('viewport');
let dpr = 1, Wpx = 800, Hpx = 500, scale = 10, ox = 0, oy = 0, dirty = true;
const DK = 0.5; // 측면 보기 깊이(사선) 계수
const Wcm = () => S.width * CM;
function frame2D() {
  return isPlanView() ? { x0: -12, x1: 72, y0: -14, y1: Wcm() + 14 } : { x0: -12, x1: 72 + Wcm() * DK, y0: -16, y1: 38 + Wcm() * DK };
}
function fit() {
  const f = frame2D();
  scale = Math.min(Wpx / (f.x1 - f.x0), Hpx / (f.y1 - f.y0));
  ox = (Wpx - scale * (f.x1 - f.x0)) / 2 - f.x0 * scale;
  oy = (Hpx - scale * (f.y1 - f.y0)) / 2 + f.y1 * scale;
}
const PS = (x, y, z = 0) => [ox + (x + z * DK) * scale, oy - (y + z * DK) * scale]; // 측면: cm
const isPlanView = () => view === 'plan' || view === 'under';
// 위: 앞면(z=0)이 아래쪽. 아래: 밑에서 올려다본 모습이라 앞뒤가 뒤집혀 앞면이 위쪽
const PP = (x, z) => [ox + x * scale, oy - (view === 'under' ? Wcm() - z : z) * scale];
function resize() {
  dpr = window.devicePixelRatio || 1;
  Wpx = vp.clientWidth;
  Hpx = Math.round(Math.max(340, Math.min(620, Wpx * 0.62)));
  cv.width = Wpx * dpr; cv.height = Hpx * dpr; cv.style.height = Hpx + 'px'; vp.style.height = Hpx + 'px';
  fit(); resize3D(); dirty = true;
}
function validSide(x, y) { if (x < -1 || x > 13 || y < -2 || y > 6) return false; if (y < 0 && (x <= 0 || x >= 12)) return false; return true; }

let rs = 7; const rand = () => (rs = (rs * 16807) % 2147483647) / 2147483647;
const NOISE = Array.from({ length: 512 }, () => rand());
const CLOUDS = [[-6, 33, 10], [24, 31, 13], [54, 35, 9]];
function px(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
function quad(pts, fill, stroke) { ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); } }

function sceneSide() {
  ctx.fillStyle = '#8ec5ff'; ctx.fillRect(0, 0, Wpx, Hpx);
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  for (const [x, y, w] of CLOUDS) { const [a, b] = PS(x, y); ctx.fillRect(a, b, w * scale, 2 * scale); ctx.fillRect(a + 2 * scale, b - 1.5 * scale, (w - 4) * scale, 1.5 * scale); }
  const W = Wcm(), z0 = -5, z1 = W + 5, bs = CM;
  const vx0 = Math.floor((-ox / scale) / CM) * CM - 2 * CM, vx1 = Math.ceil(((Wpx - ox) / scale) / CM) * CM + CM;
  const vyb = -Math.ceil(((Hpx - oy) / scale) / CM) * CM - CM;
  // 물(틈 아래)
  quad([PS(0, -12, z0), PS(60, -12, z0), PS(60, -12, z1), PS(0, -12, z1)], '#4a83ee');
  for (let y = -12; y > vyb; y -= CM) for (let x = 0; x < 60; x += CM) { const [a, b] = PS(x, y, z0); px(a, b, scale * bs + 1, scale * bs + 1, ((x + y) / CM) % 2 ? '#2f62d8' : '#3a6fe6'); }
  // 강둑: 윗면(사선) + 앞면(픽셀 블록)
  let ni = 0; const q = scale * CM / 4;
  for (const [xa, xb] of [[vx0, 0], [60, vx1]]) {
    for (let x = xa; x < xb; x += CM) {
      quad([PS(x, 0, z0), PS(x + CM, 0, z0), PS(x + CM, 0, z1), PS(x, 0, z1)], (x / CM) % 2 ? '#5fae36' : '#55a22f', 'rgba(0,0,0,.08)');
      for (let y = 0; y > vyb; y -= CM) {
        const [a, b] = PS(x, y, z0);
        for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
          const v = NOISE[(ni++) % 512]; let c;
          if (y === 0 && j === 0) c = v < .5 ? '#5aa832' : '#4c9a2a';
          else if (y === 0 && j === 1) c = v < .4 ? '#5aa832' : (v < .7 ? '#866043' : '#79553a');
          else if (y <= -15) c = v < .5 ? '#7d7d7d' : '#6e6e6e';
          else c = v < .33 ? '#866043' : (v < .66 ? '#79553a' : '#966c4a');
          px(a + i * q, b + j * q, q + .5, q + .5, c);
        }
      }
    }
  }
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  for (let x = -1; x <= 13; x++) for (let y = -2; y <= 6; y++) if (validSide(x, y)) { const [a, b] = PS(x * CM, y * CM); ctx.fillRect(a - 1.5, b - 1.5, 3, 3); }
  ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.font = '12px DotGothic16, sans-serif'; ctx.textAlign = 'center';
  const [ra, rb] = PS(30, -8.5, z0); ctx.fillText('경간 60 cm', ra, rb);
}
function supportsSide(face) {
  for (const [x, roller] of [[0, false], [60, true]]) {
    const [X, Y] = PS(x, 0, face * Wcm()), s = scale * 1.6;
    ctx.fillStyle = face ? '#8a8a8a' : '#a6a6a6'; ctx.strokeStyle = '#2b2b2b'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X - s, Y + s * 1.2); ctx.lineTo(X + s, Y + s * 1.2); ctx.closePath(); ctx.fill(); ctx.stroke();
    if (roller) { ctx.fillStyle = '#444'; for (const d of [-.6, 0, .6]) { ctx.beginPath(); ctx.arc(X + d * s, Y + s * 1.2 + 3, 3, 0, 7); ctx.fill(); } }
  }
}
const ratioCol = (r, l = 50) => `hsl(${Math.max(0, 120 * (1 - Math.min(r, 1)))},85%,${r >= 1 ? l - 5 : l}%)`;
function baseStyle(kind, n) {
  return kind === 'wood' ? { w: Math.max(4, scale * 0.55) * (1 + 0.5 * (woodVis(n) - 1)), col: n === BIG ? '#b07a42' : '#c89a5b', side: '#8a5d2e', out: '#4a2f12', hi: '#e3c08b' }
    : { w: Math.max(3, scale * 0.38), col: '#b8c2cc', side: '#6c7680', out: '#22272b', hi: '#f2f6f9' };
}
function elemStyle(e, Pnow) {
  const st = baseStyle(e.kind, e.n);
  if (Pnow != null && R.status === 'ok') { const r = Math.abs(e.f) * Pnow / e.R; return { ...st, col: ratioCol(r), side: ratioCol(r, 32), hi: null }; }
  if (showForces && R.status === 'ok') {
    const mx = Math.max(...R.elements.map(o => Math.abs(o.f))) || 1, a = Math.abs(e.f) / mx;
    if (a < 1e-6) return { ...st, col: '#9e9e9e', side: '#6d6d6d', hi: null, dash: true };
    return { ...st, w: st.w * (0.7 + 0.9 * a), col: e.f > 0 ? '#2f7de1' : '#e04a2f', side: e.f > 0 ? '#1b4f99' : '#962d19', hi: null };
  }
  return st;
}
// 블록처럼 보이도록: 뒤로 밀린 옆면 + 앞면 + 하이라이트
function bar2D(A, B, st, alpha = 1, crit = false) {
  ctx.globalAlpha = alpha; ctx.lineCap = 'square';
  const d = st.w * 0.38, A2 = [A[0] + d, A[1] - d], B2 = [B[0] + d, B[1] - d];
  if (st.dash) ctx.setLineDash([5, 4]);
  const line = (p, q, w, c) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke(); };
  line(A2, B2, st.w + 3, st.out); line(A2, B2, st.w, st.side);
  line(A, B, st.w + (crit ? 7 : 3), crit ? (Math.floor(performance.now() / 90) % 2 ? '#fff' : '#ff1a1a') : st.out);
  line(A, B, st.w, st.col);
  if (st.hi) line(A, B, 1, st.hi);
  ctx.setLineDash([]); ctx.globalAlpha = 1;
}
function glow(A, B, col, w) { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke(); ctx.lineCap = 'square'; }
function band2D(X, Y, w, col, crit, alpha = 1) {
  ctx.globalAlpha = alpha;
  const r = 2.5 + w * 0.7;
  ctx.strokeStyle = '#3a2a00'; ctx.lineWidth = 2 + w * 0.5 + 2; ctx.beginPath(); ctx.arc(X, Y, r, 0, 7); ctx.stroke();
  ctx.strokeStyle = crit ? (Math.floor(performance.now() / 90) % 2 ? '#fff' : '#ff1a1a') : col; ctx.lineWidth = 2 + w * 0.5; ctx.stroke();
  ctx.globalAlpha = 1;
}
function nodeDisp(k, f) {
  const [x, y] = Pk(k);
  if (!f || !R || R.status !== 'ok' || !R.nodeIndex.has(k)) return [x * CM, y * CM];
  const n = R.nodes[R.nodeIndex.get(k)];
  return [x * CM + n.ux * f / 10, y * CM + n.uy * f / 10];
}
function sideElems() {
  if (R && R.elements.length) return R.elements;
  return [];
}
function isCritElem(e, flash) {
  const c = flash ? R.govern : lastCrit;
  return !!(c && c.type === 'elem' && R.elements[c.idx] && R.elements[c.idx].key === e.key && R.elements[c.idx].kind === e.kind);
}
function isCritNode(k, flash) { const c = flash ? R.govern : lastCrit; return !!(c && c.type === 'joint' && R.nodes[c.idx] && R.nodes[c.idx].k === k); }
function drawSide(disp, Pnow, flash) {
  sceneSide();
  const W = Wcm(), els = [...sideElems()].sort((a, b) => (a.kind === 'steel') - (b.kind === 'steel'));
  supportsSide(1);
  // 뒷면 트러스 (흐리게)
  for (const e of els) {
    const a = nodeDisp(R.nodes[e.i].k, disp), b = nodeDisp(R.nodes[e.j].k, disp);
    bar2D(PS(a[0], a[1], W), PS(b[0], b[1], W), elemStyle(e, Pnow), 0.28);
  }
  // 가로재 (평면 부재)
  for (const p of Object.values(S.plan)) {
    const a = nodeDisp(nk(p.xa, p.y), disp), b = nodeDisp(nk(p.xb, p.y), disp);
    const st = baseStyle(p.wood ? 'wood' : 'steel', p.wood || 1);
    bar2D(PS(a[0], a[1], 0), PS(b[0], b[1], W), { ...st, w: st.w * 0.75 }, 0.45);
  }
  for (const n of R.nodes) { const [x, y] = nodeDisp(n.k, disp); const [X, Y] = PS(x, y, W); band2D(X, Y, n.w, '#f5c518', false, 0.3); }
  drawLoadSide(disp, Pnow != null ? (Pnow * 2 / G_ACC).toFixed(1) + ' kg' : null, Pnow != null ? Pnow / R.Pface : null);
  supportsSide(0);
  // 앞면 트러스
  for (const e of els) {
    const a = nodeDisp(R.nodes[e.i].k, disp), b = nodeDisp(R.nodes[e.j].k, disp);
    bar2D(PS(a[0], a[1]), PS(b[0], b[1]), elemStyle(e, Pnow), 1, isCritElem(e, flash));
  }
  // 커서가 가리키는 부재: 지우개면 빨갛게, 앞·뒤 두 면 모두 표시
  if (mode === 'build' && hoverItem) {
    const red = tool === 'erase', col = red ? 'rgba(255,40,40,.6)' : 'rgba(255,255,255,.45)';
    if (hoverItem.type === 'seg' && S.segs[hoverItem.key]) {
      const s = S.segs[hoverItem.key];
      glow(PS(s.a.x * CM, s.a.y * CM), PS(s.b.x * CM, s.b.y * CM), col, 14);
      if (red) glow(PS(s.a.x * CM, s.a.y * CM, W), PS(s.b.x * CM, s.b.y * CM, W), col, 10);
    } else if (hoverItem.type === 'plan' && S.plan[hoverItem.key]) {
      const p = S.plan[hoverItem.key];
      glow(PS(p.xa * CM, p.y * CM, 0), PS(p.xb * CM, p.y * CM, W), col, 10);
    }
  }
  for (const n of R.nodes) {
    const [x, y] = nodeDisp(n.k, disp), [X, Y] = PS(x, y);
    let col = '#f5c518';
    if (Pnow != null && n.joint) col = ratioCol(n.joint.demand * Pnow / n.joint.R);
    band2D(X, Y, n.w, col, isCritNode(n.k, flash));
    if (R.braced.has(n.k) && Pnow == null) { ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5; const s = 4; ctx.beginPath(); ctx.moveTo(X, Y + 7); ctx.lineTo(X + s, Y + 7 + s); ctx.lineTo(X, Y + 7 + 2 * s); ctx.lineTo(X - s, Y + 7 + s); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  }
  if (R.status === 'unstable' && R.mechNode != null && mode === 'build') {
    const n = R.nodes[R.mechNode], [X, Y] = PS(n.x * CM, n.y * CM), t = (Math.sin(performance.now() / 160) + 1) / 2;
    ctx.strokeStyle = `rgba(255,30,30,${.5 + .5 * t})`; ctx.lineWidth = 3; ctx.strokeRect(X - 10 - 4 * t, Y - 10 - 4 * t, 20 + 8 * t, 20 + 8 * t);
  }
}
// 하중을 그릴 블록 목록 (2D·3D·붕괴 공용).
// 분포하중 = 바닥판 위에 5 cm 간격으로 고르게 놓인 추, 집중하중 = 절점에 매단 추 하나.
// frac: 하중 시험 중 0→1 (추가 점점 높아진다). 평소엔 null
function loadBlocks(disp, frac) {
  const W = Wcm();
  if (S.loadType === 'point') {
    if (!S.load || !structNodes(S).has(S.load)) return [];
    const [x, y] = nodeDisp(S.load, disp);
    return [{ x, y: y - 9, z: W / 2, w: 6, h: 5, d: 6, hang: true, top: [x, y] }];
  }
  const u = S.udl; if (!u) return [];
  const xs = nodesAtLevel(S, u.y); if (!xs.length) return [];
  const x0 = Math.min(u.x0, u.x1) * CM, x1 = Math.max(u.x0, u.x1) * CM; if (x1 <= x0) return [];
  const pts = xs.map(x => nodeDisp(nk(x, u.y), disp));
  const deckY = xc => {
    if (xc <= pts[0][0]) return pts[0][1];
    for (let i = 0; i < pts.length - 1; i++) if (xc <= pts[i + 1][0]) { const t = (xc - pts[i][0]) / ((pts[i + 1][0] - pts[i][0]) || 1); return pts[i][1] + t * (pts[i + 1][1] - pts[i][1]); }
    return pts[pts.length - 1][1];
  };
  const n = Math.max(1, Math.round((x1 - x0) / CM)), bw = (x1 - x0) / n, h = 1.6 + 3.4 * (frac == null ? 0.3 : frac);
  const out = [];
  for (let i = 0; i < n; i++) { const xc = x0 + bw * (i + .5), yd = deckY(xc) + 0.7; out.push({ x: xc, y: yd + h / 2, z: W / 2, w: bw * 0.88, h, d: Math.max(2, W - 1.5) }); }
  out.deck = { x0, x1, ya: deckY(x0), yb: deckY(x1), y: (deckY(x0) + deckY(x1)) / 2 };
  return out;
}
function udlText() { const u = S.udl || { x0: 0, x1: 12, y: 0 }; return `분포하중 ${Math.min(u.x0, u.x1) * CM}–${Math.max(u.x0, u.x1) * CM} cm`; }
function shadowText(t, x, y, size) { ctx.font = `${size}px DotGothic16, sans-serif`; ctx.textAlign = 'center'; ctx.fillStyle = '#000'; ctx.fillText(t, x + 1.5, y + 1.5); ctx.fillStyle = '#fff'; ctx.fillText(t, x, y); }
function drawLoadSide(disp, label, frac) {
  const bl = loadBlocks(disp, frac); if (!bl.length) return;
  const W = Wcm(), fs = Math.max(11, scale * 1.3);
  if (bl[0].hang) {
    const b = bl[0], [x, y] = b.top;
    const top = PS(x, y - 4.5, W / 2), bw = scale * 5, bh = scale * 3.6;
    ctx.strokeStyle = '#3b2c1e'; ctx.lineWidth = 2;
    for (const z of [0, W]) { const p = PS(x, y, z); ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(top[0], top[1]); ctx.stroke(); }
    const d = scale * 1.6;
    quad([[top[0] - bw / 2, top[1]], [top[0] - bw / 2 + d, top[1] - d], [top[0] + bw / 2 + d, top[1] - d], [top[0] + bw / 2, top[1]]], '#8d949c', '#222');
    quad([[top[0] + bw / 2, top[1]], [top[0] + bw / 2 + d, top[1] - d], [top[0] + bw / 2 + d, top[1] + bh - d], [top[0] + bw / 2, top[1] + bh]], '#3f444a', '#222');
    ctx.fillStyle = '#5a5f66'; ctx.fillRect(top[0] - bw / 2, top[1], bw, bh); ctx.strokeStyle = '#222'; ctx.strokeRect(top[0] - bw / 2, top[1], bw, bh);
    shadowText(label != null ? label : 'P', top[0], top[1] + bh * 0.7, fs);
    return;
  }
  // 바닥판(앞·뒤 트러스 사이) + 그 위에 고르게 놓인 추
  const dk = bl.deck;
  quad([PS(dk.x0, dk.ya + .35, 0), PS(dk.x1, dk.yb + .35, 0), PS(dk.x1, dk.yb + .35, W), PS(dk.x0, dk.ya + .35, W)], 'rgba(176,132,78,.6)', 'rgba(60,40,20,.7)');
  for (const b of bl) {
    const z0 = b.z - b.d / 2, z1 = b.z + b.d / 2, L = b.x - b.w / 2, Rr = b.x + b.w / 2, T_ = b.y + b.h / 2, B_ = b.y - b.h / 2;
    quad([PS(L, T_, z0), PS(Rr, T_, z0), PS(Rr, T_, z1), PS(L, T_, z1)], '#9aa1a8', '#222');
    quad([PS(Rr, T_, z0), PS(Rr, T_, z1), PS(Rr, B_, z1), PS(Rr, B_, z0)], '#3f444a', '#222');
    quad([PS(L, T_, z0), PS(Rr, T_, z0), PS(Rr, B_, z0), PS(L, B_, z0)], '#5a5f66', '#222');
  }
  const mid = bl[Math.floor(bl.length / 2)], tp = PS(mid.x, mid.y + mid.h / 2 + 2.5, mid.z);
  shadowText(label != null ? label : udlText(), tp[0], tp[1], fs);
}

function scenePlan() {
  const under = view === 'under', cell = (x, z) => PP(x, under ? z : z + CM);
  const wc = under ? ['#18336f', '#1f3f85'] : ['#2f62d8', '#3a6fe6'];
  ctx.fillStyle = wc[1]; ctx.fillRect(0, 0, Wpx, Hpx);
  const z0 = -14, z1 = Wcm() + 14;
  for (let z = Math.floor(z0 / CM) * CM; z < z1; z += CM) for (let x = 0; x < 60; x += CM) { const [a, b] = cell(x, z); px(a, b, scale * CM + 1, scale * CM + 1, ((x + z) / CM) % 2 ? wc[0] : wc[1]); }
  let ni = 0; const q = scale * CM / 4;
  const vx0 = Math.floor((-ox / scale) / CM) * CM - CM, vx1 = Math.ceil(((Wpx - ox) / scale) / CM) * CM + CM;
  for (const [xa, xb] of [[vx0, 0], [60, vx1]]) for (let x = xa; x < xb; x += CM) for (let z = Math.floor(z0 / CM) * CM - CM; z < z1 + CM; z += CM) {
    const [a, b] = cell(x, z);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const v = NOISE[(ni++) % 512]; px(a + i * q, b + j * q, q + .5, q + .5, under ? (v < .35 ? '#866043' : v < .7 ? '#79553a' : '#6e6e6e') : (v < .35 ? '#5aa832' : v < .7 ? '#4c9a2a' : '#63b53a')); }
  }
  ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.font = '12px DotGothic16, sans-serif'; ctx.textAlign = 'left';
  const [fa, fb] = PP(-11, -1.5), [ba, bb] = PP(-11, Wcm() + 3.5);
  const lbl = (t, x, y) => { ctx.fillStyle = '#000'; ctx.fillText(t, x + 1.5, y + 1.5); ctx.fillStyle = '#fff'; ctx.fillText(t, x, y); };
  lbl('앞면 트러스', fa, fb); lbl('뒷면 트러스', ba, bb);
  ctx.textAlign = 'center'; const [ta, tb] = PP(30, -10); lbl(`${under ? '밑에서 올려다본 모습 · ' : ''}다리 폭 ${Wcm()} cm · 경간 60 cm`, ta, tb);
}
function drawPlan(disp, Pnow, flash) {
  scenePlan();
  const W = Wcm();
  // 측면 트러스(모든 높이)를 위에서 본 모습
  const els = sideElems();
  for (const pass of [0, 1]) for (const e of els) {
    const a = R.nodes[e.i], b = R.nodes[e.j];
    const onLevel = a.y === level && b.y === level;
    if ((pass === 1) !== onLevel) continue;
    const da = nodeDisp(a.k, disp), db = nodeDisp(b.k, disp);
    const st = elemStyle(e, Pnow);
    for (const z of [0, W]) bar2D(PP(da[0], z), PP(db[0], z), st, onLevel ? 1 : 0.35, isCritElem(e, flash));
  }
  for (const pass of [0, 1]) for (const [k, p] of Object.entries(S.plan)) {
    const on = p.y === level;
    if ((pass === 1) !== on) continue;
    const st = baseStyle(p.wood ? 'wood' : 'steel', p.wood || 1);
    const a = nodeDisp(nk(p.xa, p.y), disp), b = nodeDisp(nk(p.xb, p.y), disp);
    bar2D(PP(a[0], 0), PP(b[0], W), st, on ? 1 : 0.3);
    if (p.wood && p.steel) bar2D(PP(a[0], 0), PP(b[0], W), baseStyle('steel'), on ? 1 : 0.3);
    if (on && mode === 'build' && hoverItem && hoverItem.type === 'plan' && hoverItem.key === k)
      glow(PP(a[0], 0), PP(b[0], W), tool === 'erase' ? 'rgba(255,40,40,.6)' : 'rgba(255,255,255,.45)', st.w + 10);
  }
  for (const n of R.nodes) {
    if (n.y !== level) continue;
    const [x] = nodeDisp(n.k, disp);
    for (const z of [0, W]) {
      const [X, Y] = PP(x, z);
      band2D(X, Y, n.w, Pnow != null && n.joint ? ratioCol(n.joint.demand * Pnow / n.joint.R) : '#f5c518', isCritNode(n.k, flash));
      if (R.braced.has(n.k) && Pnow == null) { ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5; const s = 4, yy = (view === 'under' ? !z : z) ? Y - 15 : Y + 7; ctx.beginPath(); ctx.moveTo(X, yy); ctx.lineTo(X + s, yy + s); ctx.lineTo(X, yy + 2 * s); ctx.lineTo(X - s, yy + s); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    }
  }
  const bl = loadBlocks(disp, Pnow != null ? Pnow / R.Pface : null), fsz = Math.max(11, scale * 1.2);
  if (bl.length && bl[0].hang) {
    const [X, Y] = PP(bl[0].x, W / 2), b = scale * 5;
    ctx.fillStyle = '#5a5f66'; ctx.fillRect(X - b / 2, Y - b / 2, b, b); ctx.fillStyle = '#8d949c'; ctx.fillRect(X - b / 2, Y - b / 2, b, b * .2);
    ctx.strokeStyle = '#222'; ctx.lineWidth = 2; ctx.strokeRect(X - b / 2, Y - b / 2, b, b);
    shadowText(Pnow != null ? (Pnow * 2 / G_ACC).toFixed(1) : 'P', X, Y + b * .25, fsz);
  } else if (bl.length) {
    const on = S.udl.y === level, A = PP(bl.deck.x0, 0.6), B = PP(bl.deck.x1, W - 0.6);
    const x = Math.min(A[0], B[0]), y = Math.min(A[1], B[1]), w = Math.abs(B[0] - A[0]), h = Math.abs(B[1] - A[1]);
    ctx.globalAlpha = on ? 1 : 0.45;
    ctx.fillStyle = 'rgba(90,95,102,.55)'; ctx.fillRect(x, y, w, h);
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1;
    for (let k = -h; k < w; k += 10) { ctx.beginPath(); ctx.moveTo(x + k, y + h); ctx.lineTo(x + k + h, y); ctx.stroke(); }
    ctx.restore(); ctx.strokeStyle = '#222'; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h);
    shadowText(Pnow != null ? (Pnow * 2 / G_ACC).toFixed(1) + ' kg' : `${udlText()} (높이 ${S.udl.y * CM} cm)`, x + w / 2, y + h / 2 + 4, fsz);
    ctx.globalAlpha = 1;
  }
}
function drawPieces2D() {
  for (const p of pieces) {
    if (p.kind === 'band') continue;
    const h = qRot(p.q, [p.len / 2, 0, 0]);
    const a = [p.p[0] - h[0], p.p[1] - h[1], p.p[2] - h[2]], b = [p.p[0] + h[0], p.p[1] + h[1], p.p[2] + h[2]];
    if (p.kind === 'load') {
      const [X, Y] = isPlanView() ? PP(p.p[0], p.p[2]) : PS(p.p[0], p.p[1], p.p[2]), dm = p.dims || [6, 5, 6];
      const w = dm[0] * scale, h = (isPlanView() ? dm[2] : dm[1]) * scale;
      ctx.fillStyle = p.deck ? 'rgba(176,132,78,.8)' : '#5a5f66'; ctx.fillRect(X - w / 2, Y - h / 2, w, h); ctx.strokeStyle = '#222'; ctx.lineWidth = 1; ctx.strokeRect(X - w / 2, Y - h / 2, w, h); continue;
    }
    const st = p.crit ? { ...baseStyle(p.kind, p.n), col: '#ff3b2f', side: '#9e1f17' } : baseStyle(p.kind, p.n);
    if (isPlanView()) bar2D(PP(a[0], a[2]), PP(b[0], b[2]), st, p.p[2] > 0.1 && p.p[2] < Wcm() - .1 ? .8 : 1);
    else bar2D(PS(a[0], a[1], a[2]), PS(b[0], b[1], b[2]), st, (a[2] + b[2]) / 2 > Wcm() * .6 ? .55 : 1);
  }
}
function draw2D() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (!R) return;
  if (mode === 'collapse') { if (isPlanView()) scenePlan(); else sceneSide(); drawPieces2D(); return; }
  let disp = 0, Pnow = null, flash = false;
  if (mode === 'test' || mode === 'flash') { Pnow = (mode === 'flash' ? 1 : anim.t) * anim.R.Pface; disp = anim.exag * Pnow; flash = mode === 'flash'; }
  if (isPlanView()) drawPlan(disp, Pnow, flash); else drawSide(disp, Pnow, flash);
  if (Pnow != null) { ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.font = '12px DotGothic16, sans-serif'; ctx.textAlign = 'left'; ctx.fillText(`변형 ×${anim.exag.toFixed(0)} 확대 표시`, 10, Hpx - 10); }
  if (mode !== 'build') return;
  // 건설 미리보기
  if (view === 'side') {
    if (hover) { const [x, y] = Pk(hover), [X, Y] = PS(x * CM, y * CM); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(X - 6, Y - 6, 12, 12); }
    if (startNode && hover && hover !== startNode && tool in MATS) {
      const [x1, y1] = Pk(startNode), [x2, y2] = Pk(hover), A = PS(x1 * CM, y1 * CM), B = PS(x2 * CM, y2 * CM);
      ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.setLineDash([6, 5]); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#fff'; ctx.font = '12px DotGothic16, sans-serif'; ctx.textAlign = 'center'; ctx.fillText((Math.hypot(x2 - x1, y2 - y1) * CM).toFixed(1) + ' cm', (A[0] + B[0]) / 2, (A[1] + B[1]) / 2 - 9);
    }
    if (startNode) { const [x, y] = Pk(startNode), [X, Y] = PS(x * CM, y * CM); ctx.fillStyle = '#fff'; ctx.fillRect(X - 4, Y - 4, 8, 8); }
    if (loadStart) {
      const [x1, y1] = Pk(loadStart), A = PS(x1 * CM, y1 * CM);
      ctx.fillStyle = '#ffb000'; ctx.fillRect(A[0] - 5, A[1] - 5, 10, 10);
      if (hover && hover !== loadStart) {
        const [x2, y2] = Pk(hover), ok = y2 === y1, B = PS(x2 * CM, y1 * CM);
        ctx.strokeStyle = ok ? 'rgba(255,176,0,.95)' : 'rgba(255,60,60,.9)'; ctx.lineWidth = 3; ctx.setLineDash([6, 4]);
        ctx.beginPath(); ctx.moveTo(A[0], A[1] - 14); ctx.lineTo(B[0], B[1] - 14); ctx.stroke(); ctx.setLineDash([]);
        for (let t = 0; t <= 1.0001; t += 1 / Math.max(1, Math.abs(x2 - x1) * 2)) { const X = A[0] + (B[0] - A[0]) * t; ctx.beginPath(); ctx.moveTo(X, A[1] - 14); ctx.lineTo(X, A[1] - 3); ctx.stroke(); }
        shadowText(ok ? `분포하중 ${Math.min(x1, x2) * CM}–${Math.max(x1, x2) * CM} cm` : '같은 높이의 절점을 고르세요', (A[0] + B[0]) / 2, A[1] - 22, 12);
      }
    }
  } else {
    const pos = k => { const [x, f] = k.split(':').map(Number); return PP(x * CM, f * Wcm()); };
    if (hover) { const [X, Y] = pos(hover); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(X - 7, Y - 7, 14, 14); }
    if (startNode && hover && hover !== startNode && tool in MATS) {
      const A = pos(startNode), B = pos(hover);
      ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.setLineDash([6, 5]); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke(); ctx.setLineDash([]);
    }
    if (startNode) { const [X, Y] = pos(startNode); ctx.fillStyle = '#fff'; ctx.fillRect(X - 4, Y - 4, 8, 8); }
  }
}

/* ───────────────── 쿼터니언(조각 물리용) ───────────────── */
function qMul(a, b) { return [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]]; }
function qRot(q, v) { const p = qMul(qMul(q, [v[0], v[1], v[2], 0]), [-q[0], -q[1], -q[2], q[3]]); return [p[0], p[1], p[2]]; }
function qFromDir(d) {
  const L = Math.hypot(d[0], d[1], d[2]) || 1, x = d[0] / L, y = d[1] / L, z = d[2] / L;
  const r = 1 + x;
  if (r < 1e-6) return [0, 1, 0, 0];
  const q = [0, -z, y, r], n = Math.hypot(...q); return q.map(v => v / n);
}
function qInt(q, w, dt) { const a = Math.hypot(...w) * dt; if (a < 1e-9) return q; const s = Math.sin(a / 2) / (a / dt); const dq = [w[0] * s, w[1] * s, w[2] * s, Math.cos(a / 2)]; const r = qMul(dq, q), n = Math.hypot(...r); return r.map(v => v / n); }

/* ───────────────── 3D 막대 목록(3D 화면·붕괴 공용) ───────────────── */
function pos3(k, face, disp) { const [x, y] = nodeDisp(k, disp); return [x, y, face * Wcm()]; }
function barList(disp) {
  const W = Wcm(), list = [];
  for (const e of (R ? R.elements : [])) for (const face of [0, 1]) {
    const a = pos3(R.nodes[e.i].k, face, disp), b = pos3(R.nodes[e.j].k, face, disp);
    if (e.kind === 'steel') { const dz = face ? -0.9 : 0.9; a[2] += dz; b[2] += dz; }
    list.push({ kind: e.kind, n: e.n, a, b, el: e, face, crit: false });
  }
  for (const [k, p] of Object.entries(S.plan)) {
    const a = pos3(nk(p.xa, p.y), 0, disp), b = pos3(nk(p.xb, p.y), 1, disp);
    if (p.wood) list.push({ kind: 'wood', n: p.wood, a, b, plan: k });
    if (p.steel) list.push({ kind: 'steel', n: 0, a: [a[0], a[1] + .8, a[2]], b: [b[0], b[1] + .8, b[2]], plan: k });
  }
  return list;
}

/* ───────────────── 3D (three.js) ───────────────── */
let T = null;
function texCanvas(fn, n = 16) { const c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d'); fn(g, n); const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }
function noiseFill(g, n, cols, seed) { let s = seed; const r = () => (s = (s * 16807) % 2147483647) / 2147483647; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { g.fillStyle = cols[Math.floor(r() * cols.length)]; g.fillRect(i, j, 1, 1); } }
function makeTextures() {
  const wood = texCanvas((g, n) => { for (let j = 0; j < n; j++) { const c = [ '#c89a5b', '#b98a4c', '#d4a96c', '#a8783f' ][(j * 7 + (j >> 2)) % 4]; g.fillStyle = c; g.fillRect(0, j, n, 1); } g.fillStyle = '#8a5a2b'; for (let i = 0; i < 6; i++) g.fillRect((i * 5) % n, (i * 3) % n, 3, 1); });
  const steel = texCanvas((g, n) => { for (let j = 0; j < n; j++) { g.fillStyle = j % 4 === 0 ? '#eef3f7' : j % 4 === 1 ? '#c3ccd4' : j % 4 === 2 ? '#9aa4ad' : '#b6bfc7'; g.fillRect(0, j, n, 1); } });
  const grassTop = texCanvas((g, n) => noiseFill(g, n, ['#5aa832', '#4c9a2a', '#63b53a', '#55a22f'], 11));
  const grassSide = texCanvas((g, n) => { noiseFill(g, n, ['#866043', '#79553a', '#966c4a'], 5); for (let i = 0; i < n; i++) { g.fillStyle = i % 3 ? '#5aa832' : '#4c9a2a'; g.fillRect(i, 0, 1, 3 + (i * 7 % 3)); } });
  const dirt = texCanvas((g, n) => noiseFill(g, n, ['#866043', '#79553a', '#966c4a'], 9));
  const stone = texCanvas((g, n) => noiseFill(g, n, ['#7d7d7d', '#6e6e6e', '#888888', '#727272'], 3));
  const water = texCanvas((g, n) => noiseFill(g, n, ['#2f62d8', '#3a6fe6', '#3468de'], 4));
  const iron = texCanvas((g, n) => { g.fillStyle = '#5a5f66'; g.fillRect(0, 0, n, n); g.fillStyle = '#8d949c'; g.fillRect(0, 0, n, 3); g.fillStyle = '#3a3e43'; g.fillRect(4, 8, 8, 2); g.strokeStyle = '#222'; g.strokeRect(0.5, 0.5, n - 1, n - 1); });
  return { wood, steel, grassTop, grassSide, dirt, stone, water, iron };
}
function init3D() {
  if (!window.THREE) return false;
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true }); } catch (e) { return false; }
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x8ec5ff); scene.fog = new THREE.Fog(0x8ec5ff, 220, 520);
  const camera = new THREE.PerspectiveCamera(38, 1, 1, 2000);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x5d7a3d, 0.8));
  const sun = new THREE.DirectionalLight(0xffffff, 0.7); sun.position.set(-50, 120, -80); scene.add(sun);
  const tex = makeTextures();
  const L = mat => new THREE.MeshLambertMaterial(mat);
  const mats = {
    wood: L({ map: tex.wood }), steel: L({ map: tex.steel }), band: L({ color: 0xf5c518 }),
    grass: [L({ map: tex.grassSide }), L({ map: tex.grassSide }), L({ map: tex.grassTop }), L({ map: tex.dirt }), L({ map: tex.grassSide }), L({ map: tex.grassSide })],
    dirt: L({ map: tex.dirt }), stone: L({ map: tex.stone }), water: L({ map: tex.water, transparent: true, opacity: 0.85 }), iron: L({ map: tex.iron }), rope: L({ color: 0x3b2c1e })
  };
  const world = new THREE.Group(), bridge = new THREE.Group(); scene.add(world); scene.add(bridge);
  T = { renderer, scene, camera, world, bridge, mats, tex, box: new THREE.BoxGeometry(1, 1, 1), theta: 0.55, phi: 1.12, rad: 100, auto: true, drag: null, meshes: [], builtWidth: null };
  const el = renderer.domElement; el.style.touchAction = 'none'; el.style.display = 'block';
  const pts = new Map();
  el.addEventListener('pointerdown', e => { el.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); T.drag = { x: e.clientX, y: e.clientY, moved: 0 }; T.auto = false; });
  el.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId) || !T.drag) return;
    const prev = pts.get(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pts.size === 2) { const [p, q] = [...pts.values()]; const d = Math.hypot(p[0] - q[0], p[1] - q[1]); if (T.pinch) T.rad = Math.max(50, Math.min(320, T.rad * T.pinch / d)); T.pinch = d; return; }
    const dx = e.clientX - prev[0], dy = e.clientY - prev[1]; T.drag.moved += Math.abs(dx) + Math.abs(dy);
    T.theta -= dx * 0.008; T.phi = Math.max(0.06, Math.min(3.08, T.phi - dy * 0.008));
  });
  const up = e => {
    pts.delete(e.pointerId); T.pinch = null;
    if (T.drag && T.drag.moved < 4 && e.type === 'pointerup') { if (view !== '3d') setView('3d'); else pick3D(e); }
    if (!pts.size) T.drag = null;
  };
  el.addEventListener('contextmenu', e => e.preventDefault());
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  el.addEventListener('wheel', e => { e.preventDefault(); T.rad = Math.max(50, Math.min(320, T.rad * (1 + Math.sign(e.deltaY) * 0.1))); }, { passive: false });
  return true;
}
function buildWorld() {
  if (!T || T.builtWidth === S.width) return;
  T.builtWidth = S.width;
  while (T.world.children.length) T.world.remove(T.world.children[0]);
  const W = Wcm(), B = T.box, m = T.mats;
  const blk = (mat, x, y, z) => { const o = new THREE.Mesh(B, mat); o.scale.set(CM, CM, CM); o.position.set(x + CM / 2, y - CM / 2, z + CM / 2); T.world.add(o); };
  for (const [xa, xb] of [[-40, 0], [60, 100]]) for (let x = xa; x < xb; x += CM) for (let z = -20; z < W + 20; z += CM) for (let y = 0; y > -30; y -= CM) {
    const edge = x === xa || x === xb - CM || z === -20 || z >= W + 15 || x === -5 || x === 60;
    if (y < 0 && y > -25 && !edge) continue;
    blk(y === 0 ? m.grass : y > -15 ? m.dirt : m.stone, x, y, z);
  }
  const water = new THREE.Mesh(B, m.water); water.scale.set(60, 14, W + 40); water.position.set(30, -19, W / 2); T.world.add(water);
  // 지점 블록(돌)
  for (const x of [0, 60]) for (const z of [0, W]) { const o = new THREE.Mesh(B, m.stone); o.scale.set(3, 2, 3); o.position.set(x, -0.6, z); T.world.add(o); }
}
function rebuild3D() {
  if (!T) return;
  buildWorld();
  for (const o of T.meshes) { T.bridge.remove(o.mesh); if (o.plain) o.plain.dispose(); }
  T.meshes = [];
  const add = (geo, mat, info) => { const mesh = new THREE.Mesh(geo, mat); T.bridge.add(mesh); const o = { mesh, base: mat, ...info }; mesh.userData.o = o; T.meshes.push(o); return o; };
  for (const b of barList(0)) {
    const o = add(T.box, b.kind === 'wood' ? T.mats.wood : T.mats.steel, { bar: b });
    o.plain = new THREE.MeshLambertMaterial({ color: 0xffffff });
  }
  for (const n of (R ? R.nodes : [])) for (const face of [0, 1]) add(T.box, T.mats.band, { band: n.k, face });
  const bl0 = R ? loadBlocks(0, null) : [];
  if (bl0.length) {
    if (bl0[0].hang) { add(T.box, T.mats.iron, { load: 0 }); for (const face of [0, 1]) add(T.box, T.mats.rope, { rope: face }); }
    else { add(T.box, T.mats.wood, { deck: true }); bl0.forEach((b, i) => add(T.box, T.mats.iron, { load: i })); }
    const c = document.createElement('canvas'); c.width = 256; c.height = 64;
    const st = new THREE.CanvasTexture(c); const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: st, depthTest: false }));
    sp.scale.set(24, 6, 1); T.bridge.add(sp); T.meshes.push({ mesh: sp, label: true, canvas: c, tex: st });
  }
  update3D(0, null, false);
}
// 3D 화면에서 클릭: 지우개로 부재 지우기, 고무줄로 감기 수 바꾸기
function pick3D(e) {
  if (!T || mode !== 'build') return;
  const el = T.renderer.domElement, r = el.getBoundingClientRect();
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, T.camera);
  const hit = ray.intersectObjects(T.bridge.children, false).find(h => h.object.visible && h.object.userData.o && (h.object.userData.o.bar || h.object.userData.o.band));
  const o = hit && hit.object.userData.o;
  if (tool === 'erase' || e.button === 2) {
    if (o && o.bar) { beginErase(); eraseItem(o.bar.plan ? { type: 'plan', key: o.bar.plan } : { type: 'seg', key: o.bar.el.key }); endErase(); }
  } else if (tool === 'rubber') {
    if (o && o.band) { snapshot(); S.wraps[o.band] = Math.max(MIN_WRAPS, Math.min(MAX_WRAPS, W_(o.band) + (e.shiftKey ? -1 : 1))); changed(); toast(`절점 (${Pk(o.band).map(v => v * CM).join(', ')}) cm 고무줄 ${W_(o.band)}회`); }
  } else toast('3D 화면에서는 지우개(7)와 고무줄(5)만 써요. 부재는 측면·위 보기에서 놓아요.');
}
function placeBox(mesh, a, b, t, d) {
  const dir = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], len = Math.hypot(...dir);
  mesh.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  mesh.scale.set(Math.max(len, 0.01), t, d);
  const q = qFromDir(dir); mesh.quaternion.set(q[0], q[1], q[2], q[3]);
}
function barDims(kind, n) { return kind === 'wood' ? (n === BIG ? [1.6, 1.6] : [1.0, 0.8 * n]) : [0.55, 0.55]; }
function update3D(disp, Pnow, flash) {
  if (!T) return;
  const W = Wcm(), bars = barList(disp); let bi = 0;
  const bl = R ? loadBlocks(disp, Pnow != null && R.status === 'ok' ? Pnow / R.Pface : null) : [];
  const lp = bl.length ? (bl[0].hang ? bl[0].top : [bl[Math.floor(bl.length / 2)].x, bl[Math.floor(bl.length / 2)].y]) : null;
  for (const o of T.meshes) {
    if (o.bar) {
      const b = bars[bi++]; if (!b) { o.mesh.visible = false; continue; }
      o.mesh.visible = true; o.bar = b;
      const [t, d] = barDims(b.kind, b.n); placeBox(o.mesh, b.a, b.b, t, d);
      let col = null;
      if (b.el && Pnow != null && R.status === 'ok') col = ratioCol(Math.abs(b.el.f) * Pnow / b.el.R);
      else if (b.el && showForces && R.status === 'ok') { const mx = Math.max(...R.elements.map(e => Math.abs(e.f))) || 1; col = Math.abs(b.el.f) / mx < 1e-6 ? '#9e9e9e' : b.el.f > 0 ? '#2f7de1' : '#e04a2f'; }
      const crit = b.el && (isCritElem(b.el, flash)) && (flash || lastCrit);
      if (crit) col = flash && Math.floor(performance.now() / 90) % 2 ? '#ffffff' : '#ff1a1a';
      if (col) { o.plain.color.set(col); o.mesh.material = o.plain; } else o.mesh.material = o.base;
    } else if (o.band) {
      const p = pos3(o.band, o.face, disp), w = W_(o.band), s = 1.5 + 0.13 * w;
      o.mesh.visible = true; o.mesh.position.set(p[0], p[1], p[2]); o.mesh.scale.set(s, s, s); o.mesh.quaternion.set(0, 0, 0, 1);
      const n = R.nodes[R.nodeIndex.get(o.band)];
      if ((Pnow != null && n && n.joint) || isCritNode(o.band, flash)) {
        if (!o.plain) o.plain = new THREE.MeshLambertMaterial({ color: 0xffffff });
        o.plain.color.set(isCritNode(o.band, flash) ? (Math.floor(performance.now() / 90) % 2 ? '#fff' : '#ff1a1a') : ratioCol(n.joint.demand * Pnow / n.joint.R));
        o.mesh.material = o.plain;
      } else o.mesh.material = o.base;
    } else if (o.load != null) {
      const b = bl[o.load]; o.mesh.visible = !!b;
      if (b) { o.mesh.position.set(b.x, b.y, b.z); o.mesh.scale.set(b.w, b.h, b.d); o.mesh.quaternion.set(0, 0, 0, 1); }
    } else if (o.deck) {
      const dk = bl.deck; o.mesh.visible = !!dk;
      if (dk) placeBox(o.mesh, [dk.x0, dk.ya + .35, W / 2], [dk.x1, dk.yb + .35, W / 2], 0.4, W + 1);
    }
    else if (o.rope != null && lp) { o.mesh.visible = true; placeBox(o.mesh, [lp[0], lp[1], o.rope * W], [lp[0], lp[1] - 6.5, W / 2], 0.3, 0.3); }
    else if (o.label && lp) {
      o.mesh.visible = true;
      if (bl[0].hang) o.mesh.position.set(lp[0], lp[1] - 16, W / 2); else { const mb = bl[Math.floor(bl.length / 2)]; o.mesh.position.set(mb.x, mb.y + mb.h / 2 + 5, W / 2); }
      const txt = Pnow != null ? (Pnow * 2 / G_ACC).toFixed(1) + ' kg' : (R.status === 'ok' ? '최대 ' + R.kg.toFixed(1) + ' kg' : 'P');
      if (o.txt !== txt) { o.txt = txt; const g = o.canvas.getContext('2d'); g.clearRect(0, 0, 256, 64); g.font = '34px DotGothic16, sans-serif'; g.textAlign = 'center'; g.fillStyle = '#000'; g.fillText(txt, 130, 46); g.fillStyle = '#fff'; g.fillText(txt, 127, 43); o.tex.needsUpdate = true; }
    }
  }
}
function collapse3D() {
  if (!T) return;
  for (const o of T.meshes) {
    if (o.band || o.rope != null || o.label) { o.mesh.visible = false; continue; }
    const p = o.piece; if (!p) { o.mesh.visible = false; continue; }
    o.mesh.visible = true;
    o.mesh.position.set(p.p[0], p.p[1], p.p[2]); o.mesh.quaternion.set(p.q[0], p.q[1], p.q[2], p.q[3]);
    if (p.kind === 'load') o.mesh.scale.set(...(p.dims || [6, 5, 6]));
    else { const [t, d] = barDims(p.kind, p.n); o.mesh.scale.set(Math.max(p.len, .01), t, d); }
    if (p.crit) { o.plain.color.set('#ff3b2f'); o.mesh.material = o.plain; } else if (o.plain) o.mesh.material = o.base;
  }
}
const gl = $('gl');
function resize3D() {
  if (!T) return;
  const host = gl;
  if (T.renderer.domElement.parentNode !== host) host.prepend(T.renderer.domElement);
  const w = host.clientWidth || 240, h = host.clientHeight || 150;
  T.renderer.setSize(w, h, true); T.camera.aspect = w / h; T.camera.updateProjectionMatrix();
}
function render3D() {
  if (!T || view !== '3d') return; // 3D 화면을 볼 때만 그린다
  const W = Wcm(), tgt = [30, 6, W / 2];
  if (T.auto && !T.drag && view !== '3d') T.theta += 0.0035;
  const r = view === '3d' ? T.rad : 120;
  T.camera.position.set(tgt[0] + r * Math.sin(T.phi) * Math.sin(T.theta), tgt[1] + r * Math.cos(T.phi), tgt[2] - r * Math.sin(T.phi) * Math.cos(T.theta));
  T.camera.lookAt(tgt[0], tgt[1], tgt[2]);
  T.mats.water.opacity = T.camera.position.y < -12 ? 0.3 : 0.85; // 아래에서 볼 때 물이 가리지 않게
  T.renderer.render(T.scene, T.camera);
}
const CAMS = { iso: [0.55, 1.12], front: [0.0001, 1.5], top: [0.0001, 0.06], bottom: [0.0001, 2.75], end: [Math.PI / 2, 1.35] };
document.querySelectorAll('[data-cam]').forEach(b => b.onclick = () => { if (!T) return; const [t, p] = CAMS[b.dataset.cam]; T.theta = t; T.phi = p; T.auto = false; });

/* ───────────────── 하중 시험 ───────────────── */
const DUR = reduceMotion ? 900 : 2600;
function counter(html, show) { const c = $('counter'); c.innerHTML = html; c.style.opacity = show ? 1 : 0; }
function toast(msg) { const t = $('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.h); toast.h = setTimeout(() => t.hidden = true, 3400); }
function startTest() {
  if (mode !== 'build') return;
  R = analyze(S);
  if (R.status !== 'ok' && R.status !== 'unstable') { toast(R.msg); return; }
  lastCrit = null; hoverItem = null; $('tip').hidden = true; $('test').classList.add('stop'); startNode = null;
  if (R.status === 'unstable') { anim = { R, exag: 0, t: 1 }; counter('0.0 kg<small>구조 불안정!</small>', true); startCollapse(); return; }
  const exag = Math.max(1, Math.min(300, 25 / (R.maxU * R.Pface || 1)));
  anim = { R, exag, t: 0, t0: performance.now() }; mode = 'test'; counter('0.0 kg', true);
}
function startCollapse() {
  const r = anim.R, disp = anim.exag * (r.Pface || 0);
  pieces = [];
  const crit = r.status === 'ok' ? r.govern : null;
  const critNode = crit && crit.type === 'joint' ? r.nodes[crit.idx].k : null;
  const bars = barList(disp);
  const mk = (b, p, len, kick, isCrit) => ({ kind: b.kind, n: b.n, crit: isCrit, len, p, q: qFromDir([b.b[0] - b.a[0], b.b[1] - b.a[1], b.b[2] - b.a[2]]), v: [(rand() - .5) * kick, rand() * kick * .6, (rand() - .5) * kick * .6], w: [(rand() - .5) * kick / 6, (rand() - .5) * kick / 6, (rand() - .5) * kick / 4] });
  const meshBars = T ? T.meshes.filter(o => o.bar) : [];
  bars.forEach((b, i) => {
    const mid = [(b.a[0] + b.b[0]) / 2, (b.a[1] + b.b[1]) / 2, (b.a[2] + b.b[2]) / 2], len = Math.hypot(b.b[0] - b.a[0], b.b[1] - b.a[1], b.b[2] - b.a[2]);
    const isCrit = !!(b.el && crit && crit.type === 'elem' && r.elements[crit.idx] === b.el);
    const near = b.el && critNode && (r.nodes[b.el.i].k === critNode || r.nodes[b.el.j].k === critNode);
    if (isCrit) {
      const halves = [-1, 1].map(s => { const d = [(b.b[0] - b.a[0]) / 4 * s, (b.b[1] - b.a[1]) / 4 * s, (b.b[2] - b.a[2]) / 4 * s]; const pc = mk(b, [mid[0] + d[0], mid[1] + d[1], mid[2] + d[2]], len / 2 - .4, 40, true); pc.v[0] = s * 30 * (.5 + rand()); pc.v[1] = 20 + rand() * 20; return pc; });
      pieces.push(halves[0]); if (meshBars[i]) meshBars[i].piece = halves[0];
      pieces.push(halves[1]); // 3D 에서는 한 조각만 메시를 갖는다
    } else { const pc = mk(b, mid, len, near ? 40 : 12, false); pieces.push(pc); if (meshBars[i]) meshBars[i].piece = pc; }
  });
  const bl = loadBlocks(disp, 1);
  bl.forEach((b, i) => {
    const pc = { kind: 'load', dims: [b.w, b.h, b.d], p: [b.x, b.y, b.z], q: [0, 0, 0, 1], v: [(rand() - .5) * 10, -5 - rand() * 10, (rand() - .5) * 4], w: [0, 0, (rand() - .5) * 3], len: 0 };
    pieces.push(pc); if (T) { const o = T.meshes.find(o => o.load === i); if (o) o.piece = pc; }
  });
  if (bl.deck) {
    const dk = bl.deck, pc = { kind: 'load', deck: true, dims: [dk.x1 - dk.x0, 0.4, Wcm() + 1], p: [(dk.x0 + dk.x1) / 2, dk.y + .35, Wcm() / 2], q: [0, 0, 0, 1], v: [0, -6, 0], w: [(rand() - .5) * .4, 0, (rand() - .5) * .8], len: 0 };
    pieces.push(pc); if (T) { const o = T.meshes.find(o => o.deck); if (o) o.piece = pc; }
  }
  mode = 'collapse'; anim.t2 = performance.now(); anim.last = anim.t2;
}
function stepPieces(dt) {
  for (const p of pieces) {
    p.v[1] -= 520 * dt;
    for (let i = 0; i < 3; i++) p.p[i] += p.v[i] * dt;
    p.q = qInt(p.q, p.w, dt);
    const onBank = p.p[0] < -1 || p.p[0] > 61;
    if (onBank && p.p[1] < 0.6) { p.p[1] = 0.6; p.v[1] = Math.abs(p.v[1]) * 0.25; p.v[0] *= .6; p.v[2] *= .6; p.w = p.w.map(v => v * .5); }
    if (!onBank && p.p[1] < -12) { p.v = p.v.map(v => v * .85); if (p.p[1] < -22) { p.p[1] = -22; p.v[1] = 0; } }
  }
}
function finish() {
  mode = 'build'; $('test').classList.remove('stop');
  const r = anim.R;
  if (r.status === 'unstable') { counter('0 kg<small>구조가 불안정해서 바로 무너졌어요</small>', true); }
  else {
    lastCrit = r.govern;
    const why = r.govern.type === 'joint' ? '고무줄 절점 미끄러짐' : r.elements[r.govern.idx].mode;
    counter(`${r.kg.toFixed(1)} kg 에서 파괴!<small>물 약 ${r.kg.toFixed(1)} L · ${why}</small>`, true);
    history.unshift({ name: S.name, kg: r.kg.toFixed(1), g: r.weight.toFixed(1), eff: (r.kg / r.weight).toFixed(3) });
    history = history.slice(0, 8); renderHistory(); save();
  }
  R = analyze(S); updatePanel(); rebuild3D(); dirty = true;
  setTimeout(() => { if (mode === 'build') counter('', false); }, 4500);
}

/* ───────────────── 입력 ───────────────── */
function toLocal(e) { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
function snapSide(px_, py_) {
  const x = Math.round(((px_ - ox) / scale) / CM), y = Math.round(((oy - py_) / scale) / CM);
  const [X, Y] = PS(x * CM, y * CM);
  return Math.hypot(X - px_, Y - py_) < scale * CM * 0.45 && validSide(x, y) ? nk(x, y) : null;
}
function snapPlan(px_, py_) {
  let best = null, bd = scale * CM * 0.45;
  for (const x of nodesAtLevel(S, level)) for (const f of [0, 1]) { const [X, Y] = PP(x * CM, f * Wcm()); const d = Math.hypot(X - px_, Y - py_); if (d < bd) { bd = d; best = x + ':' + f; } }
  return best;
}
function distSeg(px_, py_, A, B) { const dx = B[0] - A[0], dy = B[1] - A[1], l2 = dx * dx + dy * dy || 1; let t = ((px_ - A[0]) * dx + (py_ - A[1]) * dy) / l2; t = Math.max(0, Math.min(1, t)); return Math.hypot(px_ - A[0] - t * dx, py_ - A[1] - t * dy); }
function itemAt(px_, py_) {
  let best = null, bd = Math.max(10, scale * 1.1);
  const W = Wcm(), tryIt = (d, it) => { if (d < bd) { bd = d; best = it; } };
  if (view === 'side') {
    // 앞면을 우선하고, 흐린 뒷면 그림이나 가로재를 눌러도 같은 부재가 잡힌다
    for (const [k, s] of Object.entries(S.segs)) {
      const a = [s.a.x * CM, s.a.y * CM], b = [s.b.x * CM, s.b.y * CM];
      tryIt(distSeg(px_, py_, PS(a[0], a[1]), PS(b[0], b[1])), { type: 'seg', key: k });
      tryIt(distSeg(px_, py_, PS(a[0], a[1], W), PS(b[0], b[1], W)) + 4, { type: 'seg', key: k });
    }
    for (const [k, p] of Object.entries(S.plan)) tryIt(distSeg(px_, py_, PS(p.xa * CM, p.y * CM, 0), PS(p.xb * CM, p.y * CM, W)) + 2, { type: 'plan', key: k });
  } else for (const [k, p] of Object.entries(S.plan)) { if (p.y !== level) continue; tryIt(distSeg(px_, py_, PP(p.xa * CM, 0), PP(p.xb * CM, W)), { type: 'plan', key: k }); }
  return best;
}
// 지우개: 누른 채 끌면 여러 개를 지우고, 한 번 끈 것은 되돌리기 한 번으로 복구된다
let erasing = null, eraseSnap = null;
function beginErase() { erasing = new Set(); eraseSnap = JSON.stringify(S); }
function endErase() { erasing = null; eraseSnap = null; }
function eraseItem(it) {
  if (!it) return;
  const id = it.type + it.key;
  if (erasing && erasing.has(id)) return;
  const coll = it.type === 'seg' ? S.segs : S.plan, s = coll[it.key];
  if (!s) return;
  if (erasing) erasing.add(id);
  if (eraseSnap) { undoStack.push(eraseSnap); eraseSnap = null; } else if (!erasing) snapshot();
  if (s.wood && s.steel) { s.steel = false; toast('겹쳐 있던 철물을 뺐어요. 한 번 더 지우면 목재도 지워져요.'); }
  else delete coll[it.key];
  hoverItem = null;
  changed();
}
function placeSide(a, b) { snapshot(); const [x1, y1] = Pk(a), [x2, y2] = Pk(b); addMember(S, { x: x1, y: y1 }, { x: x2, y: y2 }, MATMAP[tool]); changed(); }
function placePlan(a, b) {
  const [x1, f1] = a.split(':').map(Number), [x2, f2] = b.split(':').map(Number);
  if (f1 === f2) { toast('가로재는 앞면과 뒷면 트러스를 잇는 방향으로 놓아요.'); return; }
  snapshot(); const xa = f1 === 0 ? x1 : x2, xb = f1 === 0 ? x2 : x1; setPlan(S, level, xa, xb, MATMAP[tool]); changed();
}
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('pointerdown', e => {
  if (mode !== 'build') return;
  const [px_, py_] = toLocal(e), right = e.button === 2;
  const k = view === 'side' ? snapSide(px_, py_) : snapPlan(px_, py_);
  if ((right && tool !== 'rubber') || tool === 'erase') { startNode = null; beginErase(); cv.setPointerCapture(e.pointerId); eraseItem(itemAt(px_, py_)); return; }
  if (tool in MATS) {
    if (!k) { if (isPlanView()) toast('이 높이의 트러스 절점(노란 고리)에서 시작하세요.'); return; }
    if (startNode && startNode !== k) { view === 'side' ? placeSide(startNode, k) : placePlan(startNode, k); startNode = null; return; }
    startNode = k; dragMoved = false; cv.setPointerCapture(e.pointerId); dirty = true; return;
  }
  const nodeKey = k && (view === 'side' ? k : nk(+k.split(':')[0], level));
  if (tool === 'rubber') {
    if (!nodeKey || !R.nodeIndex.has(nodeKey)) { toast('부재가 연결된 절점을 클릭하세요.'); return; }
    snapshot(); S.wraps[nodeKey] = Math.max(MIN_WRAPS, Math.min(MAX_WRAPS, W_(nodeKey) + ((e.shiftKey || right) ? -1 : 1))); changed(); showTip(px_, py_); return;
  }
  if (tool === 'load') {
    if (view !== 'side') { toast('하중 위치는 측면 보기에서 정해요.'); return; }
    if (!k || !R.nodeIndex.has(k)) { toast('부재가 연결된 절점을 고르세요.'); return; }
    if (S.loadType === 'point') { snapshot(); S.load = k; changed(); return; }
    if (loadStart && loadStart !== k) { setUdl(loadStart, k); loadStart = null; return; }
    loadStart = k; dragMoved = false; cv.setPointerCapture(e.pointerId); dirty = true; return;
  }
});
cv.addEventListener('pointermove', e => {
  const [px_, py_] = toLocal(e);
  const k = view === 'side' ? snapSide(px_, py_) : snapPlan(px_, py_);
  if (k !== hover) { hover = k; const st = startNode || loadStart; if (st && k && k !== st) dragMoved = true; }
  hoverItem = (tool in MATS && startNode) ? null : itemAt(px_, py_);
  if (erasing && mode === 'build') eraseItem(hoverItem);
  if (mode === 'build') dirty = true;
  showTip(px_, py_);
});
cv.addEventListener('pointercancel', endErase);
cv.addEventListener('pointerup', e => {
  if (erasing) { endErase(); return; }
  if (tool === 'load' && loadStart) {
    const [px_, py_] = toLocal(e), k = snapSide(px_, py_);
    if (k && k !== loadStart && dragMoved) { setUdl(loadStart, k); loadStart = null; }
    return;
  }
  if (!(tool in MATS) || !startNode) return;
  const [px_, py_] = toLocal(e), k = view === 'side' ? snapSide(px_, py_) : snapPlan(px_, py_);
  if (k && k !== startNode && dragMoved) { view === 'side' ? placeSide(startNode, k) : placePlan(startNode, k); startNode = null; dirty = true; }
});
cv.addEventListener('pointerleave', () => { endErase(); hover = null; hoverItem = null; $('tip').hidden = true; dirty = true; });

function showTip(px_, py_) {
  const tip = $('tip');
  if (mode !== 'build' || !R) { tip.hidden = true; return; }
  let html = '';
  const nodeKey = hover && (view === 'side' ? hover : nk(+hover.split(':')[0], level));
  const ok = R.status === 'ok';
  if (nodeKey && R.nodeIndex.has(nodeKey) && (!hoverItem || tool === 'rubber')) {
    const n = R.nodes[R.nodeIndex.get(nodeKey)];
    html = `<b>절점 (${cm(n.x)}, ${cm(n.y)}) cm</b><br>고무줄 ${n.w}회 · 미끄러짐 저항 ${n.w * MAT.band.slip} N` +
      (ok && n.joint ? `<br>파괴 하중일 때 필요 ${(n.joint.demand * R.Pface).toFixed(0)} N · 사용률 ${(n.joint.demand * R.Pface / n.joint.R * 100).toFixed(0)}%` : '') +
      `<br>${R.braced.has(n.k) ? '횡지지됨 (평면 밖으로 안 움직임)' : '횡지지 없음'}` +
      (R.loadW && R.loadW.has(R.nodeIndex.get(n.k)) ? `<br>하중 몫 ${(R.loadW.get(R.nodeIndex.get(n.k)) * 100).toFixed(0)}%${(n.x === 0 || n.x === 12) && n.y === 0 ? ' (지점으로 바로 감)' : ''}` : '');
  } else if (hoverItem && hoverItem.type === 'seg') {
    const els = R.elements.filter(e => e.key === hoverItem.key);
    html = els.map(e => {
      const head = `<b>${e.kind === 'wood' ? woodName(e.n) : '철물 Ø3'}</b> · 길이 ${(e.L / 10).toFixed(1)} cm`;
      if (!ok) return head + `<br>인장 저항 ${e.res ? e.res.tens.R.toFixed(0) : '—'} N`;
      if (Math.abs(e.f) < 1e-9) return head + '<br>0부재 (힘 없음)';
      const F = e.f * R.Pface;
      return head + `<br>${F > 0 ? '인장' : '압축'} ${Math.abs(F).toFixed(0)} N / 저항 ${e.R.toFixed(0)} N · ${e.mode}` +
        `<br>사용률 ${(Math.abs(F) / e.R * 100).toFixed(0)}% · 1 kg당 ${(Math.abs(e.f) * G_ACC / 2).toFixed(1)} N` +
        (e.f < 0 && e.kind === 'wood' ? `<br>평면 밖 좌굴 길이 ${(e.Lout / 10).toFixed(0)} cm` : '');
    }).join('<hr>');
  } else if (hoverItem && hoverItem.type === 'plan') {
    const p = S.plan[hoverItem.key], L = Math.hypot((p.xb - p.xa) * CM, Wcm());
    html = `<b>${p.xa === p.xb ? '가로보' : '횡브레이싱'}</b> · ${p.wood ? woodName(p.wood) : ''}${p.wood && p.steel ? ' + ' : ''}${p.steel ? '철물' : ''} · 길이 ${L.toFixed(1)} cm<br>연직 하중만 받으므로 부재력 0. 옆으로 잡아 주는 역할`;
  }
  if (!html) { tip.hidden = true; return; }
  tip.innerHTML = html; tip.hidden = false;
  const tw = tip.offsetWidth; tip.style.left = Math.max(4, Math.min(px_ + 14, Wpx - tw - 6)) + 'px'; tip.style.top = Math.max(4, py_ - 70) + 'px';
}

/* ───────────────── 화면 전환·버튼 ───────────────── */
function buildHotbar() {
  const hb = $('hotbar'); hb.innerHTML = '';
  TOOLS.forEach((t, i) => {
    const d = document.createElement('button'); d.className = 'slot' + (t.id === tool ? ' sel' : ''); d.title = t.label; d.setAttribute('aria-label', t.label);
    d.innerHTML = `<span class="k">${i + 1}</span><svg viewBox="0 0 16 16" shape-rendering="crispEdges">${t.icon}</svg>`;
    d.onclick = () => setTool(t.id); hb.appendChild(d);
  });
}
function setTool(id) {
  tool = id; startNode = null; loadStart = null; buildHotbar();
  const n = $('toolname'); n.textContent = TOOLS.find(t => t.id === id).label; n.style.opacity = 1;
  clearTimeout(setTool.h); setTool.h = setTimeout(() => n.style.opacity = 0, 1600);
  cv.style.cursor = id === 'erase' ? 'not-allowed' : 'crosshair'; dirty = true;
}
function buildLevels() {
  const box = $('levels'); box.innerHTML = '';
  if (!isPlanView()) { box.hidden = true; $('ptools').hidden = true; return; }
  box.hidden = false; $('ptools').hidden = false;
  const ls = levelsOf(S);
  if (!ls.length) { box.innerHTML = '<span class="muted">먼저 측면에서 트러스를 지으세요</span>'; return; }
  for (const y of ls) {
    const b = document.createElement('button'); b.className = 'btn sm' + (y === level ? ' on' : '');
    b.textContent = `높이 ${y * CM} cm`; b.onclick = () => { level = y; startNode = null; buildLevels(); dirty = true; }; box.appendChild(b);
  }
}
function setView(v) {
  if (v === '3d' && !T) { toast('이 브라우저에서는 3D 화면을 열 수 없어요.'); return; }
  if (v === '3d' && T && T.auto) { T.theta = 0.55; T.phi = 1.12; T.auto = false; }
  if (v !== view && (v === 'plan' || v === 'under')) { const ls = levelsOf(S); if (ls.length) level = v === 'under' ? ls[ls.length - 1] : ls[0]; }
  view = v; startNode = null; hover = null; hoverItem = null; $('tip').hidden = true;
  document.querySelectorAll('.tab').forEach(b => b.classList.toggle('on', b.dataset.view === v));
  vp.classList.toggle('v3d', v === '3d');
  $('camtools').hidden = v !== '3d';
  $('vhint').textContent = HINTS[v];
  buildLevels(); fit(); resize3D(); dirty = true;
}
document.querySelectorAll('.tab').forEach(b => b.onclick = () => setView(b.dataset.view));
document.addEventListener('keydown', e => {
  if (!$('doc').hidden) { if (e.key === 'Escape') closeDoc(); return; }
  const tag = e.target.tagName;
  if (tag === 'SELECT' || (tag === 'INPUT' && e.target.type !== 'checkbox')) return;
  if (e.key === ' ' && (tag === 'INPUT' || tag === 'BUTTON')) { e.preventDefault(); e.target.blur(); }
  if (e.key >= '1' && e.key <= String(TOOLS.length)) setTool(TOOLS[+e.key - 1].id);
  else if (e.key === ' ') { e.preventDefault(); startTest(); }
  else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); doUndo(); }
  else if (e.key === 'Escape') { startNode = null; loadStart = null; dirty = true; }
  else if (!e.ctrlKey && !e.metaKey && !e.altKey && ['q', 'w', 'r', 'e'].includes(e.key.toLowerCase())) setView({ q: 'side', w: 'plan', r: 'under', e: '3d' }[e.key.toLowerCase()]);
});
function doUndo() { if (mode !== 'build' || !undoStack.length) return; S = JSON.parse(undoStack.pop()); syncControls(); changed(false); }
function syncControls() { $('brace').checked = S.bracingOn; $('width').value = String(+(S.width * CM).toFixed(1)); $('ltype').value = S.loadType || 'udl'; }
let loadStart = null;
function setUdl(a, b) {
  const [x1, y1] = Pk(a), [x2, y2] = Pk(b);
  if (y1 !== y2) { toast('분포하중의 시작과 끝은 같은 높이의 절점이어야 해요.'); return; }
  snapshot(); S.udl = { y: y1, x0: Math.min(x1, x2), x1: Math.max(x1, x2) }; changed();
  toast(`${udlText()}, 높이 ${y1 * CM} cm 에 고르게 올렸어요.`);
}
function loadSummary() {
  if (S.loadType === 'point') { const [x, y] = Pk(S.load || nk(6, 0)); return `집중하중 · 절점 (${x * CM}, ${y * CM}) cm`; }
  const u = S.udl || { y: 0 }; return `${udlText()} · 높이 ${u.y * CM} cm`;
}
$('undo').onclick = doUndo;
$('clear').onclick = () => { if (mode !== 'build') return; snapshot(); S.segs = {}; S.plan = {}; S.wraps = {}; S.name = '사용자 설계'; changed(false); toast('모두 지웠어요. 되돌리기(Ctrl+Z)로 복구할 수 있어요.'); };
$('preset').onchange = e => { const v = e.target.value; e.target.value = ''; e.target.blur(); if (!v || mode !== 'build') return; snapshot(); const keepW = S.width; S = PRESETS[v](); S.width = keepW; syncControls(); changed(false); };
$('test').onclick = startTest;
$('brace').onchange = e => { snapshot(); S.bracingOn = e.target.checked; changed(); };
$('forces').onchange = e => { showForces = e.target.checked; update3D(0, null, false); dirty = true; };
$('ltype').onchange = e => {
  if (mode !== 'build') return;
  snapshot(); S.loadType = e.target.value;
  if (S.loadType === 'point' && (!S.load || !structNodes(S).has(S.load))) S.load = structNodes(S).has(nk(6, 0)) ? nk(6, 0) : (R && R.loadIdx >= 0 ? R.nodes[R.loadIdx].k : nk(6, 0));
  changed(); e.target.blur();
};
$('lfull').onclick = () => {
  if (mode !== 'build') return;
  const ls = levelsOf(S), y = ls.includes(0) ? 0 : (ls[ls.length - 1] ?? 0);
  snapshot(); S.udl = { y, x0: 0, x1: 12 }; changed(); toast(`${udlText()}, 높이 ${y * CM} cm (다리 전체)에 고르게 올렸어요.`);
};
$('width').onchange = e => {
  const v = Math.max(3, Math.min(30, Math.round((+e.target.value || 10) * 2) / 2)); // cm, 0.5 단위
  e.target.value = v; if (v === Wcm()) return;
  snapshot(); S.width = v / CM; changed(); fit();
};
$('autobrace').onclick = () => { if (!nodesAtLevel(S, level).length) return; snapshot(); autoBrace(S, level); changed(); toast(`높이 ${level * CM} cm 에 가로보와 X자 브레이싱을 채웠어요.`); };
$('clearlevel').onclick = () => { snapshot(); for (const [k, p] of Object.entries(S.plan)) if (p.y === level) delete S.plan[k]; changed(); };
$('clearhist').onclick = () => { history = []; renderHistory(); save(); };
window.addEventListener('resize', resize);

/* ───────────────── 루프 ───────────────── */
function loop(now) {
  if (mode === 'test') {
    anim.t = Math.min(1, (now - anim.t0) / DUR);
    const e = anim.t;
    counter(`${(e * anim.R.kg).toFixed(1)} kg<small>물 ${(e * anim.R.kg).toFixed(1)} L</small>`, true);
    update3D(anim.exag * e * anim.R.Pface, e * anim.R.Pface, false); dirty = true;
    if (anim.t >= 1) { mode = 'flash'; anim.t1 = now; }
  } else if (mode === 'flash') {
    update3D(anim.exag * anim.R.Pface, anim.R.Pface, true); dirty = true;
    if (now - anim.t1 > (reduceMotion ? 300 : 750)) startCollapse();
  } else if (mode === 'collapse') {
    const dt = Math.min(0.033, (now - anim.last) / 1000); anim.last = now;
    stepPieces(dt); collapse3D(); dirty = true;
    if (now - anim.t2 > (reduceMotion ? 200 : 2300)) finish();
  } else if (R && R.status === 'unstable') dirty = true;
  else if (lastCrit) { dirty = true; if (T) update3D(0, null, false); }
  if (dirty && view !== '3d') { draw2D(); dirty = false; }
  render3D();
  requestAnimationFrame(loop);
}

