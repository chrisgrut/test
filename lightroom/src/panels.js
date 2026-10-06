/* ============================================================
   Bedienfelder: Regler, Bearbeiten, Kurve, Farbmischer, Color-Grading,
   Profile, Presets, Versionen, Info, Stichwörter
   ============================================================ */
let SLIDERS = [], SYNC = [];
function fmtV(v, dec, sgn) { if (!sgn) return de(v, dec); if (Math.abs(v) < 1e-9) return de(0, dec); return (v > 0 ? '+ ' : '− ') + de(Math.abs(v), dec); }
function slider(label, min, max, o = {}) {
  const step = o.step ?? 1, def = o.def ?? 0, dec = o.dec ?? 0, sgn = o.signed ?? min < 0;
  const get = o.get || (() => getPath(cs(), o.key)), set = o.set || (v => setPath(cs(), o.key, v));
  const fmt = v => o.fmt ? o.fmt(v) : fmtV(v, dec, sgn);
  const range = el('input', { type: 'range', class: 'rg' + (o.track ? ' col' : ''), min, max, step, 'aria-label': label });
  if (o.track) range.style.setProperty('--tr', o.track);
  const val = el('input', { class: 'val', inputmode: 'decimal', autocomplete: 'off', 'aria-label': label + ' Wert' });
  const lab = el('span', { class: 'lab', title: 'Doppelklick setzt zurück' }, label);
  const top = el('div', { class: 'top' }, lab, val);
  const box = el('div', { class: 'sl' }, top, range);
  let subBox = null;
  if (o.subs) {
    const more = el('button', { class: 'more', title: 'Weitere Optionen', 'aria-label': label + ': weitere Optionen', html: icon('chevRight', 12) });
    top.append(more); subBox = el('div', { class: 'subsl' }); subBox.hidden = !store.get('subopen-' + label, false);
    if (!subBox.hidden) more.classList.add('open');
    more.onclick = () => { subBox.hidden = !subBox.hidden; more.classList.toggle('open', !subBox.hidden); store.set('subopen-' + label, !subBox.hidden); if (!subBox.hidden && !subBox.childElementCount) subBox.append(...o.subs()); };
    if (!subBox.hidden) subBox.append(...o.subs());
  }
  const paint = v => {
    if (v == null || isNaN(v)) v = def;
    range.value = v; if (document.activeElement !== val) val.value = fmt(v);
    const z = min < 0 && max > 0 ? 0 : (o.zero ?? min), pa = (Math.min(v, z) - min) / (max - min) * 100, pb = (Math.max(v, z) - min) / (max - min) * 100;
    range.style.setProperty('--a', pa + '%'); range.style.setProperty('--b', pb + '%'); box.classList.toggle('changed', Math.abs(v - def) > 1e-9);
  };
  const live = v => { set(v); if (o.wb) cs().wb = 'custom'; o.onLive && o.onLive(v); paint(v); requestRender(); if (o.wb) SYNC.forEach(f => f.wb && f()); };
  const done = v => { if (o.noCommit) { o.onCommit && o.onCommit(v); return; } commit(`${o.hist || label} ${fmt(v)}`); o.onCommit && o.onCommit(v); };
  range.addEventListener('input', () => live(+range.value));
  range.addEventListener('change', () => done(+range.value));
  range.addEventListener('keydown', e => { if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(e.key)) e.stopPropagation(); });
  const reset = () => { live(def); done(def); };
  lab.addEventListener('dblclick', reset); range.addEventListener('dblclick', reset);
  val.addEventListener('change', () => { let v = parseDe(val.value.replace('−', '-').replace(/\s/g, '')); if (isNaN(v)) v = get(); v = clamp(Math.round(v / step) * step, min, max); live(v); val.value = fmt(v); done(v); });
  val.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') val.blur(); if (e.key === 'Escape') { val.value = fmt(get()); val.blur(); } if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); const v = clamp(get() + (e.key === 'ArrowUp' ? step : -step) * (e.shiftKey ? 10 : 1), min, max); live(v); done(v); } });
  val.addEventListener('blur', () => { val.value = fmt(get()); });
  SLIDERS.push({ box, paint: () => paint(get()) });
  paint(curPhoto() ? get() : def);
  const wrap = subBox ? el('div', {}, box, subBox) : box;
  return wrap;
}
function syncSliders() { SLIDERS = SLIDERS.filter(s => s.box.isConnected); if (!curPhoto()) return; for (const s of SLIDERS) s.paint(); }
function syncAll() {
  syncSliders(); SYNC = SYNC.filter(f => !f.node || f.node.isConnected); if (curPhoto()) for (const f of SYNC) f();
  updateUndoButtons(); histFoot(null);
}
function updateUndoButtons() { $('#tUndo').disabled = !canUndo(); $('#tRedo').disabled = !canRedo(); }
function onHistoryChanged() {
  updateUndoButtons();
  if (S.panel === 'versions' && !S.inRender) renderPanel();
}
function sync(node, f) { f.node = node; SYNC.push(f); return node; }
const TR = {
  temp: 'linear-gradient(to right,#3e6fd8,#d8d8d8 50%,#e4c03c)', tint: 'linear-gradient(to right,#2fa84f,#d8d8d8 50%,#c64bc6)',
  sat: 'linear-gradient(to right,#7a7a7a,#d84a4a 30%,#d8c84a 50%,#4ad866 70%,#4a7ad8)', hue: 'linear-gradient(to right,hsl(0 80% 50%),hsl(60 80% 50%),hsl(120 80% 50%),hsl(180 80% 50%),hsl(240 80% 50%),hsl(300 80% 50%),hsl(360 80% 50%))',
  lum: 'linear-gradient(to right,#111,#eee)'
};
function menu(anchor, items) {
  closeMenu();
  const m = el('div', { class: 'menu', role: 'menu' });
  for (const it of items) {
    if (it === '-') { m.append(el('hr')); continue; }
    if (it.head) { m.append(el('div', { class: 'mh' }, it.head)); continue; }
    m.append(el('button', { role: 'menuitem', onclick: () => { closeMenu(); it.fn(); }, onmouseenter: it.hover || null, onmouseleave: it.leave || null }, el('span', { class: 'ck', html: it.checked ? icon('check', 14) : '' }), it.label, it.key ? el('span', { class: 'k' }, it.key) : null));
  }
  document.body.append(m);
  const r = anchor.getBoundingClientRect(), mw = m.offsetWidth, mh = m.offsetHeight;
  let x = r.left, y = r.bottom + 4; if (x + mw > innerWidth - 8) x = innerWidth - mw - 8; if (y + mh > innerHeight - 8) y = Math.max(8, r.top - mh - 4);
  m.style.left = Math.max(8, x) + 'px'; m.style.top = y + 'px';
  setTimeout(() => document.addEventListener('pointerdown', menuAway, true), 0);
  S.menu = m; return m;
}
function menuAway(e) { if (S.menu && !S.menu.contains(e.target)) closeMenu(); }
function closeMenu() { if (S.menu) { S.menu.remove(); S.menu = null; document.removeEventListener('pointerdown', menuAway, true); if (S.preview) { S.preview = null; requestRender(); } } }
function chk(label, get, set, histLabel) { const i = el('input', { type: 'checkbox' }); const l = el('label', { class: 'chk' }, i, label); i.onchange = () => { set(i.checked); requestRender(); commit(`${histLabel || label}: ${i.checked ? 'an' : 'aus'}`); }; return sync(l, () => { i.checked = !!get(); }); }

