// ENGINE-START
/* ── 역학 엔진: 핀 절점 2D 트러스(측면 한 면), 직접강성법, 단위하중 1 N ──
   좌표는 격자 단위(1칸 = 5 cm). 길이는 mm, 힘은 N, 응력은 MPa(N/mm²). */
const GRID_MM = 50;
const SUPPORTS = [{ x: 0, y: 0, type: 'pin' }, { x: 12, y: 0, type: 'roller' }]; // 경간 60 cm
const MAT = {
  wood:  { E: 10000, A1: 25, I1: 52.08, ft: 60, fc: 35, rho: 0.0005 },
  steel: { E: 200000, A: Math.PI * 9 / 4, I: Math.PI * 81 / 64, fy: 250, rho: 0.00785 },
  band:  { kw: 150, slip: 60, g: 0.3 }
};
// 목재 단면: wood 값 1~3 = 5 mm 각재를 그 수만큼 겹쳐 붙인 집성재, 10 = 10 mm 각재 1개
const BIG = 10;
const secA = w => w === BIG ? 100 : MAT.wood.A1 * w;            // mm²
const secI = w => w === BIG ? 1e4 / 12 : MAT.wood.I1 * w;       // mm⁴ (10×10: bh³/12 = 833 mm⁴)
const woodName = w => w === BIG ? '10 mm 각재' : `5 mm ${w}겹`;
const woodVis = w => w === BIG ? 2.6 : w;                         // 그림 굵기용
const DEFAULT_WRAPS = 3, MAX_WRAPS = 8, MIN_WRAPS = 1, G_ACC = 9.80665;

const nk = (x, y) => x + ',' + y;
const segKey = (a, b) => { const ka = nk(a.x, a.y), kb = nk(b.x, b.y); return ka < kb ? ka + '|' + kb : kb + '|' + ka; };
function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a; }
function unitDir(a, b) { const dx = b.x - a.x, dy = b.y - a.y, g = gcd(dx, dy) || 1; return (dx / g) + ':' + (dy / g); }
function interior(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, px = p.x - a.x, py = p.y - a.y;
  if (dx * py - dy * px !== 0) return false;
  const t = dx * px + dy * py;
  return t > 0 && t < dx * dx + dy * dy;
}
function getWraps(m, k) { const w = m.wraps[k]; return w == null ? DEFAULT_WRAPS : w; }
function structNodes(m) {
  const out = new Map();
  for (const s of Object.values(m.segs)) { out.set(nk(s.a.x, s.a.y), s.a); out.set(nk(s.b.x, s.b.y), s.b); }
  return out;
}
function splitAt(m, pt) {
  for (const [k, s] of Object.entries(m.segs)) {
    if (!interior(pt, s.a, s.b)) continue;
    delete m.segs[k];
    const p = { x: pt.x, y: pt.y };
    m.segs[segKey(s.a, p)] = { a: s.a, b: p, wood: s.wood, steel: s.steel };
    m.segs[segKey(p, s.b)] = { a: p, b: s.b, wood: s.wood, steel: s.steel };
  }
}
// mat = {wood:n} | {steel:true}. 기존 절점에서 자동으로 나누고, 같은 구간이면 재료를 겹친다.
function addMember(m, p, q, mat) {
  if (p.x === q.x && p.y === q.y) return false;
  splitAt(m, p); splitAt(m, q);
  const dx = q.x - p.x, dy = q.y - p.y;
  const pts = [...structNodes(m).values(), ...SUPPORTS].filter(n => interior(n, p, q));
  const uniq = [...new Map(pts.map(n => [nk(n.x, n.y), n])).values()]
    .sort((u, v) => ((u.x - p.x) * dx + (u.y - p.y) * dy) - ((v.x - p.x) * dx + (v.y - p.y) * dy));
  const chain = [p, ...uniq, q];
  for (let i = 0; i < chain.length - 1; i++) {
    const a = { x: chain[i].x, y: chain[i].y }, b = { x: chain[i + 1].x, y: chain[i + 1].y };
    const k = segKey(a, b);
    const s = m.segs[k] || (m.segs[k] = { a, b, wood: 0, steel: false });
    if (mat.wood) s.wood = mat.wood;
    if (mat.steel) s.steel = true;
  }
  return true;
}
// 높이 y 에서 xa→xb 사이 현재(수평 부재)가 끊김 없이 이어져 있나
function chordPath(m, y, xa, xb) {
  const lo = Math.min(xa, xb), hi = Math.max(xa, xb);
  if (lo === hi) return false;
  const iv = Object.values(m.segs).filter(s => s.a.y === y && s.b.y === y)
    .map(s => [Math.min(s.a.x, s.b.x), Math.max(s.a.x, s.b.x)]);
  let cur = lo, guard = 0;
  while (cur < hi && guard++ < 100) {
    const nx = iv.find(([u]) => u === cur);
    if (!nx) return false;
    cur = nx[1];
  }
  return cur >= hi;
}
function nodesAtLevel(m, y) {
  const xs = new Set();
  for (const s of Object.values(m.segs)) { if (s.a.y === y) xs.add(s.a.x); if (s.b.y === y) xs.add(s.b.x); }
  return [...xs].sort((a, b) => a - b);
}
function levelsOf(m) {
  const ys = new Set();
  for (const s of Object.values(m.segs)) { ys.add(s.a.y); ys.add(s.b.y); }
  return [...ys].sort((a, b) => b - a);
}
const planKey = (y, xa, xb) => y + '|' + xa + '|' + xb; // xa: 앞면, xb: 뒷면
function prunePlan(m) {
  const ns = structNodes(m);
  for (const [k, p] of Object.entries(m.plan)) if (!ns.has(nk(p.xa, p.y)) || !ns.has(nk(p.xb, p.y))) delete m.plan[k];
}
// 횡지지 절점: 평면(위 보기)에서 가로재 2개 + 현재 1구간이 삼각형을 이루는 꼭짓점. 지점은 항상 지지.
function bracedNodes(m) {
  const set = new Set(SUPPORTS.map(s => nk(s.x, s.y)));
  if (!m.bracingOn) return set;
  const byY = {};
  for (const p of Object.values(m.plan)) (byY[p.y] = byY[p.y] || []).push(p);
  for (const [yk, list] of Object.entries(byY)) {
    const y = +yk;
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const p = list[i], q = list[j];
      if (p.xa === q.xa && p.xb !== q.xb && chordPath(m, y, p.xb, q.xb)) [p.xa, p.xb, q.xb].forEach(x => set.add(nk(x, y)));
      if (p.xb === q.xb && p.xa !== q.xa && chordPath(m, y, p.xa, q.xa)) [p.xb, p.xa, q.xa].forEach(x => set.add(nk(x, y)));
    }
  }
  return set;
}

