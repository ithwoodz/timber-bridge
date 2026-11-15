
/* ───────────────── 과제 규칙 점검 · 점수 · 개선 추천 · 팁 ───────────────── */
const RULES_KEY = 'tb-lab-3d-rules';
const RULES = Object.assign({ v: 2, score: 'load', minWidth: 60, minLength: 600, max10: 10, max5: 20, maxWeight: '', deflLimit: '', maxSticks: '', maxSteel: '', maxWraps: '', cap: '', stock: 60, margin: 0.5 },
  (() => { try { return JSON.parse(localStorage.getItem(RULES_KEY)) || {}; } catch (e) { return {}; } })());
// 과제 규칙(최대 하중으로 순위, 지급량 10 mm 10개·5 mm 20개)으로 예전 저장값을 한 번 옮긴다
if (!(RULES.v >= 2)) { Object.assign(RULES, { v: 2, score: 'load', max10: 10, max5: 20 }); try { localStorage.setItem('tb-lab-3d-rules', JSON.stringify(RULES)); } catch (e) {} }
function storeRules() { try { localStorage.setItem(RULES_KEY, JSON.stringify(RULES)); } catch (e) {} }
const numOrNull = v => (v === '' || v == null || isNaN(+v) || +v <= 0) ? null : +v;

// 재료 개수: 각재 조각(두 면 + 가로재), 각재 몇 개에서 잘라내는지, 철물 길이, 고무줄 감기 수
// 각재 몇 개에서 잘라내는지: 긴 조각부터 남은 길이에 채워 넣기 (톱날 두께 0.2 cm)
function packCount(pieces) {
  const lens = pieces.map(L => L + 2 * RULES.margin).sort((a, b) => b - a), bins = [];
  let tooLong = 0;
  for (const L of lens) { if (L > RULES.stock) { tooLong++; continue; } const i = bins.findIndex(r => r >= L + 0.2); if (i >= 0) bins[i] -= L + 0.2; else bins.push(RULES.stock - L - 0.2); }
  return { sticks: bins.length + tooLong, tooLong };
}
function materialsOf(m) {
  const p5 = [], p10 = [];
  let steel = 0;
  const put = (w, L, n) => { for (let f = 0; f < n; f++) { if (w === BIG) p10.push(L); else for (let k = 0; k < w; k++) p5.push(L); } };
  for (const s of Object.values(m.segs)) { const L = Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y) * 5; put(s.wood, L, 2); if (s.steel) steel += 2 * L; }
  for (const p of Object.values(m.plan)) { const L = Math.hypot((p.xb - p.xa) * 5, m.width * 5); put(p.wood, L, 1); if (p.steel) steel += L; }
  let wraps = 0; for (const k of structNodes(m).keys()) wraps += 2 * getWraps(m, k);
  const a = packCount(p5), b = packCount(p10);
  return { pieces5: p5.length, pieces10: p10.length, sticks5: a.sticks, sticks10: b.sticks, tooLong: a.tooLong + b.tooLong, steel, wraps };
}
function compEval(m, r) {
  const ev = { ok: r.status === 'ok', kg: 0, counted: 0, limitBy: null, checks: [], viol: 0, score: null, mat: materialsOf(m) };
  // soft = 지급량처럼 넘어도 추가 요청이 되는 항목: 주의로만 표시하고 위반으로 세지 않는다
  const chk = (label, val, lim, ok, unit, soft) => { ev.checks.push({ label, val, lim, ok, unit, soft }); if (!ok && !soft) ev.viol++; };
  const mw = numOrNull(RULES.maxWeight), ms = numOrNull(RULES.maxSticks), mst = numOrNull(RULES.maxSteel), mwr = numOrNull(RULES.maxWraps), dl = numOrNull(RULES.deflLimit), cap = numOrNull(RULES.cap);
  const mnw = numOrNull(RULES.minWidth), mnl = numOrNull(RULES.minLength);
  if (mnw) chk('다리 폭', (m.width * 50).toFixed(0) + ' mm', mnw + ' mm 초과', m.width * 50 > mnw + 1e-6);
  if (mnl) { const xs = [...structNodes(m).values()].map(n => n.x); const len = xs.length ? (Math.max(...xs) - Math.min(...xs)) * 50 : 0; chk('다리 길이', len.toFixed(0) + ' mm', '≥ ' + mnl + ' mm', len >= mnl - 1e-6); }
  if (mw) chk('다리 무게', r.weight.toFixed(1) + ' g', '≤ ' + mw + ' g', r.weight <= mw);
  const m5 = numOrNull(RULES.max5), m10 = numOrNull(RULES.max10);
  if (m10) chk(`10 mm 각재 (${RULES.stock} cm짜리)`, ev.mat.sticks10 + '개', `지급 ${m10}개`, ev.mat.sticks10 <= m10, '', true);
  if (m5) chk(`5 mm 각재 (${RULES.stock} cm짜리)`, ev.mat.sticks5 + '개', `지급 ${m5}개`, ev.mat.sticks5 <= m5, '', true);
  if (ms) chk(`각재 수 합계`, (ev.mat.sticks5 + ev.mat.sticks10) + '개', '≤ ' + ms + '개', ev.mat.sticks5 + ev.mat.sticks10 <= ms);
  if (mst) chk('철물 길이', (ev.mat.steel / 10).toFixed(0) + ' cm', '≤ ' + mst + ' cm', ev.mat.steel / 10 <= mst);
  if (mwr) chk('고무줄 감기', ev.mat.wraps + '회', '≤ ' + mwr + '회', ev.mat.wraps <= mwr);
  if (ev.mat.tooLong) chk('각재보다 긴 부재', ev.mat.tooLong + '개', '0개 (이어 붙여야 함)', false);
  if (!ev.ok) return ev;
  let kg = r.kg;
  if (dl && r.defl > dl) { kg = r.kg * dl / r.defl; ev.limitBy = `처짐 ${dl} mm 도달`; }
  ev.kg = kg; ev.counted = cap ? Math.min(kg, cap) : kg;
  if (dl) chk('처짐 (파괴 직전)', r.defl.toFixed(1) + ' mm', `${dl} mm에서 시험 종료`, true);
  ev.score = RULES.score === 'load' ? ev.counted : ev.counted / r.weight;
  return ev;
}
const scoreTxt = ev => ev.score == null ? '—' : RULES.score === 'load' ? ev.score.toFixed(1) + ' kg' : `${ev.score.toFixed(3)} kg/g · ${(ev.score * 1000).toFixed(0)}배`;
function objective(m) { const r = analyze(m); const ev = compEval(m, r); return { r, ev, val: ev.ok ? ev.score - 1e6 * ev.viol : -Infinity }; }