/* ---------- Bedienfeld-Rahmen ---------- */
const PANEL_TITLES = { edit: 'Bearbeiten', presets: 'Presets', crop: 'Zuschneiden', remove: 'Entfernen', mask: 'Maskieren', versions: 'Versionen', info: 'Informationen', keywords: 'Stichwörter' };
function renderPanel() {
  if (S.inRender) return; S.inRender = true;
  try { renderPanelInner(); } finally { S.inRender = false; }
}
function renderPanelInner() {
  const P = $('#panel'), keep = P.scrollTop; P.replaceChildren(); SYNC = []; SLIDERS = [];
  const p = curPhoto();
  $('#mSheetTitle').textContent = S.mSection ? MSEC_TITLES[S.mSection] || PANEL_TITLES[S.panel] : PANEL_TITLES[S.panel];
  if (!p && !['info', 'keywords'].includes(S.panel)) { P.append(el('div', { class: 'hint' }, 'Wähle ein Foto aus, um es zu bearbeiten.')); return; }
  const build = { edit: buildEdit, presets: buildPresets, crop: buildCrop, remove: buildRemove, mask: buildMask, versions: buildVersions, info: buildInfo, keywords: buildKeywords }[S.panel];
  if (S.profileBrowser && S.panel === 'edit') buildProfileBrowser(P); else build && build(P);
  if (p) syncAll();
  P.scrollTop = keep;
  $$('#rail .rb').forEach(b => b.classList.toggle('on', b.dataset.p === S.panel));
  $$('#mTools button').forEach(b => b.classList.toggle('on', b.dataset.p === S.panel));
  updateMobileSections();
}
function sec(id, title, build, parent, def = true) {
  const closed = store.get('sec-' + id, !def);
  const box = el('section', { class: 'sec' + (closed ? ' closed' : ''), 'data-sec': id });
  const eye = SECTION_KEYS[id] ? el('span', { class: 'eye', role: 'button', title: 'Bereich vorübergehend ausblenden', 'aria-label': title + ' ein-/ausblenden', html: icon('eye', 16) }) : null;
  const head = el('button', { class: 'sh2', 'aria-expanded': String(!closed) }, el('span', { class: 'chev', html: icon('chevDown', 14) }), title, eye);
  const body = el('div', { class: 'sb' });
  head.onclick = e => { if (e.target.closest('.eye')) return; box.classList.toggle('closed'); const c = box.classList.contains('closed'); store.set('sec-' + id, c); head.setAttribute('aria-expanded', String(!c)); if (!c) requestAnimationFrame(() => { drawCurve(); }); };
  if (eye) {
    eye.onclick = e => { e.stopPropagation(); const s = cs(); s.off[id] = !s.off[id]; requestRender(); commit(`${title} ${s.off[id] ? 'ausgeblendet' : 'eingeblendet'}`); };
    sync(box, () => { const s = cs(), off = !!s.off[id], changed = SECTION_KEYS[id].some(k => JSON.stringify(s[k]) !== JSON.stringify(DEFAULTS()[k])); eye.classList.toggle('off', off); eye.classList.toggle('vis', changed); eye.innerHTML = icon(off ? 'eyeOff' : 'eye', 16); box.classList.toggle('disabled', off); });
  }
  build(body); box.append(head, body); parent.append(box); return box;
}
function subbox(id, title, ic, build, menuFn) {
  const closed = store.get('sub-' + id, true);
  const box = el('div', { class: 'subbox' + (closed ? ' closed' : '') });
  const h = el('button', { class: 'sbh' }, el('span', { class: 'bx', html: icon(ic, 15) }), title, el('span', { class: 'chev', html: icon('chevDown', 14) }));
  const b = el('div', { class: 'sbb' });
  h.onclick = e => { if (menuFn && e.target.closest('.chev') && !box.classList.contains('closed')) { menuFn(e.target.closest('.chev')); return; } box.classList.toggle('closed'); store.set('sub-' + id, box.classList.contains('closed')); if (!box.classList.contains('closed')) { if (!b.childElementCount) { build(b); syncAll(); } requestAnimationFrame(() => drawCurve()); } };
  if (!closed) build(b);
  box.append(h, b); return box;
}

/* ---------- Bearbeiten ---------- */
const CREATIVE = id => !['color', 'landscape', 'portrait', 'vivid', 'neutral', 'mono'].includes(id);
function buildEdit(P) {
  P.append(el('div', { class: 'ph mhide' }, el('h2', {}, 'Bearbeiten')));
  const bAuto = el('button', { class: 'gbtn', onclick: doAuto }, 'Auto');
  const bBW = el('button', { class: 'gbtn', onclick: toggleBW }, 'S/W');
  P.append(sync(el('div', { class: 'btnrow mhide' }, bAuto, bBW), () => bBW.classList.toggle('on', !!cs().bw)));
  // Profil
  const ddName = el('span'), dd = el('button', { class: 'dd' }, ddName, el('span', { html: icon('chevDown', 14) }));
  dd.onclick = () => menu(dd, PROFILES.filter(p => p.g === 'Standard' || p.id === cs().profile).map(p => ({ label: p.n, checked: cs().profile === p.id, fn: () => setProfile(p.id), hover: () => { S.preview = Object.assign(clone(cs()), { profile: p.id, bw: !!p.bw }); S.previewName = 'Profil ' + p.n; requestRender(); updateHud(); } })).concat(['-', { label: 'Alle Profile durchsuchen …', fn: () => { S.profileBrowser = true; renderPanel(); } }]));
  const browse = el('button', { class: 'ib', title: 'Profile durchsuchen', 'aria-label': 'Profile durchsuchen', html: icon('grid2', 18), onclick: () => { S.profileBrowser = true; renderPanel(); } });
  const prow = el('div', { class: 'prow mhide' }, el('span', { class: 'lbl' }, 'Profil'), dd, el('span', { class: 'grow' }), browse);
  P.append(sync(prow, () => { const p = PROFILE_BY_ID[cs().profile]; ddName.textContent = p ? p.n : 'Farbe'; }));
  const amt = el('div', { style: 'padding:0 18px 8px' }, slider('Stärke', 0, 200, { key: 'profileAmount', def: 100, signed: false, hist: 'Profilstärke' }));
  P.append(sync(amt, () => { amt.hidden = !CREATIVE(cs().profile); }));
  sec('light', 'Licht', b => {
    b.append(slider('Belichtung', -5, 5, { key: 'exposure', step: .01, dec: 2 }), slider('Kontrast', -100, 100, { key: 'contrast' }), slider('Lichter', -100, 100, { key: 'highlights' }), slider('Tiefen', -100, 100, { key: 'shadows' }), slider('Weiß', -100, 100, { key: 'whites' }), slider('Schwarz', -100, 100, { key: 'blacks' }));
    b.append(subbox('curve', 'Kurve', 'straighten', buildCurve, a => menu(a, [...Object.keys(CURVE_PRESETS).map(k => ({ label: k, fn: () => { cs().curveMode = 'point'; cs().curve.rgb = clone(CURVE_PRESETS[k]); drawCurve(); requestRender(); commit('Kurve: ' + k); } })), '-', { label: 'Kanal zurücksetzen', fn: () => { if (CE.ch === 'param') cs().pcurve = DEFAULTS().pcurve; else cs().curve[CE.ch] = LINEAR(); syncAll(); drawCurve(); requestRender(); commit('Kurve zurückgesetzt'); } }])));
  }, P);
  sec('color', 'Farbe', b => {
    const wbName = el('span'), wbdd = el('button', { class: 'dd sm' }, wbName, el('span', { html: icon('chevDown', 14) }));
    const WBN = { shot: 'Wie Aufnahme', auto: 'Automatisch', custom: 'Benutzerdefiniert' };
    wbdd.onclick = () => menu(wbdd, ['shot', 'auto'].map(k => ({ label: WBN[k], checked: cs().wb === k, fn: () => setWB(k) })));
    const pip = el('button', { class: 'ib', title: 'Weißabgleich-Auswahl (W)', 'aria-label': 'Weißabgleich-Pipette', html: icon('dropper', 18), onclick: () => startWBPick() });
    const f = () => { wbName.textContent = WBN[cs().wb] || 'Benutzerdefiniert'; pip.classList.toggle('on', !!(S.pick && S.pick.kind === 'wb')); }; f.wb = true;
    b.append(sync(el('div', { class: 'row', style: 'display:flex;align-items:center;gap:6px;padding:4px 0' }, el('span', { class: 'dim' }, 'Weißabgleich'), wbdd, el('span', { class: 'grow' }), pip), f));
    b.append(slider('Temp', -100, 100, { key: 'temp', track: TR.temp, wb: true, hist: 'Temperatur' }), slider('Tonung', -100, 100, { key: 'tint', track: TR.tint, wb: true }));
    b.append(slider('Dynamik', -100, 100, { key: 'vibrance', track: TR.sat }), slider('Sättigung', -100, 100, { key: 'saturation', track: TR.sat }));
    b.append(subbox('mixer', 'Farbmischer', 'colorRange', buildMixer), subbox('grading', 'Color-Grading', 'mask', buildGrading));
  }, P);
  sec('effects', 'Effekte', b => {
    b.append(slider('Struktur', -100, 100, { key: 'texture' }), slider('Klarheit', -100, 100, { key: 'clarity' }), slider('Dunst entfernen', -100, 100, { key: 'dehaze' }));
    b.append(slider('Vignette', -100, 100, { key: 'vigAmount', subs: () => [slider('Mittelpunkt', 0, 100, { key: 'vigMid', def: 50, signed: false, hist: 'Vignette Mittelpunkt' }), slider('Weiche Kante', 0, 100, { key: 'vigFeather', def: 50, signed: false, hist: 'Vignette weiche Kante' }), slider('Rundheit', -100, 100, { key: 'vigRound', hist: 'Vignette Rundheit' }), slider('Lichter', 0, 100, { key: 'vigHi', signed: false, hist: 'Vignette Lichter' })] }));
    b.append(slider('Körnung', 0, 100, { key: 'grainAmount', signed: false, subs: () => [slider('Größe', 0, 100, { key: 'grainSize', def: 25, signed: false, hist: 'Körnungsgröße' }), slider('Unregelmäßigkeit', 0, 100, { key: 'grainRough', def: 50, signed: false, hist: 'Körnung Unregelmäßigkeit' })] }));
  }, P);
  sec('detail', 'Detail', b => {
    b.append(slider('Schärfen', 0, 150, { key: 'sharpen', signed: false, track: 'linear-gradient(to right,#5f5f5f 60%,#c84444)', subs: () => [slider('Radius', .5, 3, { key: 'sharpRadius', step: .1, dec: 1, def: 1, signed: false, hist: 'Schärfen Radius' }), slider('Details', 0, 100, { key: 'sharpDetail', def: 25, signed: false, hist: 'Schärfen Details' }), slider('Maskieren', 0, 100, { key: 'sharpMask', signed: false, hist: 'Schärfen Maskieren' })] }));
    b.append(slider('Rauschreduzierung', 0, 100, { key: 'nrLum', signed: false, subs: () => [slider('Details', 0, 100, { key: 'nrDetail', def: 50, signed: false, hist: 'Rauschreduzierung Details' })] }));
    b.append(slider('Farbrauschen', 0, 100, { key: 'nrColor', signed: false }));
    b.append(el('div', { class: 'hint', style: 'padding:6px 0 0' }, el('span', { html: icon('zoom', 14) }), 'Für eine genaue Beurteilung auf 100 % zoomen (Leertaste).'));
  }, P, false);
  sec('optics', 'Optik', b => {
    b.append(chk('Chromatische Aberration entfernen', () => cs().caRemove, v => cs().caRemove = v));
    b.append(el('div', { class: 'minihead' }, 'Objektivkorrektur (manuell)'));
    b.append(slider('Verzerrung', -100, 100, { key: 'lensDist', hist: 'Objektiv Verzerrung' }), slider('Vignettierung', -100, 100, { key: 'lensVig', hist: 'Objektiv Vignettierung', subs: () => [slider('Mittelpunkt', 0, 100, { key: 'lensVigMid', def: 50, signed: false, hist: 'Objektiv Vignettierung Mittelpunkt' })] }));
    b.append(el('div', { class: 'minihead' }, 'Rand entfernen'));
    b.append(slider('Violett: Betrag', 0, 100, { key: 'fringePurple', signed: false }), slider('Violett: Farbton', 230, 330, { key: 'fringePurpleHue', def: 280, signed: false, track: 'linear-gradient(to right,hsl(230 70% 55%),hsl(280 70% 55%),hsl(330 70% 55%))', fmt: v => Math.round(v) + '°' }));
    b.append(slider('Grün: Betrag', 0, 100, { key: 'fringeGreen', signed: false }), slider('Grün: Farbton', 70, 170, { key: 'fringeGreenHue', def: 120, signed: false, track: 'linear-gradient(to right,hsl(70 70% 50%),hsl(120 70% 45%),hsl(170 70% 45%))', fmt: v => Math.round(v) + '°' }));
  }, P, false);
}
function doAuto() { const p = curPhoto(); if (!p) return; Object.assign(p.settings, autoTone(p.stats), autoWB(p.stats), { wb: 'auto' }); syncAll(); requestRender(); commit('Auto'); toast('Automatische Einstellungen angewendet'); }
function toggleBW() { const s = cs(); s.bw = !s.bw; if (s.bw && !PROFILE_BY_ID[s.profile].bw) s.profile = 'mono'; if (!s.bw && PROFILE_BY_ID[s.profile].bw) s.profile = 'color'; syncAll(); requestRender(); commit(s.bw ? 'Schwarzweiß' : 'Farbe'); }
function setProfile(id) { const s = cs(), p = PROFILE_BY_ID[id]; s.profile = id; s.bw = !!p.bw; S.preview = null; syncAll(); requestRender(); commit('Profil: ' + p.n); }
function setWB(k) { const s = cs(), p = curPhoto(); s.wb = k; if (k === 'shot') { s.temp = 0; s.tint = 0; } else Object.assign(s, autoWB(p.stats)); syncAll(); requestRender(); commit('Weißabgleich: ' + (k === 'shot' ? 'Wie Aufnahme' : 'Automatisch')); }
function startPick(kind, hint, fn) { S.pick = { kind, hint, fn }; $('#stage').classList.add('pick'); updateHud(); syncAll(); }
function endPick() { if (S.pick && S.pick.cleanup) S.pick.cleanup(); S.pick = null; $('#stage').classList.remove('pick'); updateHud(); syncAll(); }
function startWBPick() {
  if (S.pick && S.pick.kind === 'wb') { endPick(); return; }
  if (S.view !== 'detail') setView('detail');
  startPick('wb', 'Auf eine neutrale graue oder weiße Fläche klicken', (fx, fy, sx, sy) => {
    if (sx < 0 || sy < 0 || sx > 1 || sy > 1) return; const t = [0, 0, 0]; let r = 0, g = 0, b = 0;
    for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) { srcRGB(sx + i / SRC.w, sy + j / SRC.h, t); r += srgbToLin(t[0]); g += srgbToLin(t[1]); b += srgbToLin(t[2]); }
    Object.assign(cs(), solveWB(r, g, b), { wb: 'custom' }); endPick(); requestRender(); commit('Weißabgleich (Pipette)');
  });
}

