
/* ───────────────── 저장 · 설계서 ───────────────── */
const DESIGNS_KEY = 'tb-lab-3d-designs';
let designs = [];
try { designs = JSON.parse(localStorage.getItem(DESIGNS_KEY)) || []; } catch (e) { designs = []; }
function storeDesigns() { try { localStorage.setItem(DESIGNS_KEY, JSON.stringify(designs)); return true; } catch (e) { return false; } }
const docOpt = RULES; // 각재 길이·여유는 대회 규칙과 같이 쓴다
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const f1 = v => (Math.round(v * 10) / 10).toFixed(1);
function letters(i) { let s = ''; i++; while (i > 0) { const r = (i - 1) % 26; s = String.fromCharCode(65 + r) + s; i = Math.floor((i - 1) / 26); } return s; }

function designData() {
  const r = analyze(S);
  const nodes = [...structNodes(S).values()].sort((a, b) => a.x - b.x || a.y - b.y);
  const name = new Map(nodes.map((n, i) => [nk(n.x, n.y), letters(i)]));
  const top = nodes.length ? Math.max(...nodes.map(n => n.y)) : 0;
  const role = s => s.a.y === s.b.y ? (s.a.y === 0 ? '하현재' : s.a.y === top ? '상현재' : '수평재') : s.a.x === s.b.x ? '수직재' : '사재';
  const ord = { '하현재': 0, '상현재': 1, '수평재': 2, '수직재': 3, '사재': 4 };
  const segs = Object.values(S.segs).map(s => ({ s, role: role(s), L: Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y) * CM }))
    .sort((u, v) => ord[u.role] - ord[v.role] || Math.min(u.s.a.x, u.s.b.x) - Math.min(v.s.a.x, v.s.b.x) || Math.min(u.s.a.y, u.s.b.y) - Math.min(v.s.a.y, v.s.b.y));
  segs.forEach((m, i) => {
    m.id = 'M' + (i + 1);
    [m.na, m.nb] = [name.get(nk(m.s.a.x, m.s.a.y)), name.get(nk(m.s.b.x, m.s.b.y))].sort();
    m.els = r.status === 'ok' ? r.elements.filter(e => e.key === segKey(m.s.a, m.s.b)) : [];
  });
  const plans = Object.values(S.plan).sort((u, v) => v.y - u.y || Math.min(u.xa, u.xb) - Math.min(v.xa, v.xb) || u.xa - v.xa)
    .map((p, i) => ({ p, id: 'P' + (i + 1), L: Math.hypot((p.xb - p.xa) * CM, Wcm()), kind: p.xa === p.xb ? '가로보' : 'X 브레이싱', na: name.get(nk(p.xa, p.y)), nb: name.get(nk(p.xb, p.y)) }));
  return { r, nodes, name, segs, plans, top };
}
function cutList(d) {
  const wood = [], steel = [];
  for (const m of d.segs) for (let face = 0; face < 2; face++) {
    for (let k = 0; k < m.s.wood; k++) wood.push({ L: m.L, id: m.id });
    if (m.s.steel) steel.push({ L: m.L, id: m.id });
  }
  for (const q of d.plans) { for (let k = 0; k < q.p.wood; k++) wood.push({ L: q.L, id: q.id }); if (q.p.steel) steel.push({ L: q.L, id: q.id }); }
  return { wood, steel };
}
function groupCuts(list) {
  const g = new Map();
  for (const p of list) {
    const len = f1(p.L + 2 * docOpt.margin);
    const e = g.get(len) || { len: +len, count: 0, ids: new Set() };
    e.count++; e.ids.add(p.id); g.set(len, e);
  }
  return [...g.values()].sort((a, b) => b.len - a.len);
}
// 각재 몇 개가 필요한지: 긴 것부터 남은 길이에 채워 넣기 (톱날 두께 0.2 cm)
function packStock(list) {
  const lens = list.map(p => p.L + 2 * docOpt.margin).sort((a, b) => b - a), bins = [];
  let tooLong = 0;
  for (const L of lens) {
    if (L > docOpt.stock) { tooLong++; continue; }
    const b = bins.find(r => r >= L + 0.2);
    if (b != null) bins[bins.indexOf(b)] = b - L - 0.2; else bins.push(docOpt.stock - L - 0.2);
  }
  return { count: bins.length, tooLong };
}

