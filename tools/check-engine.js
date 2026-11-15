// 역학 엔진 회귀 확인: node tools/check-engine.js
// PRD 성공 기준(높은 Pratt > 낮은 Pratt, 브레이싱 있음 > 없음, 사각형 칸 = 불안정)과 고강도 프리셋을 분포하중(바닥 전체)에서 확인한다.
const fs = require('fs'), path = require('path');
const src = f => fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8');
const ui = src('ui.js');
const presets = ui.slice(ui.indexOf('const CM = 5;'), ui.indexOf('/* ───────────────── 상태'));
const api = new Function(src('engine.js') + presets + '\nreturn { analyze, PRESETS, segKey, build, prattList };')();
const { analyze, PRESETS, segKey, build, prattList } = api;
let fail = 0;
const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) fail++; };
const pratt = analyze(PRESETS.pratt()), low = analyze(build('낮은 Pratt', prattList(1, false)));
ok(pratt.status === 'ok' && low.status === 'ok' && pratt.kg > low.kg, `Pratt ${pratt.kg.toFixed(1)} kg > 낮은 Pratt ${low.kg.toFixed(1)} kg`);
const nb = PRESETS.pratt(); nb.bracingOn = false; const nbR = analyze(nb);
ok(pratt.kg > nbR.kg, `브레이싱 있음 ${pratt.kg.toFixed(1)} kg > 없음 ${nbR.kg.toFixed(1)} kg`);
const sq = PRESETS.pratt(); delete sq.segs[segKey({ x: 4, y: 3 }, { x: 6, y: 0 })];
ok(analyze(sq).status === 'unstable', '대각재 하나 뺀 사각형 칸 → 불안정');
for (const k of ['pratt12Strong', 'prattLowStrong', 'warrenStrong', 'prattStrong']) { const r = analyze(PRESETS[k]()); ok(r.status === 'ok' && r.kg > 180, `${k} ${r.kg.toFixed(1)} kg > 180 kg (분포하중)`); }
for (const k of Object.keys(PRESETS)) { const r = analyze(PRESETS[k]()); console.log(`  ${k}: ${r.status === 'ok' ? r.kg.toFixed(1) + ' kg, ' + r.weight.toFixed(1) + ' g' : r.status}`); }
process.exit(fail ? 1 : 0);