/* ---------- Kurve ---------- */
const CE = { ch: 'rgb', drag: -1, canvas: null, read: null };
const CURVE_PRESETS = { 'Linear': LINEAR(), 'Mittlerer Kontrast': [[0, 0], [.25, .21], [.75, .79], [1, 1]], 'Starker Kontrast': [[0, 0], [.25, .16], [.75, .85], [1, 1]], 'Matt': [[0, .1], [.3, .28], [.75, .78], [1, .95]] };
function buildCurve(b) {
  const bar = el('div', { class: 'curvebar' });
  const dots = [['rgb', '#e6e6e6', 'RGB'], ['r', '#e05252', 'Rot'], ['g', '#4cc25c', 'Grün'], ['b', '#4f86e8', 'Blau']].map(([k, c, n]) => el('button', { class: 'cdot', style: `--c:${c}`, title: n, 'aria-label': 'Kanal ' + n, 'data-ch': k, onclick: () => { CE.ch = k; cs().curveMode = 'point'; paintBar(); paramBox.hidden = true; drawCurve(); } }));
  const par = el('button', { class: 'cdot param', title: 'Parametrische Kurve', 'aria-label': 'Parametrische Kurve', html: icon('straighten', 16), onclick: () => { CE.ch = 'param'; cs().curveMode = 'param'; paintBar(); paramBox.hidden = false; drawCurve(); requestRender(); } });
  const paintBar = () => { dots.forEach(d => d.classList.toggle('on', d.dataset.ch === CE.ch)); par.classList.toggle('on', CE.ch === 'param'); };
  bar.append(...dots, par);
  CE.canvas = el('canvas', { id: 'curve', 'aria-label': 'Gradationskurve: klicken setzt Punkte, Doppelklick oder Rechtsklick entfernt sie' });
  CE.read = el('div', { class: 'curve-read' }, el('span', {}, ''), el('span', {}, ''));
  const paramBox = el('div', {}, slider('Lichter', -100, 100, { key: 'pcurve.hi', hist: 'Param. Kurve Lichter', onLive: () => drawCurve() }), slider('Helle Farbtöne', -100, 100, { key: 'pcurve.li', hist: 'Param. Kurve helle Farbtöne', onLive: () => drawCurve() }), slider('Dunkle Farbtöne', -100, 100, { key: 'pcurve.da', hist: 'Param. Kurve dunkle Farbtöne', onLive: () => drawCurve() }), slider('Tiefen', -100, 100, { key: 'pcurve.sh', hist: 'Param. Kurve Tiefen', onLive: () => drawCurve() }),
    el('div', { class: 'minihead' }, 'Bereichsteiler'), slider('Tiefen | Dunkel', 10, 40, { key: 'pcurve.s1', def: 25, signed: false, hist: 'Teiler 1', onLive: () => drawCurve() }), slider('Dunkel | Hell', 35, 65, { key: 'pcurve.s2', def: 50, signed: false, hist: 'Teiler 2', onLive: () => drawCurve() }), slider('Hell | Lichter', 60, 90, { key: 'pcurve.s3', def: 75, signed: false, hist: 'Teiler 3', onLive: () => drawCurve() }));
  b.append(bar, CE.canvas, CE.read, paramBox);
  if (cs().curveMode === 'param') CE.ch = 'param'; else if (CE.ch === 'param') CE.ch = 'rgb';
  paramBox.hidden = CE.ch !== 'param'; paintBar(); wireCurve();
  sync(b, () => { if (cs().curveMode === 'param' && CE.ch !== 'param') { CE.ch = 'param'; paintBar(); paramBox.hidden = false; } drawCurve(); });
  requestAnimationFrame(drawCurve);
}
function curvePad() { return 6 * (devicePixelRatio || 1); }
function curveXY(e) { const c = CE.canvas, r = c.getBoundingClientRect(), dpr = devicePixelRatio || 1, p = curvePad() / dpr, w = r.width - 2 * p; return [(e.clientX - r.left - p) / w, 1 - (e.clientY - r.top - p) / w]; }
function drawCurve() {
  const c = CE.canvas; if (!c || !c.isConnected || !c.offsetParent || !curPhoto()) return;
  const dpr = devicePixelRatio || 1, W = Math.round(c.clientWidth * dpr); if (!W) return; if (c.width !== W) { c.width = W; c.height = W; }
  const x = c.getContext('2d'), p = curvePad(), w = W - 2 * p, X = v => p + v * w, Y = v => p + (1 - v) * w, s = cs();
  x.fillStyle = '#262626'; x.fillRect(0, 0, W, W); x.fillStyle = '#4d4d4d'; x.fillRect(p, p, w, w);
  const h = S.histo; if (h) { const a = CE.ch === 'rgb' || CE.ch === 'param' ? h.l : h[CE.ch]; let mx = 1; for (let i = 2; i < 254; i++) mx = Math.max(mx, a[i]); x.fillStyle = 'rgba(30,30,30,.45)'; x.beginPath(); x.moveTo(X(0), Y(0)); for (let i = 0; i < 256; i++) x.lineTo(X(i / 255), Y(Math.min(1, a[i] / mx) * .85)); x.lineTo(X(1), Y(0)); x.fill(); }
  x.strokeStyle = 'rgba(25,25,25,.7)'; x.lineWidth = dpr; x.beginPath(); for (let i = 1; i < 4; i++) { x.moveTo(X(i / 4), Y(0)); x.lineTo(X(i / 4), Y(1)); x.moveTo(X(0), Y(i / 4)); x.lineTo(X(1), Y(i / 4)); } x.stroke();
  x.strokeStyle = 'rgba(255,255,255,.18)'; x.beginPath(); x.moveTo(X(0), Y(0)); x.lineTo(X(1), Y(1)); x.stroke();
  if (CE.ch === 'param') {
    const f = pcurveFn(s.pcurve); x.strokeStyle = '#eee'; x.lineWidth = 1.6 * dpr; x.beginPath(); for (let i = 0; i <= 160; i++) { const v = i / 160; i ? x.lineTo(X(v), Y(f(v))) : x.moveTo(X(v), Y(f(v))); } x.stroke();
    x.strokeStyle = 'rgba(255,255,255,.35)'; x.setLineDash([3 * dpr, 3 * dpr]); x.beginPath(); for (const k of ['s1', 's2', 's3']) { const v = s.pcurve[k] / 100; x.moveTo(X(v), Y(0)); x.lineTo(X(v), Y(1)); } x.stroke(); x.setLineDash([]); return;
  }
  const pts = s.curve[CE.ch], f = curveFn(pts), col = { rgb: '#f0f0f0', r: '#ff6b6b', g: '#69d36f', b: '#6b9cff' }[CE.ch];
  if (CE.ch !== 'rgb') { x.strokeStyle = 'rgba(255,255,255,.3)'; const fm = curveFn(s.curve.rgb); x.lineWidth = dpr; x.beginPath(); for (let i = 0; i <= 128; i++) { const v = i / 128; i ? x.lineTo(X(v), Y(fm(v))) : x.moveTo(X(v), Y(fm(v))); } x.stroke(); }
  x.strokeStyle = col; x.lineWidth = 1.6 * dpr; x.beginPath(); for (let i = 0; i <= 160; i++) { const v = i / 160, y = clamp(f(v), 0, 1); i ? x.lineTo(X(v), Y(y)) : x.moveTo(X(v), Y(y)); } x.stroke();
  pts.forEach((q, i) => { x.beginPath(); x.arc(X(q[0]), Y(q[1]), (i === CE.drag ? 5.5 : 4.5) * dpr, 0, Math.PI * 2); x.fillStyle = i === CE.drag ? col : '#4d4d4d'; x.fill(); x.strokeStyle = col; x.lineWidth = 1.5 * dpr; x.stroke(); });
}
function wireCurve() {
  const c = CE.canvas; let removing = false;
  const nearest = e => { const [px, py] = curveXY(e), pts = cs().curve[CE.ch], r = c.getBoundingClientRect(), tol = 12 / r.width; return pts.findIndex(q => Math.hypot(q[0] - px, q[1] - py) < tol * 1.3); };
  c.addEventListener('pointerdown', e => {
    if (CE.ch === 'param' || e.button === 2) return;
    const [px, py] = curveXY(e), pts = cs().curve[CE.ch]; let i = nearest(e);
    if (i < 0) { if (px <= 0 || px >= 1) return; const y = clamp(curveFn(pts)(px), 0, 1); pts.push([px, Math.abs(py - y) < .12 ? y : clamp(py, 0, 1)]); pts.sort((a, b) => a[0] - b[0]); i = pts.findIndex(q => q[0] === px); }
    CE.drag = i; removing = false; c.setPointerCapture(e.pointerId); drawCurve(); requestRender();
  });
  c.addEventListener('pointermove', e => {
    const [px, py] = curveXY(e);
    if (CE.ch !== 'param' && px >= 0 && px <= 1) { CE.read.firstChild.textContent = `Eingabe ${Math.round(px * 100)} %`; CE.read.lastChild.textContent = `Ausgabe ${Math.round(clamp(curveFn(cs().curve[CE.ch])(px), 0, 1) * 100)} %`; }
    if (CE.drag < 0) return;
    const pts = cs().curve[CE.ch], i = CE.drag, last = pts.length - 1;
    removing = i > 0 && i < last && (py < -.1 || py > 1.1);
    const lo = i === 0 ? 0 : pts[i - 1][0] + .01, hi = i === last ? 1 : pts[i + 1][0] - .01;
    pts[i] = [i === 0 ? clamp(px, 0, pts[1][0] - .01) : i === last ? clamp(px, pts[last - 1][0] + .01, 1) : clamp(px, lo, hi), clamp(py, 0, 1)];
    drawCurve(); requestRender();
  });
  const end = () => { if (CE.drag < 0) return; const pts = cs().curve[CE.ch]; if (removing) pts.splice(CE.drag, 1); CE.drag = -1; removing = false; drawCurve(); requestRender(); commit('Punktkurve'); };
  c.addEventListener('pointerup', end); c.addEventListener('pointercancel', end);
  const del = e => { e.preventDefault(); if (CE.ch === 'param') return; const i = nearest(e), pts = cs().curve[CE.ch]; if (i > 0 && i < pts.length - 1) { pts.splice(i, 1); drawCurve(); requestRender(); commit('Steuerpunkt gelöscht'); } };
  c.addEventListener('dblclick', del); c.addEventListener('contextmenu', del);
  c.addEventListener('pointerleave', () => { CE.read.firstChild.textContent = ''; CE.read.lastChild.textContent = ''; });
}