/* ── 개선 추천: 한 번에 하나만 바꿔 보고 점수가 오르는 것 ── */
function candidates(m) {
  const out = [], clone = () => JSON.parse(JSON.stringify(m));
  const nodeName = k => { const [x, y] = Pk(k); return `(${x * 5}, ${y * 5})`; };
  for (const k of structNodes(m).keys()) {
    const w = getWraps(m, k);
    if (w < MAX_WRAPS) { const c = clone(); c.wraps[k] = w + 1; out.push({ m: c, txt: `절점 ${nodeName(k)} 고무줄 ${w}→${w + 1}회` }); }
    if (w > MIN_WRAPS) { const c = clone(); c.wraps[k] = w - 1; out.push({ m: c, txt: `절점 ${nodeName(k)} 고무줄 ${w}→${w - 1}회` }); }
  }
  for (const [key, s] of Object.entries(m.segs)) {
    const nm = `(${s.a.x * 5},${s.a.y * 5})–(${s.b.x * 5},${s.b.y * 5})`;
    const up = s.wood === 3 ? BIG : s.wood && s.wood < 3 ? s.wood + 1 : null, dn = s.wood === BIG ? 3 : s.wood > 1 ? s.wood - 1 : null;
    if (up) { const c = clone(); c.segs[key].wood = up; out.push({ m: c, txt: `${nm} ${woodName(s.wood)}→${woodName(up)}` }); }
    if (dn) { const c = clone(); c.segs[key].wood = dn; out.push({ m: c, txt: `${nm} ${woodName(s.wood)}→${woodName(dn)}` }); }
    if (!s.steel && s.wood) { const c = clone(); c.segs[key].steel = true; out.push({ m: c, txt: `${nm} 철물 덧대기` }); }
    if (s.steel && s.wood) { const c = clone(); c.segs[key].steel = false; out.push({ m: c, txt: `${nm} 철물 빼기` }); }
  }
  return out;
}
let suggestions = [];
function computeSuggestions(m) {
  const base = objective(m);
  if (!base.ev.ok) return { base, list: [] };
  const list = [];
  for (const c of candidates(m)) {
    const o = objective(c.m);
    if (o.val > base.val + 1e-9) list.push({ ...c, o });
  }
  list.sort((a, b) => b.o.val - a.o.val);
  return { base, list: list.slice(0, 5) };
}
function autoTune(steps = 25) {
  let m = JSON.parse(JSON.stringify(S)), n = 0;
  const before = objective(m);
  if (!before.ev.ok) { toast('안정된 구조에서만 다듬을 수 있어요.'); return; }
  for (; n < steps; n++) { const { list } = computeSuggestions(m); if (!list.length) break; m = list[0].m; }
  if (!n) { toast('지금 규칙과 점수 기준으로는 한 칸씩 바꿔서 더 좋아지는 곳이 없어요.'); return; }
  snapshot(); S = m; markEdited(); changed(false);
  const after = objective(S);
  toast(`${n}단계 다듬었어요: ${scoreTxt(before.ev)} → ${scoreTxt(after.ev)}. 되돌리기로 원래대로 돌릴 수 있어요.`);
}