/* ── 도면 그리기 (흰 종이, 실제 비율) ── */
function paperCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); return [c, g]; }
function dimLine(g, a, b, off, text, vertical) {
  g.strokeStyle = '#3a5a8c'; g.fillStyle = '#3a5a8c'; g.lineWidth = 1;
  g.beginPath();
  if (vertical) { g.moveTo(a[0] + off, a[1]); g.lineTo(b[0] + off, b[1]); g.moveTo(a[0] + off - 5, a[1]); g.lineTo(a[0] + off + 5, a[1]); g.moveTo(b[0] + off - 5, b[1]); g.lineTo(b[0] + off + 5, b[1]); }
  else { g.moveTo(a[0], a[1] + off); g.lineTo(b[0], b[1] + off); g.moveTo(a[0], a[1] + off - 5); g.lineTo(a[0], a[1] + off + 5); g.moveTo(b[0], b[1] + off - 5); g.lineTo(b[0], b[1] + off + 5); }
  g.stroke();
  g.font = '13px "Apple SD Gothic Neo","Noto Sans KR",sans-serif'; g.textAlign = 'center';
  if (vertical) { g.save(); g.translate(a[0] + off - 8, (a[1] + b[1]) / 2); g.rotate(-Math.PI / 2); g.fillText(text, 0, 0); g.restore(); }
  else g.fillText(text, (a[0] + b[0]) / 2, a[1] + off - 6);
}
function tag(g, x, y, text, bg) {
  g.font = 'bold 12px "Apple SD Gothic Neo","Noto Sans KR",sans-serif';
  const w = g.measureText(text).width + 8;
  g.fillStyle = bg || '#fff'; g.strokeStyle = '#555'; g.lineWidth = 1;
  g.fillRect(x - w / 2, y - 9, w, 17); g.strokeRect(x - w / 2, y - 9, w, 17);
  g.fillStyle = '#222'; g.textAlign = 'center'; g.fillText(text, x, y + 4);
}
function memberLine(g, A, B, wood, steel) {
  const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  if (wood) { g.strokeStyle = '#9a6a33'; g.lineWidth = 3 + 2.5 * (wood - 1); g.lineCap = 'butt'; g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]); g.stroke(); }
  if (steel) { const o = wood ? 3 + 1.3 * wood : 0; g.strokeStyle = '#46525e'; g.lineWidth = 2; g.setLineDash([7, 4]); g.beginPath(); g.moveTo(A[0] + nx * o, A[1] + ny * o); g.lineTo(B[0] + nx * o, B[1] + ny * o); g.stroke(); g.setLineDash([]); }
}
function drawElevation(d) {
  const xs = d.nodes.map(n => n.x * CM), ys = d.nodes.map(n => n.y * CM);
  const x0 = Math.min(0, ...xs), x1 = Math.max(60, ...xs), y0 = Math.min(0, ...ys), y1 = Math.max(5, ...ys);
  const Wd = 1100, padX = 70, padT = 60, padB = 110, sc = (Wd - 2 * padX) / (x1 - x0), Hd = Math.round((y1 - y0) * sc + padT + padB);
  const [c, g] = paperCanvas(Wd, Hd), P = (x, y) => [padX + (x - x0) * sc, padT + (y1 - y) * sc];
  g.strokeStyle = '#e4ecf7'; g.lineWidth = 1;
  for (let x = Math.ceil(x0 / CM) * CM; x <= x1; x += CM) { const [a] = P(x, 0); g.beginPath(); g.moveTo(a, padT - 10); g.lineTo(a, Hd - padB + 10); g.stroke(); }
  for (let y = Math.ceil(y0 / CM) * CM; y <= y1; y += CM) { const [, b] = P(0, y); g.beginPath(); g.moveTo(padX - 10, b); g.lineTo(Wd - padX + 10, b); g.stroke(); }
  for (const m of d.segs) memberLine(g, P(m.s.a.x * CM, m.s.a.y * CM), P(m.s.b.x * CM, m.s.b.y * CM), m.s.wood, m.s.steel);
  // 지점
  for (const [x, roller] of [[0, false], [60, true]]) {
    const [X, Y] = P(x, 0); g.fillStyle = '#ddd'; g.strokeStyle = '#333'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(X, Y + 6); g.lineTo(X - 12, Y + 26); g.lineTo(X + 12, Y + 26); g.closePath(); g.fill(); g.stroke();
    if (roller) for (const o of [-7, 0, 7]) { g.beginPath(); g.arc(X + o, Y + 30, 3, 0, 7); g.stroke(); }
    g.fillStyle = '#333'; g.font = '12px sans-serif'; g.textAlign = 'center'; g.fillText(roller ? '롤러' : '핀', X, Y + 48);
  }
  for (const m of d.segs) { const A = P(m.s.a.x * CM, m.s.a.y * CM), B = P(m.s.b.x * CM, m.s.b.y * CM); tag(g, (A[0] + B[0]) / 2, (A[1] + B[1]) / 2, m.id, m.s.steel && !m.s.wood ? '#e6edf3' : '#fff7e8'); }
  for (const n of d.nodes) {
    const [X, Y] = P(n.x * CM, n.y * CM), k = nk(n.x, n.y);
    g.fillStyle = '#f5c518'; g.strokeStyle = '#000'; g.lineWidth = 1.5; g.beginPath(); g.arc(X, Y, 6, 0, 7); g.fill(); g.stroke();
    g.fillStyle = '#b00020'; g.font = 'bold 15px sans-serif'; g.textAlign = 'right'; g.fillText(d.name.get(k), X - 8, Y - 8);
    g.fillStyle = '#7a5c00'; g.font = '11px sans-serif'; g.textAlign = 'left'; g.fillText('×' + getWraps(S, k), X + 7, Y - 7);
  }
  if (S.load && d.name.has(S.load)) {
    const [lx, ly] = Pk(S.load), [X, Y] = P(lx * CM, ly * CM);
    g.strokeStyle = '#c62828'; g.fillStyle = '#c62828'; g.lineWidth = 3; g.beginPath(); g.moveTo(X, Y + 12); g.lineTo(X, Y + 52); g.stroke();
    g.beginPath(); g.moveTo(X, Y + 10); g.lineTo(X - 7, Y + 22); g.lineTo(X + 7, Y + 22); g.closePath(); g.fill();
    g.font = 'bold 14px sans-serif'; g.textAlign = 'left'; g.fillText('하중 P', X + 8, Y + 50);
  }
  // 치수: 절점 x 위치 사슬 + 경간 + 높이
  const xsU = [...new Set(d.nodes.map(n => n.x * CM))].sort((a, b) => a - b);
  const base = P(0, y0)[1];
  for (let i = 0; i < xsU.length - 1; i++) dimLine(g, [P(xsU[i], 0)[0], base], [P(xsU[i + 1], 0)[0], base], 62, (xsU[i + 1] - xsU[i]) + '');
  dimLine(g, [P(0, 0)[0], base], [P(60, 0)[0], base], 92, '경간 60 cm');
  if (y1 > 0) dimLine(g, P(x0, 0), P(x0, y1), -40, '높이 ' + y1 + ' cm', true);
  g.fillStyle = '#222'; g.font = 'bold 15px sans-serif'; g.textAlign = 'left';
  g.fillText('측면도 · 같은 트러스 2개 (단위 cm, 격자 5 cm)', padX - 50, 26);
  g.font = '12px sans-serif'; g.fillStyle = '#555';
  g.fillText('굵은 갈색 = 목재(굵을수록 겹 수 많음) · 회색 점선 = 철근 · ×숫자 = 고무줄 감기 수', padX - 50, 44);
  return c.toDataURL('image/png');
}
function drawPlanLevel(d, y) {
  const W = Wcm(), xs = nodesAtLevel(S, y).map(x => x * CM);
  const x0 = Math.min(0, ...xs), x1 = Math.max(60, ...xs);
  const Wd = 1100, padX = 70, padT = 60, padB = 60, sc = (Wd - 2 * padX) / (x1 - x0), Hd = Math.round(W * sc + padT + padB);
  const [c, g] = paperCanvas(Wd, Hd), P = (x, z) => [padX + (x - x0) * sc, padT + (W - z) * sc];
  for (const s of Object.values(S.segs)) if (s.a.y === y && s.b.y === y) for (const z of [0, W]) memberLine(g, P(s.a.x * CM, z), P(s.b.x * CM, z), s.wood, s.steel);
  const list = d.plans.filter(q => q.p.y === y);
  for (const q of list) memberLine(g, P(q.p.xa * CM, 0), P(q.p.xb * CM, W), q.p.wood, q.p.steel);
  for (const q of list) { const A = P(q.p.xa * CM, 0), B = P(q.p.xb * CM, W), t = q.p.xa === q.p.xb ? 0.5 : 0.3; tag(g, A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, q.id, '#eef7ea'); }
  for (const x of xs) for (const z of [0, W]) {
    const [X, Y] = P(x, z); g.fillStyle = '#f5c518'; g.strokeStyle = '#000'; g.lineWidth = 1.5; g.beginPath(); g.arc(X, Y, 5, 0, 7); g.fill(); g.stroke();
    g.fillStyle = '#b00020'; g.font = 'bold 13px sans-serif'; g.textAlign = 'center'; g.fillText(d.name.get(nk(x / CM, y)) + (z ? '′' : ''), X, z ? Y - 10 : Y + 20);
  }
  dimLine(g, P(x1, 0), P(x1, W), 40, '폭 ' + W + ' cm', true);
  g.fillStyle = '#222'; g.font = 'bold 15px sans-serif'; g.textAlign = 'left';
  g.fillText(`평면도 · 높이 ${y * CM} cm (아래 = 앞면 트러스, 위 = 뒷면 트러스 ′)`, padX - 50, 26);
  return c.toDataURL('image/png');
}
function snap3D() {
  if (!T) return null;
  try {
    const w = 1000, h = 560, W = Wcm();
    T.renderer.setSize(w, h, false); T.camera.aspect = w / h; T.camera.updateProjectionMatrix();
    const th = 0.62, ph = 1.08, rad = 105, tgt = [30, 6, W / 2];
    T.camera.position.set(tgt[0] + rad * Math.sin(ph) * Math.sin(th), tgt[1] + rad * Math.cos(ph), tgt[2] - rad * Math.sin(ph) * Math.cos(th));
    T.camera.lookAt(...tgt);
    T.renderer.render(T.scene, T.camera);
    const url = T.renderer.domElement.toDataURL('image/png');
    resize3D();
    return url;
  } catch (e) { resize3D(); return null; }
}