/* ---------- Farbmischer & Punktfarbe ---------- */
const MIX = { tab: 'mixer', color: 0, point: 0 };
function buildMixer(b) {
  const tabs = el('div', { class: 'seg2', style: 'margin:2px 0 8px' });
  const tMix = el('button', { onclick: () => { MIX.tab = 'mixer'; render(); } }, 'Mixer'), tPt = el('button', { onclick: () => { MIX.tab = 'point'; render(); } }, 'Punktfarbe');
  tabs.append(tMix, tPt);
  const body = el('div'); b.append(tabs, body);
  const render = () => {
    tMix.classList.toggle('on', MIX.tab === 'mixer'); tPt.classList.toggle('on', MIX.tab === 'point'); body.replaceChildren(); SLIDERS = SLIDERS.filter(s => s.box.isConnected);
    if (MIX.tab === 'mixer') {
      const bw = cs().bw, sw = el('div', { class: 'swatches' });
      HUES.forEach((h, i) => sw.append(el('button', { class: 'sw' + (i === MIX.color ? ' on' : ''), style: `--c:hsl(${h.h} 75% 55%)`, title: h.n, 'aria-label': h.n, onclick: () => { MIX.color = i; render(); } })));
      const target = el('button', { class: 'ib', title: 'Ziel-Korrektur: im Bild ziehen (↕ Sättigung, Umschalt: Luminanz, Alt: Farbton)', 'aria-label': 'Ziel-Korrektur', html: icon('zoom', 18), onclick: () => startTargetMixer() });
      body.append(el('div', { style: 'display:flex;align-items:center;gap:6px' }, el('span', { class: 'dim grow' }, bw ? 'S/W-Mischung' : HUES[MIX.color].n), target), sw);
      const h = HUES[MIX.color].h, i = MIX.color;
      if (bw) body.append(slider(HUES[i].n, -100, 100, { key: `bwMix.${i}`, track: `linear-gradient(to right,#111,hsl(${h} 70% 50%),#eee)`, hist: 'S/W-Mischung ' + HUES[i].n }));
      else body.append(
        slider('Farbton', -100, 100, { key: `hue.${i}`, track: `linear-gradient(to right,hsl(${h - 30} 80% 50%),hsl(${h} 80% 50%),hsl(${h + 30} 80% 50%))`, hist: 'Farbton ' + HUES[i].n }),
        slider('Sättigung', -100, 100, { key: `sat.${i}`, track: `linear-gradient(to right,hsl(${h} 0% 50%),hsl(${h} 85% 50%))`, hist: 'Sättigung ' + HUES[i].n }),
        slider('Luminanz', -100, 100, { key: `lum.${i}`, track: `linear-gradient(to right,hsl(${h} 60% 12%),hsl(${h} 65% 50%),hsl(${h} 70% 88%))`, hist: 'Luminanz ' + HUES[i].n }));
    } else {
      const pts = cs().points; MIX.point = Math.min(MIX.point, pts.length - 1);
      const row = el('div', { class: 'pcrow' }, el('button', { class: 'ib', title: 'Farbe im Bild auswählen', 'aria-label': 'Punktfarbe auswählen', html: icon('dropper', 18), onclick: () => startPointPick(render) }));
      pts.forEach((p, i) => { const [r, g, b2] = hslRgb(p.h / 360, p.s, p.l); row.append(el('button', { class: 'pcs' + (i === MIX.point ? ' on' : ''), style: `background:rgb(${r * 255 | 0},${g * 255 | 0},${b2 * 255 | 0})`, title: 'Punktfarbe ' + (i + 1), onclick: () => { MIX.point = i; render(); } })); });
      body.append(row);
      if (!pts.length) body.append(el('div', { class: 'hint', style: 'padding:4px 0' }, 'Mit der Pipette eine Farbe im Bild auswählen. Bis zu 8 Punktfarben sind möglich.'));
      else {
        const i = MIX.point, p = pts[i];
        body.append(slider('Farbtonverschiebung', -100, 100, { get: () => cs().points[i].dh, set: v => cs().points[i].dh = v, track: `linear-gradient(to right,hsl(${p.h - 40} 80% 50%),hsl(${p.h} 80% 50%),hsl(${p.h + 40} 80% 50%))`, hist: 'Punktfarbe Farbton' }),
          slider('Sättigungsverschiebung', -100, 100, { get: () => cs().points[i].ds, set: v => cs().points[i].ds = v, hist: 'Punktfarbe Sättigung' }),
          slider('Helligkeitsverschiebung', -100, 100, { get: () => cs().points[i].dl, set: v => cs().points[i].dl = v, hist: 'Punktfarbe Helligkeit' }),
          slider('Bereich', 0, 100, { get: () => cs().points[i].range, set: v => cs().points[i].range = v, def: 50, signed: false, hist: 'Punktfarbe Bereich' }),
          el('button', { class: 'gbtn', style: 'margin-top:8px', onclick: () => { cs().points.splice(i, 1); MIX.point = Math.max(0, i - 1); render(); requestRender(); commit('Punktfarbe entfernt'); } }, 'Punktfarbe entfernen'));
      }
    }
    syncSliders();
  };
  render();
  sync(b, () => { const want = cs().bw; if (b.dataset.bw !== String(want)) { b.dataset.bw = String(want); render(); } });
}
function startPointPick(after) {
  if (cs().points.length >= 8) { toast('Es sind bereits 8 Punktfarben gesetzt.'); return; }
  startPick('point', 'Farbe im Bild anklicken', (fx, fy) => {
    const [px, py] = frameToScreen(fx, fy), dpr = devicePixelRatio || 1, c = R.readPixel(Math.round(px * dpr), Math.round(py * dpr));
    const [h, s, l] = rgbToHsl(c[0] / 255, c[1] / 255, c[2] / 255);
    if (s < .05) { toast('Diese Stelle ist fast farblos. Bitte eine farbige Stelle wählen.'); return; }
    cs().points.push({ h: Math.round(h * 360), s: +s.toFixed(3), l: +l.toFixed(3), range: 50, dh: 0, ds: 0, dl: 0 }); MIX.point = cs().points.length - 1;
    endPick(); after && after(); requestRender(); commit('Punktfarbe hinzugefügt');
  });
}
function startTargetMixer() {
  if (S.pick && S.pick.kind === 'target') { endPick(); return; }
  S.pick = { kind: 'target', hint: 'Im Bild nach oben/unten ziehen: Sättigung · Umschalt: Luminanz · Alt: Farbton', fn: () => { } };
  $('#stage').classList.add('pick'); updateHud();
  const st = $('#stage'); let d = null;
  const downH = e => { if (!S.pick || S.pick.kind !== 'target') return; const r = st.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top; if (!insideMain(px, py)) return; e.stopImmediatePropagation(); const [fx, fy] = screenToFrame(px, py), [sx, sy] = frameToSrc(fx, fy, cs(), R.w, R.h), t = srcRGB(sx, sy, [0, 0, 0]), [h] = rgbToHsl(...t); const hd = h * 360, C = [0, 30, 60, 120, 180, 240, 270, 300, 360], w = Array(8).fill(0); for (let i = 0; i < 8; i++) if (hd >= C[i] && hd < C[i + 1]) { const tt = smooth(0, 1, (hd - C[i]) / (C[i + 1] - C[i])); w[i] += 1 - tt; w[(i + 1) % 8] += tt; } const prop = e.altKey ? 'hue' : e.shiftKey ? 'lum' : 'sat'; d = { y: e.clientY, w, prop, base: cs()[prop].slice() }; MIX.color = w.indexOf(Math.max(...w)); st.setPointerCapture(e.pointerId); };
  const moveH = e => { if (!d) return; e.stopImmediatePropagation(); const dv = (d.y - e.clientY) * .6, a = cs()[d.prop]; for (let i = 0; i < 8; i++) a[i] = clamp(Math.round(d.base[i] + dv * d.w[i]), -100, 100); syncSliders(); requestRender(); };
  const upH = e => { if (!d) return; e.stopImmediatePropagation(); d = null; commit('Farbmischer (Ziel-Korrektur)'); renderPanel(); };
  st.addEventListener('pointerdown', downH, true); st.addEventListener('pointermove', moveH, true); st.addEventListener('pointerup', upH, true);
  S.pick.cleanup = () => { st.removeEventListener('pointerdown', downH, true); st.removeEventListener('pointermove', moveH, true); st.removeEventListener('pointerup', upH, true); };
}