// 하중을 절점에 나눈다(합 = 1).
// 분포하중: 바닥판이 이웃 절점 사이를 단순 지지한다고 보고, 각 구간에 실린 몫을 지렛대 규칙으로 양 끝 절점에 나눈다.
// 지점 위에 실린 몫은 땅으로 바로 가서 부재에 힘을 주지 않는다.
function loadPoints(m) {
  const ns = structNodes(m);
  if (m.loadType === 'point') return m.load && ns.has(m.load) ? { list: [[m.load, 1]], type: 'point' } : { list: [], msg: '하중(6) 도구로 측면 보기에서 하중을 걸 절점을 찍으세요.' };
  const u = m.udl || { y: 0, x0: 0, x1: 12 };
  const x0 = Math.min(u.x0, u.x1), x1 = Math.max(u.x0, u.x1);
  const xs = [...ns.values()].filter(n => n.y === u.y).map(n => n.x).sort((a, b) => a - b);
  if (!xs.length) return { list: [], msg: `분포하중을 받을 높이 ${u.y * 5} cm에 절점이 없어요. 하중(6) 도구로 바닥 높이의 절점 두 개를 이어 범위를 정하세요.` };
  if (x1 - x0 <= 0) return { list: [], msg: '분포하중 범위 길이가 0이에요. 하중(6) 도구로 시작과 끝 절점을 이어 주세요.' };
  const w = new Map(xs.map(x => [x, 0])), add = (x, v) => w.set(x, w.get(x) + v);
  const first = xs[0], last = xs[xs.length - 1];
  if (x0 < first) add(first, Math.min(x1, first) - x0);
  if (x1 > last) add(last, x1 - Math.max(x0, last));
  for (let k = 0; k < xs.length - 1; k++) {
    const a = xs[k], b = xs[k + 1], lo = Math.max(a, x0), hi = Math.min(b, x1);
    if (hi <= lo) continue;
    const len = hi - lo, c = (lo + hi) / 2;
    add(a, len * (b - c) / (b - a)); add(b, len * (c - a) / (b - a));
  }
  return { list: xs.filter(x => w.get(x) > 1e-12).map(x => [nk(x, u.y), w.get(x) / (x1 - x0)]), type: 'udl', x0, x1, y: u.y };
}