/* ── 상황별 대회 팁 ── */
function contextTips(r, ev) {
  const tips = [];
  if (r.status === 'unstable') tips.push(['bad', '사각형 칸이 있어 무너집니다. 모든 칸을 삼각형으로 나누세요.']);
  if (r.status !== 'ok') return tips;
  const ls = levelsOf(S), top = ls[0];
  const topHasBrace = Object.values(S.plan).some(p => p.y === top && p.xa !== p.xb);
  if (top > 0 && nodesAtLevel(S, top).length > 1 && !topHasBrace) tips.push(['bad', `윗면(높이 ${top * 5} cm)은 압축을 받아 옆으로 휘어요. 가로보만 사다리처럼 두면 못 막아요. 위 보기에서 X 브레이싱을 넣으세요.`]);
  if (r.warn) tips.push(['warn', '하중을 받는 절점 중 가로보가 없는 곳이 있어요. 바닥판이 가로보 위에 평평하게 얹혀야 하중이 앞뒤 트러스에 고르게 나뉘어요.']);
  if (S.loadType !== 'point' && r.loads && r.loads.type === 'udl') { const u = r.loads; if (u.x1 - u.x0 < 12) tips.push(['tip', `하중을 ${u.x0 * 5}–${u.x1 * 5} cm 구간에만 올렸어요. 대회처럼 바닥 전체에 고르게 싣는다면 설정의 "다리 전체로"를 누르세요.`]); }
  const g = r.govern;
  if (g.type === 'joint') tips.push(['tip', `가장 약한 곳이 절점이에요. 고무줄 1회는 두 면 합쳐 0.6 g뿐이라, ${capLabel(g).split(' 고무줄')[0]}에 한 번 더 감는 게 무게 대비 가장 싼 보강이에요.`]);
  else { const e = r.elements[g.idx]; if (e.mode === '면외 좌굴') tips.push(['tip', '옆으로 휘어서 깨질 예정이에요. 겹을 늘리기 전에 그 높이에 X 브레이싱을 먼저 넣는 게 가벼워요.']); else if (e.mode.includes('좌굴')) tips.push(['tip', '압축재가 좌굴로 깨질 예정이에요. 길이를 반으로 나누면 버티는 힘이 4배(∝ 1/L²)라 겹을 늘리는 것보다 효과가 클 때가 많아요.']); }
  if (g.type === 'joint' ? r.nodes[g.idx].y === 0 : (r.elements[g.idx].seg.a.y === 0 && r.elements[g.idx].seg.b.y === 0)) tips.push(['tip', '가장 약한 곳이 바닥(높이 0)이에요. 교수님 힌트대로 밑바닥을 튼튼하게: 하현재를 10 mm 각재나 2–3겹 집성재로, 바닥 절점 고무줄을 더 감으세요.']);
  const lazy = r.elements.filter(e => e.kind === 'wood' && e.n >= 2 && isFinite(e.cap) && e.cap > 3 * r.Pface);
  if (lazy.length) tips.push(['tip', `힘을 거의 안 받는 두꺼운 부재가 ${lazy.length}개 있어요 (${lazy.slice(0, 3).map(e => elemLabel(e)).join(', ')}). 겹을 줄이면 무게가 줄어 효율이 올라요.`]);
  const zero = r.elements.filter(e => Math.abs(e.f) < 1e-9);
  if (zero.length) tips.push(['tip', `이 하중에서 힘이 0인 부재가 ${zero.length}개 있어요. 구조 안정에 필요한지 확인하고, 아니면 빼서 무게를 줄일 수 있어요.`]);
  if (ev.limitBy) tips.push(['warn', `처짐 한계에 먼저 걸려요. 높이를 키우면 처짐이 줄고, 고무줄을 더 감으면 절점 미끄러짐이 줄어 덜 처집니다.`]);
  return tips;
}
const GENERAL_TIPS = [
  '교수님 힌트: 밑바닥이 튼튼해야 많이 버텨요. 합판·바구니 하중이 바닥 쪽으로 들어오니 하현재와 바닥 절점을 먼저 보강하세요.',
  '접합부는 고무줄 2개로만, 접착제 금지예요. 접착제는 5 mm 각재를 겹쳐 집성재(부재)를 만들 때만 써요.',
  '10 mm 각재는 단면이 커서 좌굴에 강해요(I = 833 mm⁴로 5 mm 3겹의 5배). 길게 압축받는 상현재·끝 사재에 아껴 쓰세요.',
  '절점에서 부재 중심선이 한 점에서 만나게 맞추세요. 어긋나면 비틀림이 생겨 계산보다 일찍 깨져요.',
  '두 트러스를 같은 실물 크기 도면 위에서 만들어 모양을 똑같이 맞추세요. 계산은 두 면이 같다고 봐요.',
  '각재를 고를 때 옹이, 뒤틀림, 결이 비스듬한 것은 빼세요. 모델은 결함 없는 목재를 가정해요.',
  '철사·철물을 쓰려면 11/19 계획 발표 때 아이디어를 말하고 승인받으세요.',
  '시험용 부재와 고무줄 접합 몇 개를 먼저 부숴 보고, 그 결과로 상수를 보정하세요. 계산값은 설계안끼리 비교할 때 가장 믿을 만해요.'
];