/* ---------- Color-Grading ---------- */
const CG = { view: store.get('cgView', 'three') };
function buildGrading(b) {
  const bar = el('div', { class: 'cgbar' }), body = el('div');
  const views = [['three', 'mask', '3-Wege-Ansicht'], '|', ['gS', null, 'Schatten'], ['gM', null, 'Mitteltöne'], ['gH', null, 'Lichter'], '|', ['gG', 'bw', 'Global']];
  const btns = [];
  for (const v of views) {
    if (v === '|') { bar.append(el('span', { class: 'bar' })); continue; }
    const [k, ic, n] = v, fill = { gS: '#777', gM: '#aaa', gH: '#eee' }[k];
    const btn = el('button', { title: n, 'aria-label': n, html: ic ? icon(ic, 16) : `<span style="width:14px;height:14px;border-radius:50%;border:1.5px solid #ccc;background:${fill};display:block"></span>`, onclick: () => { CG.view = k; store.set('cgView', k); render(); } });
    btn.dataset.k = k; btns.push(btn); bar.append(btn);
  }
  const render = () => {
    btns.forEach(x => x.classList.toggle('on', x.dataset.k === CG.view)); body.replaceChildren(); SLIDERS = SLIDERS.filter(s => s.box.isConnected); SYNC = SYNC.filter(f => !f.node || f.node.isConnected);
    if (CG.view === 'three') { const g = el('div', { class: 'wheels3' }); g.append(wheel('gM', 'Mitteltöne'), wheel('gS', 'Schatten'), wheel('gH', 'Lichter')); body.append(g); }
    else { const n = { gS: 'Schatten', gM: 'Mitteltöne', gH: 'Lichter', gG: 'Global' }[CG.view]; body.append(el('div', { style: 'display:flex;justify-content:center' }, wheel(CG.view, n, true, true)), slider('Farbton', 0, 359, { key: CG.view + '.h', signed: false, track: TR.hue, hist: n + ' Farbton', onLive: () => syncAll() }), slider('Sättigung', 0, 100, { key: CG.view + '.s', signed: false, hist: n + ' Sättigung', onLive: () => syncAll() }), slider('Luminanz', -100, 100, { key: CG.view + '.l', track: TR.lum, hist: n + ' Luminanz' })); }
    body.append(el('div', { style: 'height:6px' }), slider('Überblendung', 0, 100, { key: 'gBlend', def: 50, signed: false, hist: 'Color-Grading Überblendung' }), slider('Abgleich', -100, 100, { key: 'gBalance', hist: 'Color-Grading Abgleich' }));
    syncAll();
  };
  b.append(bar, body); render();
}
function wheel(key, label, big, noLum) {
  const wh = el('div', { class: 'wheel' + (big ? ' big' : ''), role: 'slider', tabindex: '0', 'aria-label': `${label}: Farbton und Sättigung` }), puck = el('div', { class: 'puck' }), val = el('div', { class: 'wv num' });
  wh.append(puck);
  const place = () => { const g = cs()[key], r = g.s / 100 * 50, a = g.h * Math.PI / 180; puck.style.left = (50 + Math.cos(a) * r) + '%'; puck.style.top = (50 + Math.sin(a) * r) + '%'; puck.style.background = g.s ? `hsl(${g.h} 80% 55%)` : 'transparent'; val.textContent = `F ${Math.round(g.h)}°  S ${Math.round(g.s)}`; };
  const fromEvt = e => { const r = wh.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2); const g = cs()[key]; g.h = Math.round((Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360); g.s = Math.round(clamp(Math.hypot(dx, dy) / (r.width / 2) * 100, 0, 100) * (e.shiftKey ? .4 : 1)); place(); syncSliders(); requestRender(); };
  let drag = false;
  wh.addEventListener('pointerdown', e => { drag = true; wh.setPointerCapture(e.pointerId); fromEvt(e); });
  wh.addEventListener('pointermove', e => { if (drag) fromEvt(e); });
  wh.addEventListener('pointerup', () => { if (drag) { drag = false; commit(`Color-Grading ${label}`); } });
  wh.addEventListener('dblclick', () => { const g = cs()[key]; g.h = 0; g.s = 0; place(); requestRender(); commit(`Color-Grading ${label} zurückgesetzt`); });
  wh.addEventListener('keydown', e => { const g = cs()[key], m = { ArrowLeft: [-5, 0], ArrowRight: [5, 0], ArrowUp: [0, 2], ArrowDown: [0, -2] }[e.key]; if (!m) return; e.preventDefault(); e.stopPropagation(); g.h = (g.h + m[0] + 360) % 360; g.s = clamp(g.s + m[1], 0, 100); place(); requestRender(); commit(`Color-Grading ${label}`); });
  const box = el('div', { class: 'wb' }, el('span', { class: 'wl' }, label), wh, val);
  if (!noLum) box.append(slider('Luminanz', -100, 100, { key: key + '.l', track: TR.lum, hist: label + ' Luminanz' }));
  return sync(box, place);
}