function solveLinear(K, F, n) {
  let maxDiag = 0;
  for (let i = 0; i < n; i++) maxDiag = Math.max(maxDiag, Math.abs(K[i][i]));
  const tol = Math.max(maxDiag, 1e-30) * 1e-10;
  for (let col = 0; col < n; col++) {
    let p = col, best = Math.abs(K[col][col]);
    for (let r = col + 1; r < n; r++) { const v = Math.abs(K[r][col]); if (v > best) { best = v; p = r; } }
    if (best < tol) return { singular: true, dof: col };
    if (p !== col) { [K[p], K[col]] = [K[col], K[p]]; [F[p], F[col]] = [F[col], F[p]]; }
    const piv = K[col][col], rc = K[col];
    for (let r = col + 1; r < n; r++) {
      const f = K[r][col] / piv;
      if (f === 0) continue;
      const row = K[r];
      for (let c = col; c < n; c++) row[c] -= f * rc[c];
      F[r] -= f * F[col];
    }
  }
  const u = new Float64Array(n);
  for (let r = n - 1; r >= 0; r--) { let s = F[r]; for (let c = r + 1; c < n; c++) s -= K[r][c] * u[c]; u[r] = s / K[r][r]; }
  return { singular: false, u };
}
function woodRes(w, L, Lout) {
  const W = MAT.wood, A = secA(w), pe = Math.PI * Math.PI * W.E * secI(w);
  return {
    tens: { R: W.ft * A, mode: '인장 파단' },
    comp: [{ R: W.fc * A, mode: '압축 파괴(압궤)' }, { R: pe / (L * L), mode: '면내 좌굴' }, { R: pe / (Lout * Lout), mode: '면외 좌굴' }]
      .sort((u, v) => u.R - v.R)[0]
  };
}
function steelRes(L) {
  const S = MAT.steel, eul = Math.PI * Math.PI * S.E * S.I / (L * L);
  return { tens: { R: S.fy * S.A, mode: '인장 항복' }, comp: eul < S.fy * S.A ? { R: eul, mode: '좌굴' } : { R: S.fy * S.A, mode: '압축 항복' } };
}