/* ── 만드는 순서 ── */
function buildSteps(d, cuts, pack) {
  const ids = role => d.segs.filter(m => m.role === role).map(m => m.id);
  const join = a => a.length > 6 ? a.slice(0, 6).join(', ') + ` 외 ${a.length - 6}개` : a.join(', ');
  const steps = [];
  steps.push(['재료 자르기', `아래 절단 목록대로 목재 ${cuts.wood.length}개${cuts.steel.length ? `, 철근 ${cuts.steel.length}개` : ''}를 자릅니다. 길이는 절점 중심 사이 거리에 양 끝 묶을 여유 ${docOpt.margin} cm씩을 더한 값입니다. 같은 길이끼리 모아 이름표를 붙여 두면 헷갈리지 않아요.`]);
  steps.push(['실물 크기 도면 깔기', `측면도를 실제 크기(경간 60 cm)로 큰 종이에 옮겨 그리고 절점 ${d.nodes.map(n => d.name.get(nk(n.x, n.y))).slice(0, 8).join(', ')}${d.nodes.length > 8 ? ' …' : ''}을 표시합니다. 이 도면 위에서 두 트러스를 똑같이 만듭니다.`]);
  const multi = d.segs.filter(m => m.s.wood > 1).concat(d.plans.filter(q => q.p.wood > 1));
  if (multi.length) steps.push(['겹 부재 만들기', `${join(multi.map(m => m.id + `(${(m.s || m.p).wood}겹)`))}는 각재를 겹 수만큼 나란히 붙여 한 다발로 만든 뒤 쓰세요.`]);
  const order = [['하현재', ids('하현재')], ['상현재', ids('상현재')], ['수평재', ids('수평재')], ['수직재', ids('수직재')], ['사재', ids('사재')]].filter(([, a]) => a.length);
  steps.push(['측면 트러스 2개 조립', order.map(([r, a]) => `${r} ${join(a)}`).join(' → ') + ' 순서로 도면 위에 놓습니다. 같은 방법으로 한 번 더 만들어 똑같은 트러스 2개를 준비합니다.']);
  const st = d.segs.filter(m => m.s.steel);
  if (st.length) steps.push(['철근 붙이기', `${join(st.map(m => m.id))}${st.some(m => m.s.wood) ? '는 같은 구간의 목재 옆에 철근을 나란히 대고' : '는 철근만 쓰는 부재로,'} 양 끝 절점에서 목재와 함께 묶습니다.`]);
  const wr = d.nodes.map(n => `${d.name.get(nk(n.x, n.y))} ${getWraps(S, nk(n.x, n.y))}회`);
  const tot = d.nodes.reduce((s, n) => s + getWraps(S, nk(n.x, n.y)), 0);
  steps.push(['절점 고무줄 감기', `절점마다 정해진 횟수만큼 고무줄을 감아 단단히 묶습니다: ${wr.join(', ')}. 한 면 ${tot}회, 두 면 합계 ${tot * 2}회. 감기 수가 절점 강도를 정하니 정확히 지켜 주세요.`]);
  const lv = [...new Set(d.plans.map(q => q.p.y))].sort((a, b) => b - a);
  if (lv.length) {
    steps.push(['두 트러스 세우고 가로보 연결', `두 트러스를 ${Wcm()} cm 간격으로 나란히 세웁니다. ` + lv.map(y => { const a = d.plans.filter(q => q.p.y === y && q.kind === '가로보').map(q => q.id); return a.length ? `높이 ${y * CM} cm 가로보 ${join(a)}` : ''; }).filter(Boolean).join(', ') + '를 앞뒤 절점에 묶습니다(가로재 끝도 같은 고무줄로 함께 묶어요).']);
    const br = lv.map(y => { const a = d.plans.filter(q => q.p.y === y && q.kind !== '가로보').map(q => q.id); return a.length ? `높이 ${y * CM} cm ${join(a)}` : ''; }).filter(Boolean);
    if (br.length) steps.push(['X 브레이싱', br.join(', ') + '를 대각선으로 놓아 칸마다 삼각형을 만듭니다. 위에서 봤을 때 다리가 평행사변형으로 찌그러지지 않으면 됩니다.']);
  } else steps.push(['두 트러스 세우기', `두 트러스를 ${Wcm()} cm 간격으로 세웁니다. 이 설계에는 가로재가 없어 옆으로 쓰러지기 쉬워요. 위 보기에서 가로보와 X 브레이싱을 넣는 걸 권해요.`]);
  if (S.load && d.name.has(S.load)) { const [lx, ly] = Pk(S.load); steps.push(['받침과 하중', `왼쪽 끝 ${d.name.get(nk(0, 0)) || ''}과 오른쪽 끝 ${d.name.get(nk(12, 0)) || ''}을 60 cm 간격의 받침 위에 올립니다. 추는 절점 ${d.name.get(S.load)} (가로 ${lx * CM} cm, 높이 ${ly * CM} cm)의 가로보 가운데에 겁니다.`]); }
  if (d.r.status === 'ok') steps.push(['시험 전 점검', `두 트러스가 같은 모양인지, 절점이 벌어지지 않았는지 확인합니다. 시뮬레이터가 꼽은 약한 곳: ${d.r.ranked.slice(0, 3).map(c => capLabel(c)).join(' / ')}. 예상 최대 하중 ${d.r.kg.toFixed(1)} kg.`]);
  if (pack.tooLong) steps.push(['주의: 긴 부재', `${pack.tooLong}개 부재가 각재 한 개(${docOpt.stock} cm)보다 깁니다. 두 개를 겹쳐 이어 붙이거나 중간에 절점을 넣어 나누세요.`]);
  return steps;
}