/* ---------- Profil-Browser ---------- */
function buildProfileBrowser(P) {
  P.append(el('div', { class: 'ph' }, el('button', { class: 'ib', title: 'Zurück', 'aria-label': 'Zurück', html: icon('chevLeft', 18), onclick: () => { S.profileBrowser = false; S.preview = null; requestRender(); renderPanel(); } }), el('h2', {}, 'Profile')));
  const groups = [...new Set(PROFILES.map(p => p.g))];
  const thumbs = [];
  for (const g of groups) {
    const box = el('div', { class: 'pgroup' }), body = el('div', { class: 'pgb' }), grid = el('div', { class: 'pgrid' });
    box.append(el('button', { class: 'pgh', onclick: () => box.classList.toggle('closed') }, el('span', { class: 'chev', html: icon('chevDown', 14) }), g, el('span', { class: 'dim', style: 'margin-left:auto;font-weight:400' }, String(PROFILES.filter(p => p.g === g).length))), body);
    for (const p of PROFILES.filter(p => p.g === g)) {
      const cv = el('canvas', { width: 160, height: 128 });
      const t = el('button', { class: 'pt' + (cs().profile === p.id ? ' on' : ''), title: p.n }, cv, el('span', {}, p.n));
      t.onmouseenter = () => { S.preview = Object.assign(clone(cs()), { profile: p.id, bw: !!p.bw }); S.previewName = 'Profil ' + p.n; requestRender(); updateHud(); };
      t.onmouseleave = () => { S.preview = null; requestRender(); updateHud(); };
      t.onclick = () => { setProfile(p.id); $$('.pt', P).forEach(x => x.classList.toggle('on', x === t)); };
      grid.append(t); thumbs.push([cv, Object.assign(clone(cs()), { profile: p.id, bw: !!p.bw })]);
    }
    body.append(grid); P.append(box);
  }
  previewThumbs(thumbs);
}
let thumbJob = 0;
async function previewThumbs(list) {
  const job = ++thumbJob;
  for (const [cv, s] of list) {
    if (job !== thumbJob || !cv.isConnected || !R.hasImage) return;
    const o = outputSize(s, R.w, R.h), k = Math.max(160 / o.w, 128 / o.h), w = Math.round(o.w * k), h = Math.round(o.h * k);
    const c = R.toCanvas(effective(s), w, h), x = cv.getContext('2d'); x.drawImage(c, (160 - w) / 2, (128 - h) / 2);
    await sleep(0);
  }
}