function analyze(m) {
  const out = { status: 'ok', msg: '', warn: '', nodes: [], nodeIndex: new Map(), elements: [], joints: [], ranked: [],
    Pface: 0, Ptotal: 0, kg: 0, defl: 0, weight: 0, woodLen: 0, steelLen: 0, wraps: 0, mechNode: null, loadIdx: -1, braced: new Set(), maxU: 0 };
  const segs = Object.values(m.segs);
  const nodes = out.nodes, idx = out.nodeIndex;
  const addN = p => { const k = nk(p.x, p.y); if (!idx.has(k)) { idx.set(k, nodes.length); nodes.push({ k, x: p.x, y: p.y, els: [], w: getWraps(m, k) }); } return idx.get(k); };
  let wG = 0;
  for (const s of segs) {
    const i = addN(s.a), j = addN(s.b);
    const L = Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y) * GRID_MM;
    const base = { seg: s, key: segKey(s.a, s.b), i, j, L, f: 0 };
    if (s.wood > 0) { const A = secA(s.wood); out.elements.push({ ...base, kind: 'wood', n: s.wood, EA: MAT.wood.E * A }); wG += 2 * L * A * MAT.wood.rho; out.woodLen += L; }
    if (s.steel) { out.elements.push({ ...base, kind: 'steel', n: 0, EA: MAT.steel.E * MAT.steel.A }); wG += 2 * L * MAT.steel.A * MAT.steel.rho; out.steelLen += 2 * L; }
  }
  out.woodLen *= 2;
  for (const p of Object.values(m.plan)) {
    const L = Math.hypot((p.xb - p.xa) * GRID_MM, m.width * GRID_MM);
    if (p.wood) { wG += L * secA(p.wood) * MAT.wood.rho; out.woodLen += L; }
    if (p.steel) { wG += L * MAT.steel.A * MAT.steel.rho; out.steelLen += L; }
  }
  for (const n of nodes) out.wraps += n.w;
  out.weight = wG + 2 * out.wraps * MAT.band.g;
  out.elements.forEach((e, k) => { e.idx = k; nodes[e.i].els.push(k); nodes[e.j].els.push(k); });
  out.braced = bracedNodes(m);

  if (!segs.length) { out.status = 'empty'; out.msg = '핫바에서 재료를 골라 측면 보기에서 다리를 지어 보세요.'; return out; }
  const sup = SUPPORTS.map(s => idx.get(nk(s.x, s.y)));
  if (sup[0] == null || sup[1] == null) {
    out.status = 'nosupport';
    out.msg = sup[0] == null && sup[1] == null ? '양쪽 지점(0 cm, 60 cm)에 부재를 연결하세요.' : sup[0] == null ? '왼쪽 지점(0 cm)에 부재를 연결하세요.' : '오른쪽 지점(60 cm)에 부재를 연결하세요.';
    return out;
  }
  const lp = loadPoints(m);
  if (!lp.list.length) { out.status = 'noload'; out.msg = lp.msg; return out; }
  const loadW = new Map(lp.list.map(([k, w]) => [idx.get(k), w]));
  const onSupport = i => i === sup[0] || i === sup[1];
  const free_ = [...loadW].filter(([i]) => !onSupport(i));
  if (!free_.length) { out.status = 'noload'; out.msg = lp.type === 'point' ? '하중이 지점 바로 위에 있어요. 다리 중간으로 옮겨 주세요.' : '하중이 모두 지점 바로 위에 실려 다리가 받는 힘이 없어요. 범위를 다리 가운데까지 넓히세요.'; return out; }
  out.loads = lp; out.loadW = loadW;
  out.loadIdx = free_.sort((a, b) => b[1] - a[1])[0][0];
  const noBeam = free_.map(([i]) => nodes[i]).filter(n => !Object.values(m.plan).some(p => p.y === n.y && (p.xa === n.x || p.xb === n.x)));
  if (noBeam.length)
    out.warn = `하중을 받는 절점 ${noBeam.map(n => `(${n.x * 5}, ${n.y * 5})`).join(', ')} cm에 가로보가 없어요. 위·아래 보기에서 이 높이에 가로보를 놓아야 ${lp.type === 'point' ? '추를' : '바닥판 하중을'} 양쪽 트러스에 나눠 줄 수 있어요.`;

  // 평면 밖 좌굴 길이: 일직선으로 이어진 목재를 따라가다 횡지지 절점에서 멈춘다
  const woodAt = new Map();
  for (const e of out.elements) if (e.kind === 'wood') {
    const a = nodes[e.i], b = nodes[e.j];
    woodAt.set(a.k + '|' + unitDir(a, b), e); woodAt.set(b.k + '|' + unitDir(b, a), e);
  }
  for (const e of out.elements) {
    e.Lout = e.L;
    if (e.kind !== 'wood') continue;
    const a = nodes[e.i], b = nodes[e.j];
    let total = e.L;
    for (const [start, dir] of [[b, unitDir(a, b)], [a, unitDir(b, a)]]) {
      let cur = start, g = 0;
      while (!out.braced.has(cur.k) && g++ < 100) {
        const nx = woodAt.get(cur.k + '|' + dir);
        if (!nx) break;
        total += nx.L;
        cur = nodes[nx.i] === cur ? nodes[nx.j] : nodes[nx.i];
      }
    }
    e.Lout = total;
  }

  const nd = nodes.length * 2;
  const K = Array.from({ length: nd }, () => new Float64Array(nd));
  let ksum = 0;
  for (const e of out.elements) {
    const a = nodes[e.i], b = nodes[e.j];
    e.c = (b.x - a.x) * GRID_MM / e.L; e.s = (b.y - a.y) * GRID_MM / e.L;
    e.k = 1 / (e.L / e.EA + 1 / (a.w * MAT.band.kw) + 1 / (b.w * MAT.band.kw));
    ksum += e.k;
    const C = [[e.c * e.c, e.c * e.s], [e.c * e.s, e.s * e.s]], d = [2 * e.i, 2 * e.i + 1, 2 * e.j, 2 * e.j + 1];
    for (let r = 0; r < 4; r++) for (let q = 0; q < 4; q++) K[d[r]][d[q]] += ((r < 2) === (q < 2) ? 1 : -1) * e.k * C[r % 2][q % 2];
  }
  // 모든 부재가 한 직선 위에 있는 절점(이음점·매달린 끝)은 직각 방향에 아주 약한 스프링을 둔다.
  // 그 방향 힘이 0 이면 결과는 그대로, 하중이 직각으로 걸리면 불안정으로 남는다.
  const kStab = ksum / Math.max(1, out.elements.length) * 1e-6;
  nodes.forEach((n, i) => {
    if (!n.els.length) return;
    const e0 = out.elements[n.els[0]];
    if (!n.els.every(ei => Math.abs(e0.c * out.elements[ei].s - e0.s * out.elements[ei].c) < 1e-9)) return;
    if (loadW.has(i) && Math.abs(e0.c) > 1e-9) return;
    const px = -e0.s, py = e0.c;
    K[2 * i][2 * i] += kStab * px * px; K[2 * i][2 * i + 1] += kStab * px * py;
    K[2 * i + 1][2 * i] += kStab * px * py; K[2 * i + 1][2 * i + 1] += kStab * py * py;
  });
  const fixed = new Set([2 * sup[0], 2 * sup[0] + 1, 2 * sup[1] + 1]);
  const free = []; for (let d = 0; d < nd; d++) if (!fixed.has(d)) free.push(d);
  const Kr = free.map(r => Float64Array.from(free, c => K[r][c]));
  const F = new Float64Array(free.length);
  for (const [i, w] of loadW) { const d = free.indexOf(2 * i + 1); if (d >= 0) F[d] -= w; } // 합계 1 N, 아래로
  const sol = solveLinear(Kr, F, free.length);
  if (sol.singular) {
    out.status = 'unstable';
    out.mechNode = free[sol.dof] >> 1;
    const mn = nodes[out.mechNode];
    out.msg = `불안정 구조(메커니즘)예요. (${mn.x * 5}, ${mn.y * 5}) cm 절점이 붙잡혀 있지 않아요. 사각형 칸에 대각재를 넣어 삼각형으로 만드세요.`;
    return out;
  }
  const U = new Float64Array(nd); free.forEach((d, j) => U[d] = sol.u[j]);
  nodes.forEach((n, i) => { n.ux = U[2 * i]; n.uy = U[2 * i + 1]; });

  const caps = [];
  for (const e of out.elements) {
    const a = nodes[e.i], b = nodes[e.j];
    e.f = e.k * ((b.ux - a.ux) * e.c + (b.uy - a.uy) * e.s);
    const r = e.kind === 'wood' ? woodRes(e.n, e.L, e.Lout) : steelRes(e.L);
    e.res = r;
    const g = e.f >= 0 ? r.tens : r.comp;
    e.R = g.R; e.mode = g.mode;
    e.cap = Math.abs(e.f) > 1e-9 ? e.R / Math.abs(e.f) : Infinity;
    caps.push({ type: 'elem', idx: e.idx, cap: e.cap });
  }
  // 절점 미끄러짐: 일직선으로 이어지는 같은 재료는 힘의 차이만 고무줄이 옮긴다. 압축은 지압으로 50%.
  const contAt = new Map();
  for (const e of out.elements) {
    const a = nodes[e.i], b = nodes[e.j], tag = e.kind + e.n;
    contAt.set(a.k + '|' + unitDir(a, b) + '|' + tag, e); contAt.set(b.k + '|' + unitDir(b, a) + '|' + tag, e);
  }
  nodes.forEach((n, i) => {
    let dem = 0;
    for (const ei of n.els) {
      const e = out.elements[ei];
      const other = nodes[e.i] === n ? nodes[e.j] : nodes[e.i];
      const o = contAt.get(n.k + '|' + unitDir(other, n) + '|' + e.kind + e.n);
      const t = o && o !== e ? e.f - o.f : e.f;
      dem = Math.max(dem, Math.abs(t) * (e.f >= 0 ? 1 : 0.5));
    }
    const R = n.w * MAT.band.slip;
    n.joint = { idx: i, demand: dem, R, cap: dem > 1e-9 ? R / dem : Infinity };
    out.joints.push(n.joint);
    caps.push({ type: 'joint', idx: i, cap: n.joint.cap });
  });
  out.ranked = caps.filter(c => isFinite(c.cap)).sort((u, v) => u.cap - v.cap);
  if (!out.ranked.length) { out.status = 'noload'; out.msg = '하중이 어느 부재에도 전달되지 않아요.'; return out; }
  out.govern = out.ranked[0];
  out.Pface = out.govern.cap;
  out.Ptotal = 2 * out.Pface;
  out.kg = out.Ptotal / G_ACC;
  out.defl = Math.max(0, ...nodes.map(n => -n.uy)) * out.Pface; // 가장 많이 처진 절점
  out.maxU = Math.max(...nodes.map(n => Math.hypot(n.ux, n.uy)));
  return out;
}
// ENGINE-END