/* ── 패널 ── */
function syncRules() {
  for (const [id, key] of [['r-score', 'score'], ['r-minw', 'minWidth'], ['r-minl', 'minLength'], ['r-weight', 'maxWeight'], ['r-defl', 'deflLimit'], ['r-max10', 'max10'], ['r-max5', 'max5'], ['r-sticks', 'maxSticks'], ['r-stock', 'stock'], ['r-steel', 'maxSteel'], ['r-wraps', 'maxWraps'], ['r-cap', 'cap']]) {
    const el = $(id); if (el && document.activeElement !== el) el.value = RULES[key];
  }
}
function renderComp() {
  if (!R) return;
  const ev = compEval(S, R);
  $('cscore').textContent = scoreTxt(ev);
  $('cscore-lbl').textContent = RULES.score === 'load' ? '점수 기준: 버틴 하중 (순위 = 가장 많이 버틴 조)' : '점수 기준: 하중 ÷ 무게';
  $('cbasis').textContent = !ev.ok ? '구조가 안정해야 점수가 나와요'
    : `인정 하중 ${ev.counted.toFixed(1)} kg${ev.limitBy ? ` (${ev.limitBy})` : ''} · 무게 ${R.weight.toFixed(1)} g`;
  const rows = ev.checks.map(c => `<li class="${c.ok ? 'pass' : c.soft ? 'soft' : 'fail'}"><span>${c.ok ? '✔' : c.soft ? '!' : '✖'} ${c.label}</span><span>${c.val} <small>${c.lim}${!c.ok && c.soft ? ' · 추가 요청' : ''}</small></span></li>`);
  rows.push(`<li class="info"><span>접합부</span><span>고무줄 2개 · 접착제 금지 (규칙)</span></li>`);
  rows.push(`<li class="info"><span>재료</span><span>10 mm 조각 ${ev.mat.pieces10}개 · 5 mm 조각 ${ev.mat.pieces5}개 · 고무줄 ${ev.mat.wraps}회</span></li>`);
  $('cchecks').innerHTML = rows.join('');
  $('cpill').className = 'pill ' + (!ev.ok ? 'idle' : ev.viol ? 'bad' : 'ok');
  $('cpill').textContent = !ev.ok ? '대기' : ev.viol ? `규칙 위반 ${ev.viol}` : '규칙 통과';
  const tips = contextTips(R, ev);
  $('ctips').innerHTML = tips.map(([k, t]) => `<li class="${k}">${t}</li>`).join('') || '<li class="muted">지금 설계에서 눈에 띄는 문제는 없어요.</li>';
  $('suglist').innerHTML = '<li class="muted">설계를 바꿨어요. 다시 계산해 보세요.</li>';
  suggestions = [];
}
function renderSuggestions() {
  const { base, list } = computeSuggestions(S);
  suggestions = list;
  if (!base.ev.ok) { $('suglist').innerHTML = '<li class="muted">안정된 구조에서만 추천할 수 있어요.</li>'; return; }
  if (!list.length) { $('suglist').innerHTML = '<li class="muted">한 칸씩 바꿔서 점수가 오르는 곳이 없어요. 형식(높이·패널 수)을 바꿔 보세요.</li>'; return; }
  $('suglist').innerHTML = list.map((s, i) => {
    const dW = s.o.r.weight - base.r.weight;
    return `<li><div>${s.txt}</div><div class="sg-meta">${scoreTxt(base.ev)} → <b>${scoreTxt(s.o.ev)}</b> · 하중 ${base.ev.counted.toFixed(1)}→${s.o.ev.counted.toFixed(1)} kg · 무게 ${dW >= 0 ? '+' : ''}${dW.toFixed(1)} g${base.ev.viol > s.o.ev.viol ? ' · 규칙 위반 해소' : ''}</div><button class="btn sm" type="button" data-sg="${i}">적용</button></li>`;
  }).join('');
}
$('suglist').addEventListener('click', e => {
  const b = e.target.closest('button[data-sg]'); if (!b || mode !== 'build') return;
  const s = suggestions[+b.dataset.sg]; if (!s) return;
  snapshot(); S = JSON.parse(JSON.stringify(s.m)); markEdited(); changed(false); toast(`적용: ${s.txt}`); renderSuggestions();
});
$('sugbtn').onclick = () => { if (mode === 'build') renderSuggestions(); };
$('tunebtn').onclick = () => { if (mode === 'build') autoTune(); };
for (const [id, key] of [['r-score', 'score'], ['r-minw', 'minWidth'], ['r-minl', 'minLength'], ['r-weight', 'maxWeight'], ['r-defl', 'deflLimit'], ['r-max10', 'max10'], ['r-max5', 'max5'], ['r-sticks', 'maxSticks'], ['r-stock', 'stock'], ['r-steel', 'maxSteel'], ['r-wraps', 'maxWraps'], ['r-cap', 'cap']]) {
  $(id).addEventListener('change', e => {
    const v = e.target.value;
    RULES[key] = key === 'score' ? v : key === 'stock' ? Math.max(10, +v || 60) : (v === '' ? '' : Math.max(0, +v));
    storeRules(); syncRules(); renderComp();
  });
}
$('gtips').innerHTML = GENERAL_TIPS.map(t => `<li>${t}</li>`).join('');
syncRules();