/* ---------- Presets ---------- */
const PRESETS = [
  { g: 'Porträts', n: 'Porträt sanft', t: ['Subtil', 'Warm'], s: { texture: -20, clarity: -10, highlights: -15, shadows: 10, temp: 5, sat: [0, -6, 0, 0, 0, 0, 0, 0], lum: [0, 10, 0, 0, 0, 0, 0, 0] } },
  { g: 'Porträts', n: 'Porträt hell & klar', t: ['Hell'], s: { exposure: .25, contrast: -10, highlights: -30, shadows: 20, whites: 10, texture: -10, vibrance: 10, lum: [0, 12, 5, 0, 0, 0, 0, 0] } },
  { g: 'Porträts', n: 'Porträt S/W', t: ['S/W', 'Stark'], s: { bw: true, profile: 'mono', contrast: 25, clarity: 10, highlights: -20, shadows: 15, bwMix: [20, 25, 10, 0, 0, -10, 0, 10] } },
  { g: 'Stil: Kino', n: 'Kino 01 – Teal & Orange', t: ['Kino', 'Stark'], s: { contrast: 15, vibrance: 18, gS: { h: 190, s: 38, l: -5 }, gH: { h: 35, s: 30, l: 0 }, hue: [0, -8, 0, 0, 0, -10, 0, 0], sat: [0, 10, 0, -20, 0, 10, 0, 0] } },
  { g: 'Stil: Kino', n: 'Kino 02 – Nachtblau', t: ['Kino', 'Kühl', 'Dunkel'], s: { exposure: -.3, temp: -18, contrast: 20, highlights: -40, gS: { h: 220, s: 30, l: -8 }, gH: { h: 200, s: 10, l: 0 }, saturation: -15, vigAmount: -25 } },
  { g: 'Stil: Kino', n: 'Kino 03 – Matt warm', t: ['Kino', 'Warm'], s: { temp: 10, contrast: -12, curve: { rgb: [[0, .08], [.3, .3], [.75, .78], [1, .95]], r: LINEAR(), g: LINEAR(), b: LINEAR() }, gH: { h: 40, s: 22, l: 0 }, gS: { h: 175, s: 18, l: 0 }, saturation: -10, grainAmount: 15 } },
  { g: 'Stil: Vintage', n: 'Vintage verblasst', t: ['Warm', 'Subtil'], s: { contrast: -15, saturation: -25, curve: { rgb: [[0, .12], [1, .9]], r: LINEAR(), g: LINEAR(), b: LINEAR() }, gH: { h: 50, s: 25, l: 0 }, gS: { h: 160, s: 15, l: 0 }, vigAmount: -25, grainAmount: 30, grainSize: 40 } },
  { g: 'Stil: Vintage', n: 'Warmer Film', t: ['Warm'], s: { temp: 16, tint: 4, contrast: -8, saturation: -10, curve: { rgb: [[0, .06], [.25, .24], [.75, .8], [1, .95]], r: LINEAR(), g: LINEAR(), b: LINEAR() }, gH: { h: 42, s: 22, l: 0 }, gS: { h: 200, s: 14, l: 0 }, grainAmount: 22 } },
  { g: 'Stil: Vintage', n: 'Kühler Film', t: ['Kühl'], s: { temp: -14, saturation: -18, curve: { rgb: [[0, .1], [.5, .5], [1, .92]], r: LINEAR(), g: LINEAR(), b: LINEAR() }, gS: { h: 210, s: 22, l: 0 }, grainAmount: 18 } },
  { g: 'Stil: Schwarzweiß', n: 'S/W klassisch', t: ['S/W'], s: { bw: true, profile: 'mono', contrast: 25, clarity: 20, whites: 10, blacks: -20, grainAmount: 15 } },
  { g: 'Stil: Schwarzweiß', n: 'S/W Selen', t: ['S/W', 'Subtil'], s: { bw: true, profile: 'mono', contrast: 20, gS: { h: 265, s: 16, l: 0 }, gH: { h: 40, s: 10, l: 0 } } },
  { g: 'Stil: Schwarzweiß', n: 'S/W hoher Kontrast', t: ['S/W', 'Stark'], s: { bw: true, profile: 'bw1', contrast: 55, clarity: 30, highlights: -20, whites: 25, blacks: -35, bwMix: [10, 10, 5, -10, -20, -40, -20, 0], vigAmount: -20 } },
  { g: 'Motiv: Landschaft', n: 'Landschaft lebendig', t: ['Stark'], s: { dehaze: 15, clarity: 20, vibrance: 30, highlights: -40, shadows: 25, whites: 10, blacks: -10, sat: [0, 0, 5, 12, 8, 15, 0, 0], lum: [0, 0, 0, 0, 0, -15, 0, 0] } },
  { g: 'Motiv: Landschaft', n: 'Dramatischer Himmel', t: ['Stark', 'Dunkel'], s: { exposure: -.2, contrast: 30, highlights: -60, shadows: 40, clarity: 40, dehaze: 20, vigAmount: -35, vibrance: 10, saturation: -15 } },
  { g: 'Motiv: Landschaft', n: 'Goldene Stunde', t: ['Warm'], s: { temp: 20, tint: 6, highlights: -25, shadows: 20, vibrance: 20, gH: { h: 38, s: 30, l: 5 }, gM: { h: 30, s: 10, l: 0 } } },
  { g: 'Motiv: Städtische Architektur', n: 'Beton & Glas', t: ['Kühl', 'Stark'], s: { temp: -8, contrast: 25, clarity: 30, texture: 20, saturation: -30, highlights: -30, shadows: 20 } },
  { g: 'Motiv: Städtische Architektur', n: 'Nachtstadt', t: ['Kino', 'Dunkel'], s: { temp: -10, exposure: .25, contrast: 18, shadows: 15, nrLum: 35, nrColor: 60, dehaze: 8, vibrance: 15 } },
  { g: 'Jahreszeiten', n: 'Frühling', t: ['Hell', 'Subtil'], s: { exposure: .15, temp: 4, vibrance: 22, hue: [0, 0, -10, -8, 0, 0, 0, 0], sat: [0, 0, 10, 15, 0, 0, 0, 0], lum: [0, 0, 10, 10, 0, 0, 0, 0] } },
  { g: 'Jahreszeiten', n: 'Herbst', t: ['Warm'], s: { temp: 12, hue: [0, -8, -18, -25, 0, 0, 0, 0], sat: [10, 20, 15, -10, 0, -10, 0, 0], contrast: 10, gH: { h: 35, s: 18, l: 0 } } },
  { g: 'Jahreszeiten', n: 'Winter', t: ['Kühl', 'Hell'], s: { temp: -16, exposure: .2, highlights: -20, whites: 15, saturation: -20, gS: { h: 215, s: 20, l: 0 } } },
  { g: 'Grundlagen', n: 'Kontrastreich', t: ['Stark'], s: { contrast: 35, highlights: -20, shadows: 15, whites: 15, blacks: -18, clarity: 15, vibrance: 15 } },
  { g: 'Grundlagen', n: 'Weich & hell', t: ['Hell', 'Subtil'], s: { exposure: .3, contrast: -20, highlights: -35, shadows: 30, clarity: -15, texture: -10, saturation: -8 } },
  { g: 'Grundlagen', n: 'Aufhellen', t: ['Hell', 'Subtil'], s: { exposure: .5, shadows: 20 } },
  { g: 'Grundlagen', n: 'Abdunkeln', t: ['Dunkel', 'Subtil'], s: { exposure: -.5, highlights: -20 } }
];
const userPresets = () => store.get('presets', []);
const PR = { tab: store.get('prTab', 'rec'), chip: 'Alle' };
function presetTarget(s, pr) { const keep = {}; for (const k of [...GEOMETRY_KEYS, ...LOCAL_KEYS]) keep[k] = clone(s[k]); return normalizeSettings(Object.assign(DEFAULTS(), clone(pr.s), keep)); }
function blendSettings(a, b, t) {
  const walk = (x, y) => { if (typeof x === 'number' && typeof y === 'number') return x + (y - x) * t; if (Array.isArray(x) && Array.isArray(y) && x.length === y.length && x.every(v => typeof v === 'number' || Array.isArray(v))) return x.map((v, i) => walk(v, y[i])); if (x && y && typeof x === 'object' && !Array.isArray(x)) { const o = {}; for (const k of Object.keys(y)) o[k] = walk(x[k], y[k]); return o; } return t >= .5 ? clone(y) : clone(x); };
  const o = walk(a, b); const lim = { exposure: [-5, 5] }; for (const k of Object.keys(o)) if (typeof o[k] === 'number' && !['rot', 'angle'].includes(k)) { const [lo, hi] = lim[k] || [-100, 200]; o[k] = clamp(Math.round(o[k] * 100) / 100, lo, hi); }
  for (const k of [...GEOMETRY_KEYS, ...LOCAL_KEYS]) o[k] = clone(a[k]);
  return normalizeSettings(o);
}
function applyPreset(pr) { const p = curPhoto(); if (!p) return; const base = clone(p.settings); p.settings = presetTarget(base, pr); S.preview = null; S.presetAmount = { name: pr.n, base, target: clone(p.settings), amount: 100 }; syncAll(); requestRender(); commit('Preset: ' + pr.n); S.presetAmount = { name: pr.n, base, target: clone(p.settings), amount: 100 }; renderPanel(); }
function buildPresets(P) {
  const head = el('div', { class: 'ph' }, el('h2', { class: 'dup' }, 'Presets'), el('span', { class: 'grow' }),
    el('button', { class: 'ib', title: 'Preset zurücksetzen', 'aria-label': 'Preset zurücksetzen', html: icon('reset', 17), onclick: () => { const pa = S.presetAmount; if (!pa) { toast('Kein Preset angewendet'); return; } curPhoto().settings = clone(pa.base); S.presetAmount = null; syncAll(); requestRender(); commit('Preset entfernt'); renderPanel(); } }),
    el('button', { class: 'ib', title: 'Preset erstellen', 'aria-label': 'Preset erstellen', html: icon('plus', 18), onclick: createPresetDlg }));
  P.append(head);
  const tabs = el('div', { class: 'tabs' });
  for (const [k, n] of [['rec', 'Empfohlen'], ['all', 'Sammlung'], ['yours', 'Deine']]) tabs.append(el('button', { class: PR.tab === k ? 'on' : '', onclick: () => { PR.tab = k; store.set('prTab', k); renderPanel(); } }, n));
  P.append(tabs);
  const amountBox = () => { const pa = S.presetAmount; if (!pa) return null; return el('div', { style: 'padding:4px 18px 8px' }, slider('Stärke', 0, 200, { def: 100, signed: false, get: () => S.presetAmount ? S.presetAmount.amount : 100, set: v => { const a = S.presetAmount; a.amount = v; curPhoto().settings = blendSettings(a.base, a.target, v / 100); }, onLive: () => syncSliders(), noCommit: true, onCommit: v => { const a = S.presetAmount; commit(`Preset-Stärke ${Math.round(v)}`); S.presetAmount = a; } })); };
  const row = pr => { const on = S.presetAmount && S.presetAmount.name === pr.n; const b = el('button', { class: 'pi' + (on ? ' on' : '') }, pr.n); b.onmouseenter = () => { if (S.presetAmount && S.presetAmount.name === pr.n) return; S.preview = presetTarget(cs(), pr); S.previewName = pr.n; requestRender(); updateHud(); }; b.onmouseleave = () => { S.preview = null; requestRender(); updateHud(); }; b.onclick = () => applyPreset(pr); if (pr.user) b.append(el('span', { class: 'x', role: 'button', title: 'Preset löschen', html: icon('trash', 14), onclick: e => { e.stopPropagation(); store.set('presets', userPresets().filter(u => u.n !== pr.n)); renderPanel(); toast(`Preset „${pr.n}“ gelöscht`); } })); const frag = [b]; if (on) frag.push(amountBox()); return frag; };
  if (PR.tab === 'rec') {
    const chips = el('div', { class: 'chips' });
    for (const c of ['Alle', 'Subtil', 'Stark', 'S/W', 'Kühl', 'Warm', 'Hell', 'Dunkel', 'Kino']) chips.append(el('button', { class: PR.chip === c ? 'on' : '', onclick: () => { PR.chip = c; renderPanel(); } }, c));
    P.append(chips);
    const grid = el('div', { class: 'pgrid', style: 'padding:0 18px' }), thumbs = [];
    for (const pr of PRESETS.filter(p => PR.chip === 'Alle' || p.t.includes(PR.chip))) {
      const cv = el('canvas', { width: 160, height: 128 }), on = S.presetAmount && S.presetAmount.name === pr.n;
      const t = el('button', { class: 'pt' + (on ? ' on' : ''), title: pr.n }, cv, el('span', {}, pr.n));
      t.onmouseenter = () => { S.preview = presetTarget(cs(), pr); S.previewName = pr.n; requestRender(); updateHud(); }; t.onmouseleave = () => { S.preview = null; requestRender(); updateHud(); };
      t.onclick = () => applyPreset(pr); grid.append(t); thumbs.push([cv, presetTarget(cs(), pr)]);
    }
    const ab = amountBox(); if (ab) P.append(el('div', { class: 'dim', style: 'padding:0 18px' }, 'Angewendet: ' + S.presetAmount.name), ab);
    P.append(grid); previewThumbs(thumbs);
  } else if (PR.tab === 'all') {
    for (const g of [...new Set(PRESETS.map(p => p.g))]) {
      const box = el('div', { class: 'pgroup' + (store.get('pg-' + g, false) ? ' closed' : '') }), body = el('div', { class: 'pgb plist' });
      box.append(el('button', { class: 'pgh', onclick: () => { box.classList.toggle('closed'); store.set('pg-' + g, box.classList.contains('closed')); } }, el('span', { class: 'chev', html: icon('chevDown', 14) }), g), body);
      for (const pr of PRESETS.filter(p => p.g === g)) body.append(...row(pr).filter(Boolean));
      P.append(box);
    }
  } else {
    const list = userPresets().map(p => ({ ...p, user: true }));
    P.append(el('div', { class: 'btnrow' }, el('button', { class: 'gbtn blue', onclick: createPresetDlg }, 'Preset erstellen')));
    if (!list.length) P.append(el('div', { class: 'hint' }, 'Speichere deine aktuellen Einstellungen als eigenes Preset. Es erscheint dann hier und lässt sich mit einem Klick auf andere Fotos anwenden.'));
    const body = el('div', { class: 'pgb plist' }); for (const pr of list) body.append(...row(pr).filter(Boolean)); P.append(body);
  }
}
function createPresetDlg() {
  const p = curPhoto(); if (!p) return;
  const name = el('input', { class: 'field', placeholder: 'z. B. Mein Look', id: 'presetName' });
  const groups = { light: 'Licht', color: 'Farbe', effects: 'Effekte', detail: 'Detail', optics: 'Optik' }, boxes = {};
  const list = el('div'); for (const [k, n] of Object.entries(groups)) { const i = el('input', { type: 'checkbox', checked: true }); boxes[k] = i; list.append(el('label', { class: 'chk' }, i, n)); }
  const pbox = el('input', { type: 'checkbox', checked: true }); list.append(el('label', { class: 'chk' }, pbox, 'Profil und Behandlung'));
  modal('Preset erstellen', [el('label', { class: 'flabel', for: 'presetName' }, 'Name'), name, el('div', { class: 'flabel' }, 'Einstellungen'), list], [{ label: 'Abbrechen' }, {
    label: 'Speichern', primary: true, onClick: () => {
      const n = name.value.trim(); if (!n) { name.focus(); toast('Bitte einen Namen eingeben.'); return false; }
      const s = developPart(p.settings), out = {};
      for (const [k, on] of Object.entries(boxes)) if (on.checked) for (const key of SECTION_KEYS[k]) if (key in s) out[key] = clone(s[key]);
      if (pbox.checked) { out.profile = s.profile; out.profileAmount = s.profileAmount; out.bw = s.bw; }
      store.set('presets', [{ n, g: 'Deine Presets', t: [], s: out }, ...userPresets().filter(u => u.n !== n)]);
      PR.tab = 'yours'; store.set('prTab', 'yours'); if (S.panel !== 'presets') setPanel('presets'); else renderPanel(); toast(`Preset „${n}“ gespeichert`);
    }
  }]);
}

