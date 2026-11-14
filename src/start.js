/* ───────────────── 시작 ───────────────── */
const has3D = init3D();
if (!has3D) { document.querySelector('[data-view="3d"]').disabled = true; }
if (!load()) S = PRESETS.warrenStrong();
syncControls(); buildHotbar(); renderHistory();
R = analyze(S); level = levelsOf(S)[0] ?? 0;
updatePanel(); setView('side'); resize(); rebuild3D(); setTool(tool);
requestAnimationFrame(loop);
document.fonts && document.fonts.ready.then(() => { dirty = true; if (T) { T.meshes.forEach(o => { if (o.label) o.txt = null; }); update3D(0, null, false); } });