/* ── 설계서 화면 ── */
let lastDoc = null;
function renderDoc() {
  R = analyze(S);
  const d = designData(), cuts = cutList(d), pack = packStock(cuts.wood), r = d.r, ok = r.status === 'ok';
  const gw = groupCuts(cuts.wood), gs = groupCuts(cuts.steel);
  const totW = cuts.wood.reduce((s, p) => s + p.L + 2 * docOpt.margin, 0), totS = cuts.steel.reduce((s, p) => s + p.L + 2 * docOpt.margin, 0);
  const wraps = d.nodes.reduce((s, n) => s + getWraps(S, nk(n.x, n.y)), 0);
  const steps = buildSteps(d, cuts, pack);
  const imgs = { side: d.segs.length ? drawElevation(d) : null, plans: [...new Set(d.plans.map(q => q.p.y))].sort((a, b) => b - a).map(y => ({ y, url: drawPlanLevel(d, y) })), three: d.segs.length ? snap3D() : null };
  const forceTxt = m => !m.els.length ? '—' : m.els.map(e => Math.abs(e.f) < 1e-9 ? '0' : `${e.f > 0 ? '인장' : '압축'} ${Math.abs(e.f * r.Pface).toFixed(0)} N`).join(' / ');
  const date = new Date().toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' });
  const cutRows = (g, mat) => g.map(e => `<tr><td>${mat}</td><td>${f1(e.len)} cm</td><td>${e.count}개</td><td class="ids">${[...e.ids].join(', ')}</td></tr>`).join('');
  $('paper').innerHTML = `
  <header class="ph"><div><div class="eyebrow">Timber Bridge 설계서</div><h2 id="doctitle">${esc(S.name)}</h2><div class="meta">${date} · 경간 60 cm · 폭 ${Wcm()} cm · 높이 ${d.top * CM} cm</div></div>
    <div class="kpis"><div><b>${ok ? r.kg.toFixed(1) : '—'}</b><span>예상 최대 하중 kg</span></div><div><b>${r.weight.toFixed(1)}</b><span>무게 g</span></div><div><b>${ok ? (r.kg / r.weight).toFixed(3) : '—'}</b><span>효율 kg/g</span></div></div></header>
  ${ok ? `<p class="lead">먼저 깨질 곳: ${capLabel(r.govern)}</p>` : `<p class="lead bad">${esc(r.msg)}</p>`}
  <h3>1. 준비물</h3>
  <div class="opts"><label>각재 한 개 길이 <input id="optstock" type="number" min="10" max="200" step="1" value="${docOpt.stock}"> cm</label>
    <label>양 끝 묶을 여유 <input id="optmargin" type="number" min="0" max="3" step="0.1" value="${docOpt.margin}"> cm</label><span class="note">받은 재료 길이로 바꾸면 개수가 다시 계산돼요</span></div>
  <ul class="bom">
    <li><b>목재 각재 5×5 mm</b> · 조각 ${cuts.wood.length}개, 총 ${f1(totW)} cm → <b>${pack.count}개</b> 필요${pack.tooLong ? ` <span class="bad">(+ ${docOpt.stock} cm보다 긴 조각 ${pack.tooLong}개)</span>` : ''}</li>
    ${cuts.steel.length ? `<li><b>철근 Ø3 mm</b> · 조각 ${cuts.steel.length}개, 총 ${f1(totS)} cm (${(r.steelLen * MAT.steel.A * MAT.steel.rho).toFixed(1)} g)</li>` : ''}
    <li><b>고무줄</b> · 절점 ${d.nodes.length}곳 × 2면, 감기 총 ${wraps * 2}회 (한 면 ${wraps}회)</li>
    <li><b>도구</b> · 자, 연필, 커터 또는 실톱${cuts.steel.length ? ', 철근 절단용 니퍼(펜치)' : ''}, 실물 크기 도면용 큰 종이</li>
  </ul>
  <div class="tw"><table><thead><tr><th>재료</th><th>자를 길이</th><th>개수</th><th>쓰는 부재</th></tr></thead><tbody>${cutRows(gw, '목재') + cutRows(gs, '철근')}</tbody></table></div>
  <h3>2. 도면</h3>
  <p class="note">그림을 길게 누르거나 우클릭하면 이미지로 저장할 수 있어요.</p>
  ${imgs.side ? `<figure><img src="${imgs.side}" alt="측면도"></figure>` : '<p class="note">측면 트러스가 아직 없어요.</p>'}
  ${imgs.plans.map(p => `<figure><img src="${p.url}" alt="높이 ${p.y * CM} cm 평면도"></figure>`).join('')}
  ${imgs.three ? `<figure><img src="${imgs.three}" alt="3D 모습"><figcaption>3D 모습</figcaption></figure>` : ''}
  <h3>3. 부재표</h3>
  <div class="tw"><table><thead><tr><th>번호</th><th>절점</th><th>역할</th><th>재료</th><th>길이</th><th>수량</th><th>파괴 하중일 때 힘</th></tr></thead><tbody>
    ${d.segs.map(m => `<tr><td>${m.id}</td><td>${m.na}–${m.nb}</td><td>${m.role}</td><td>${[m.s.wood ? `목재 ${m.s.wood}겹` : '', m.s.steel ? '철근' : ''].filter(Boolean).join(' + ')}</td><td>${f1(m.L)} cm</td><td>2 (앞·뒤)</td><td>${forceTxt(m)}</td></tr>`).join('')}
    ${d.plans.map(q => `<tr><td>${q.id}</td><td>${q.na}–${q.nb}′</td><td>${q.kind} (높이 ${q.p.y * CM})</td><td>${[q.p.wood ? `목재 ${q.p.wood}겹` : '', q.p.steel ? '철근' : ''].filter(Boolean).join(' + ')}</td><td>${f1(q.L)} cm</td><td>1</td><td>0 (횡지지)</td></tr>`).join('')}
  </tbody></table></div>
  <h3>4. 절점표</h3>
  <div class="tw"><table><thead><tr><th>절점</th><th>위치 (가로, 높이)</th><th>고무줄</th><th>횡지지</th></tr></thead><tbody>
    ${d.nodes.map(n => { const k = nk(n.x, n.y); return `<tr><td>${d.name.get(k)}</td><td>${n.x * CM}, ${n.y * CM} cm</td><td>${getWraps(S, k)}회</td><td>${r.braced.has(k) ? '예' : '아니오'}</td></tr>`; }).join('')}
  </tbody></table></div>
  <h3>5. 만드는 순서</h3>
  <ol class="steps">${steps.map(([t, b]) => `<li><b>${t}</b><p>${esc(b)}</p></li>`).join('')}</ol>
  <p class="note foot">계산 값은 수업 식(절점법·σ = F/A·Euler 좌굴)과 추정 재료 상수로 낸 예상치예요. 실제 시험 결과로 상수를 보정하세요.</p>`;
  $('optstock').onchange = e => { docOpt.stock = Math.max(10, +e.target.value || 60); storeRules(); syncRules(); renderDoc(); };
  $('optmargin').onchange = e => { docOpt.margin = Math.max(0, +e.target.value || 0); storeRules(); syncRules(); renderDoc(); };
  lastDoc = { d, cuts, gw, gs, pack, steps, wraps, totW, totS };
}
function docText() {
  if (!lastDoc) return '';
  const { d, gw, gs, pack, steps, wraps, cuts } = lastDoc, r = d.r, ok = r.status === 'ok';
  const L = [];
  L.push(`# ${S.name} · Timber Bridge 설계서`, `경간 60 cm · 폭 ${Wcm()} cm · 높이 ${d.top * CM} cm`);
  L.push(`예상 최대 하중 ${ok ? r.kg.toFixed(1) + ' kg' : '—'} · 무게 ${r.weight.toFixed(1)} g · 효율 ${ok ? (r.kg / r.weight).toFixed(3) : '—'} kg/g`);
  if (ok) L.push(`먼저 깨질 곳: ${capLabel(r.govern)}`);
  L.push('', '## 1. 준비물', `- 목재 각재 5×5 mm: 조각 ${cuts.wood.length}개 → 각재(${docOpt.stock} cm) ${pack.count}개`);
  if (cuts.steel.length) L.push(`- 철근 Ø3 mm: 조각 ${cuts.steel.length}개`);
  L.push(`- 고무줄: 감기 총 ${wraps * 2}회 (절점 ${d.nodes.length}곳 × 2면)`, '', '절단 목록 (양 끝 여유 ' + docOpt.margin + ' cm 포함)');
  for (const e of gw) L.push(`- 목재 ${f1(e.len)} cm × ${e.count}개 (${[...e.ids].join(', ')})`);
  for (const e of gs) L.push(`- 철근 ${f1(e.len)} cm × ${e.count}개 (${[...e.ids].join(', ')})`);
  L.push('', '## 2. 부재표');
  for (const m of d.segs) L.push(`- ${m.id} ${m.na}–${m.nb} ${m.role} · ${[m.s.wood ? `목재 ${m.s.wood}겹` : '', m.s.steel ? '철근' : ''].filter(Boolean).join(' + ')} · ${f1(m.L)} cm × 2`);
  for (const q of d.plans) L.push(`- ${q.id} ${q.na}–${q.nb}′ ${q.kind}(높이 ${q.p.y * CM} cm) · ${f1(q.L)} cm`);
  L.push('', '## 3. 절점 (가로, 높이 cm · 고무줄)');
  for (const n of d.nodes) { const k = nk(n.x, n.y); L.push(`- ${d.name.get(k)} (${n.x * CM}, ${n.y * CM}) · ${getWraps(S, k)}회`); }
  L.push('', '## 4. 만드는 순서');
  steps.forEach(([t, b], i) => L.push(`${i + 1}. ${t}: ${b}`));
  return L.join('\n');
}
function saveCurrent(name) {
  R = analyze(S);
  S.name = (name || S.name || '내 설계').trim().slice(0, 40) || '내 설계';
  const rec = { name: S.name, date: new Date().toISOString(), kg: R.status === 'ok' ? +R.kg.toFixed(1) : null, g: +R.weight.toFixed(1), S: JSON.parse(JSON.stringify(S)) };
  const i = designs.findIndex(x => x.name === rec.name);
  if (i >= 0) designs.splice(i, 1);
  designs.unshift(rec); designs = designs.slice(0, 30);
  const ok = storeDesigns(); save(); renderSaved(); updatePanel();
  return ok;
}
function openDoc() {
  if (mode !== 'build') return;
  const ok = saveCurrent(S.name);
  $('docname').value = S.name;
  renderDoc();
  $('doc').hidden = false; document.body.style.overflow = 'hidden';
  $('docmsg').textContent = ok ? `"${S.name}" 저장됨 · 이 브라우저에 보관돼요` : '이 브라우저에서는 저장할 수 없어요 (사생활 보호 모드?). 설계서는 볼 수 있어요.';
  $('docclose').focus();
}
function closeDoc() { $('doc').hidden = true; document.body.style.overflow = ''; }
function renderSaved() {
  const box = $('saved');
  if (!designs.length) { box.innerHTML = '<li class="muted">설계 저장을 누르면 여기 쌓여요</li>'; return; }
  box.innerHTML = designs.map((x, i) => `<li><div class="sv-name">${esc(x.name)}</div><div class="sv-meta">${x.kg != null ? x.kg + ' kg · ' : ''}${x.g} g · ${new Date(x.date).toLocaleDateString('ko-KR')}</div>
    <div class="sv-btns"><button class="btn sm" type="button" data-act="load" data-i="${i}">불러오기</button><button class="btn sm" type="button" data-act="doc" data-i="${i}">설계서</button><button class="btn sm" type="button" data-act="del" data-i="${i}">삭제</button></div></li>`).join('');
}
$('saved').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || mode !== 'build') return;
  const i = +b.dataset.i, rec = designs[i]; if (!rec) return;
  if (b.dataset.act === 'del') {
    if (b.dataset.armed) { designs.splice(i, 1); storeDesigns(); renderSaved(); toast(`"${rec.name}"을 지웠어요.`); }
    else { b.dataset.armed = '1'; b.textContent = '정말 삭제'; b.classList.add('danger'); setTimeout(() => { if (b.isConnected) { delete b.dataset.armed; b.textContent = '삭제'; b.classList.remove('danger'); } }, 3000); }
    return;
  }
  snapshot(); S = Object.assign(blankModel(), JSON.parse(JSON.stringify(rec.S))); syncControls(); changed(false);
  if (b.dataset.act === 'doc') openDoc(); else toast(`"${rec.name}"을 불러왔어요.`);
});
$('savebtn').onclick = openDoc;
$('docclose').onclick = closeDoc;
$('doc').addEventListener('click', e => { if (e.target.id === 'doc') closeDoc(); });
$('docsave').onclick = () => { const ok = saveCurrent($('docname').value); renderDoc(); $('docmsg').textContent = ok ? `"${S.name}" 저장됨` : '저장할 수 없어요.'; };
$('doccopy').onclick = () => {
  const txt = docText();
  const done = () => { $('docmsg').textContent = '설계서를 글로 복사했어요. 문서나 메모에 붙여 넣으세요.'; };
  const fallback = () => { const ta = $('doctext'); ta.hidden = false; ta.value = txt; ta.focus(); ta.select(); $('docmsg').textContent = '자동 복사가 막혀 있어요. 아래 글을 선택된 상태에서 복사(Ctrl/⌘+C)하세요.'; };
  try { navigator.clipboard.writeText(txt).then(done, fallback); } catch (e) { fallback(); }
};
renderSaved();