/* ---------- Versionen ---------- */
function buildVersions(P) {
  const p = curPhoto(); p.versions = p.versions || [];
  const tab = S.verTab || 'named';
  P.append(el('div', { class: 'ph' }, el('h2', { class: 'dup' }, 'Versionen')));
  const tabs = el('div', { class: 'tabs' }); for (const [k, n] of [['named', 'Benannt'], ['auto', 'Auto']]) tabs.append(el('button', { class: tab === k ? 'on' : '', onclick: () => { S.verTab = k; renderPanel(); } }, n)); P.append(tabs);
  const prev = s => ({ onmouseenter: () => { S.preview = clone(s); S.previewName = 'Version'; requestRender(); updateHud(); }, onmouseleave: () => { S.preview = null; requestRender(); updateHud(); } });
  if (tab === 'named') {
    const name = el('input', { class: 'field', placeholder: 'Versionsname', 'aria-label': 'Versionsname', onkeydown: e => { e.stopPropagation(); if (e.key === 'Enter') create(); } });
    const create = () => { const n = name.value.trim() || `Version ${p.versions.length + 1}`; p.versions.unshift({ id: uid(), n, s: clone(p.settings), t: Date.now(), thumb: p.thumb }); persist(p); toast(`Version „${n}“ erstellt`); renderPanel(); };
    P.append(el('div', { style: 'display:flex;gap:8px;padding:0 18px 12px' }, name, el('button', { class: 'gbtn blue', onclick: create }, 'Version erstellen')));
    if (!p.versions.length) P.append(el('div', { class: 'hint' }, 'Benannte Versionen halten einen Bearbeitungsstand fest. Du kannst jederzeit zwischen ihnen wechseln, ohne den Verlauf zu verlieren.'));
    for (const v of p.versions) {
      const row = el('div', { class: 'plist', style: 'padding:0 12px' }, el('button', Object.assign({ class: 'pi', onclick: () => { p.settings = clone(v.s); S.preview = null; syncAll(); requestRender(); commit('Version: ' + v.n); } }, prev(v.s)), el('img', { src: v.thumb, alt: '', style: 'width:44px;height:34px;object-fit:cover;border-radius:2px' }), el('span', { style: 'display:flex;flex-direction:column' }, v.n, el('span', { class: 'dim', style: 'font-size:11px' }, fmtDate(v.t))), el('span', { class: 'x', role: 'button', title: 'Version löschen', html: icon('trash', 14), onclick: e => { e.stopPropagation(); p.versions = p.versions.filter(x => x !== v); persist(p); renderPanel(); } })));
      P.append(row);
    }
  } else {
    const h = hist(p), body = el('div', { class: 'plist', style: 'padding:0 12px' });
    for (let i = h.steps.length - 1; i >= 0; i--) { const st = h.steps[i]; body.append(el('button', Object.assign({ class: 'pi' + (i === h.idx ? ' on' : ''), style: i > h.idx ? 'opacity:.55;font-style:italic' : '', onclick: () => { S.preview = null; gotoHistory(i); } }, prev(st.s)), el('span', { class: 'grow' }, st.label), el('span', { class: 'dim', style: 'font-size:11px' }, new Date(st.t).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })))); }
    P.append(body);
  }
}

/* ---------- Info & Stichwörter ---------- */
function buildInfo(P) {
  const ps = selectedPhotos(), p = curPhoto();
  P.append(el('div', { class: 'ph' }, el('h2', { class: 'dup' }, 'Informationen')));
  if (!p) { P.append(el('div', { class: 'hint' }, 'Kein Foto ausgewählt.')); return; }
  const x = p.exif || {}, multi = ps.length > 1;
  const blk = el('div', { style: 'margin:0 18px 12px;background:#242424;border-radius:4px;padding:10px 12px;color:var(--tx-2);display:flex;flex-direction:column;gap:3px' });
  blk.append(el('span', {}, [x.Make, x.Model].filter(Boolean).join(' ') || 'Keine Kamerainformationen'), el('span', {}, x.LensModel || 'Keine Objektivinformationen'), el('span', { style: 'display:flex;align-items:center;gap:8px' }, `${p.w} × ${p.h} · ${fmtBytes(p.size)}`, el('span', { class: 'badge' }, (p.type.split('/')[1] || 'BILD').toUpperCase().replace('JPEG', 'JPG'))));
  const ex = el('div', { style: 'margin:0 18px 12px;background:#242424;border-radius:4px;padding:10px 12px;display:grid;grid-template-columns:auto 1fr;gap:3px 12px;color:var(--tx-3)' });
  const parts = { Brennweite: x.FocalLength ? de(x.FocalLength, 0) + ' mm' : '', Verschlusszeit: x.ExposureTime ? (x.ExposureTime >= 1 ? de(x.ExposureTime, 1) + ' s' : '1/' + Math.round(1 / x.ExposureTime) + ' s') : '', Blende: x.FNumber ? 'f/' + de(x.FNumber, 1) : '', ISO: x.ISO || '' };
  for (const [k, v] of Object.entries(parts)) ex.append(el('span', {}, k), el('span', { style: 'color:var(--tx-2)' }, String(v)));
  P.append(blk, ex);
  const body = el('div', { style: 'padding:0 18px' });
  const field = (label, key, area) => {
    const vals = new Set(ps.map(q => q[key] || '')), mixed = multi && vals.size > 1;
    const f = el(area ? 'textarea' : 'input', { class: 'field', placeholder: mixed ? '< Gemischt >' : '', 'aria-label': label });
    f.value = mixed ? '' : (p[key] || '');
    f.addEventListener('keydown', e => e.stopPropagation());
    f.addEventListener('change', () => { for (const q of ps) { q[key] = f.value; persist(q); } if (key === 'name') refreshAll(); toast(label + ' gespeichert'); });
    body.append(el('label', { class: 'flabel' }, label), f);
  };
  field('Titel', 'title'); field('Bildunterschrift', 'caption', true); field('Copyright', 'copyright');
  if (!multi) field('Dateiname', 'name');
  body.append(el('div', { class: 'flabel' }, 'Aufgenommen'), el('div', { style: 'color:var(--tx-2)' }, fmtDate(p.captured)));
  body.append(el('div', { class: 'flabel' }, 'Hinzugefügt'), el('div', { style: 'color:var(--tx-2)' }, fmtDate(p.added)));
  if (x.GPSLat && x.GPSLon) { const lat = (x.GPSLat[0] + x.GPSLat[1] / 60 + x.GPSLat[2] / 3600) * (x.GPSLatRef === 'S' ? -1 : 1), lon = (x.GPSLon[0] + x.GPSLon[1] / 60 + x.GPSLon[2] / 3600) * (x.GPSLonRef === 'W' ? -1 : 1); body.append(el('div', { class: 'flabel' }, 'Ort'), el('a', { href: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=14/${lat}/${lon}`, target: '_blank', rel: 'noopener', style: 'color:#6aa8ff' }, `${de(lat, 5)}, ${de(lon, 5)}`)); }
  if (p.note) body.append(el('div', { class: 'flabel' }, 'Hinweis'), el('div', { style: 'color:var(--tx-2)' }, p.note));
  P.append(body);
}
function buildKeywords(P) {
  const ps = selectedPhotos(), p = curPhoto();
  P.append(el('div', { class: 'ph' }, el('h2', { class: 'dup' }, 'Stichwörter')));
  if (!p) return;
  const inp = el('input', { class: 'field', placeholder: 'Stichwort hinzufügen', 'aria-label': 'Stichwort hinzufügen' });
  const add = v => { v = v.trim(); if (!v) return; for (const q of ps) { q.keywords = q.keywords || []; if (!q.keywords.includes(v)) q.keywords.push(v); persist(q); } renderPanel(); toast(`Stichwort „${v}“ hinzugefügt`); };
  inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') { inp.value.split(',').forEach(add); inp.value = ''; } });
  P.append(el('div', { style: 'padding:0 18px 12px' }, inp));
  const all = new Map(); for (const q of ps) for (const k of q.keywords || []) all.set(k, (all.get(k) || 0) + 1);
  const chips = el('div', { style: 'display:flex;flex-wrap:wrap;gap:6px;padding:0 18px 14px' });
  if (!all.size) chips.append(el('span', { class: 'dim' }, ps.length > 1 ? 'Die ausgewählten Fotos haben keine Stichwörter.' : 'Noch keine Stichwörter.'));
  for (const [k, n] of all) chips.append(el('span', { class: 'chip', style: 'display:inline-flex;align-items:center;gap:4px;background:#3a3a3a;border-radius:12px;padding:3px 6px 3px 10px' }, k + (ps.length > 1 && n < ps.length ? ` (${n})` : ''), el('button', { class: 'ib', style: 'width:18px;height:18px', 'aria-label': `Stichwort ${k} entfernen`, html: icon('close', 12), onclick: () => { for (const q of ps) { q.keywords = (q.keywords || []).filter(x => x !== k); persist(q); } renderPanel(); } })));
  P.append(chips);
  const sugg = new Map(); for (const q of S.photos) for (const k of q.keywords || []) if (!all.has(k)) sugg.set(k, (sugg.get(k) || 0) + 1);
  if (sugg.size) { P.append(el('div', { class: 'minihead', style: 'padding:0 18px' }, 'Vorschläge')); const sc = el('div', { style: 'display:flex;flex-wrap:wrap;gap:6px;padding:6px 18px' }); [...sugg].sort((a, b) => b[1] - a[1]).slice(0, 16).forEach(([k]) => sc.append(el('button', { class: 'gbtn', onclick: () => add(k) }, '+ ' + k))); P.append(sc); }
  P.append(el('div', { class: 'hint' }, 'Stichwörter sind in der Suche oben auffindbar. Mehrere Stichwörter mit Komma trennen.'));
}
