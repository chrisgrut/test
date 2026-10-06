/* ============================================================
   Werkzeuge: Zuschneiden & Geometrie, Entfernen, Maskieren
   ============================================================ */

/* ---------- Zuschneiden ---------- */
const ASPECTS = [['orig', 'Original'], ['free', 'Benutzerdefiniert'], ['1:1', '1 × 1'], ['5:4', '5 × 4'], ['4:3', '4 × 3'], ['3:2', '3 × 2'], ['7:5', '7 × 5'], ['16:10', '16 × 10'], ['16:9', '16 × 9'], ['2:1', '2 × 1'], ['11:8.5', '11 × 8,5']];
const OVERLAYS = [['thirds', 'Drittelregel'], ['grid', 'Raster'], ['diag', 'Diagonal'], ['tri', 'Dreieck'], ['golden', 'Goldener Schnitt'], ['spiral', 'Goldene Spirale'], ['none', 'Keine']];
const UPRIGHT = [['off', 'Aus'], ['auto', 'Auto'], ['level', 'Ausgleichen'], ['vertical', 'Vertikal'], ['full', 'Vollständig']];
S.cropOverlay = store.get('cropOverlay', 'thirds');
function cropEnter() { const s = cs(); S.cropEntry = geomOf(s); S.cropBase = clone(s.crop); }
function aspectLabel(s) { if (s.aspect === 'orig') { const f = frameSize(s, R.w || 3, R.h || 2); return 'Original'; } if (s.aspect === 'free') return 'Benutzerdefiniert'; const [a, b] = s.aspect.split(':').map(Number); const hit = ASPECTS.find(([k]) => { const [x, y] = k.split(':').map(Number); return (x === a && y === b) || (x === b && y === a); }); return hit ? hit[1].replace(/(\S+) × (\S+)/, a >= b ? '$1 × $2' : '$2 × $1') : de(a, 1) + ' × ' + de(b, 1); }
function cropPortrait() { const s = cs(), f = frameSize(s, R.w, R.h); return s.crop.w * f.w < s.crop.h * f.h; }
function setAspect(k) {
  const s = cs(); if (k === 'orig' || k === 'free') s.aspect = k;
  else { const [a, b] = k.split(':').map(Number); s.aspect = cropPortrait() ? `${Math.min(a, b)}:${Math.max(a, b)}` : `${Math.max(a, b)}:${Math.min(a, b)}`; }
  applyAspect(); commit('Seitenverhältnis ' + aspectLabel(s));
}
function applyAspect() {
  const s = cs(), r = aspectRatio(s, R.w, R.h); if (!r) { syncAll(); requestRender(); return; }
  const f = frameSize(s, R.w, R.h), k = f.w / (r * f.h); let w = 1, h = k; if (h > 1) { h = 1; w = 1 / k; }
  S.cropBase = { x: (1 - w) / 2, y: (1 - h) / 2, w, h }; s.crop = shrinkToFit(S.cropBase, s, R.w, R.h); syncAll(); requestRender();
}
function swapAspect() {
  const s = cs(), f = frameSize(s, R.w, R.h);
  if (s.aspect === 'free') { const c = s.crop, pw = c.w * f.w, ph = c.h * f.h, cx = c.x + c.w / 2, cy = c.y + c.h / 2; let w = ph / f.w, h = pw / f.h; const k = Math.min(1, 1 / w, 1 / h); w *= k; h *= k; S.cropBase = { x: clamp(cx - w / 2, 0, 1 - w), y: clamp(cy - h / 2, 0, 1 - h), w, h }; s.crop = shrinkToFit(S.cropBase, s, R.w, R.h); }
  else { if (s.aspect === 'orig') s.aspect = `${f.h}:${f.w}`; else { const [a, b] = s.aspect.split(':'); s.aspect = `${b}:${a}`; } applyAspect(); }
  syncAll(); requestRender(); commit('Ausrichtung des Seitenverhältnisses gedreht');
}
function geoChanged(label) { const s = cs(); if (s.constrain) s.crop = shrinkToFit(S.cropBase || { x: 0, y: 0, w: 1, h: 1 }, s, R.w, R.h); syncAll(); requestRender(); if (label) commit(label); }
function rotate90(d) { const s = cs(); s.rot = (s.rot + d + 4) % 4; s.crop = { x: 0, y: 0, w: 1, h: 1 }; S.cropBase = clone(s.crop); if (s.aspect !== 'free' && s.aspect !== 'orig') { const [a, b] = s.aspect.split(':'); s.aspect = `${b}:${a}`; } applyAspect(); commit(d > 0 ? 'Nach rechts drehen' : 'Nach links drehen'); }
function flip(axis) { const s = cs(); if (axis === 'h') { s.flipH = !s.flipH; } else { s.flipV = !s.flipV; } requestRender(); commit(axis === 'h' ? 'Horizontal spiegeln' : 'Vertikal spiegeln'); }
function resetCrop() { const s = cs(); Object.assign(s, { crop: { x: 0, y: 0, w: 1, h: 1 }, angle: 0, rot: 0, flipH: false, flipV: false, aspect: 'orig', upright: 'off', geoV: 0, geoH: 0, geoRotate: 0, geoAspect: 0, geoScale: 100, geoX: 0, geoY: 0, geoDist: 0 }); S.cropBase = clone(s.crop); syncAll(); requestRender(); commit('Zuschneiden zurückgesetzt'); }
function autoStraighten() { const s = cs(); progress('Bild wird ausgerichtet …', .5); setTimeout(() => { const r = uprightAnalyze(Object.assign(clone(s), { angle: 0 }), 'level'); progress(null); if (!r) { toast('Keine geraden Linien gefunden'); return; } s.angle = clamp(r.geoRotate, -45, 45); geoChanged('Begradigen: Auto'); }, 30); }
function setUpright(mode) {
  const s = cs();
  if (mode === 'off') { Object.assign(s, { upright: 'off', geoV: 0, geoH: 0, geoRotate: 0 }); geoChanged('Upright: Aus'); return; }
  progress('Linien werden analysiert …', .5);
  setTimeout(() => { const r = uprightAnalyze(s, mode); progress(null); if (!r) { toast('Keine ausreichend geraden Linien gefunden'); return; } Object.assign(s, r, { upright: mode, angle: 0 }); S.cropBase = { x: 0, y: 0, w: 1, h: 1 }; geoChanged('Upright: ' + UPRIGHT.find(u => u[0] === mode)[1]); toast('Upright angewendet'); }, 30);
}
function buildCrop(P) {
  const s = cs(); if (!S.cropEntry) cropEnter();
  P.append(el('div', { class: 'ph' }, el('h2', { class: 'dup' }, 'Zuschneiden'), el('span', { class: 'grow' }), el('button', { class: 'ib', title: 'Zurücksetzen', 'aria-label': 'Zuschneiden zurücksetzen', html: icon('reset', 17), onclick: resetCrop })));
  const b = el('div', { class: 'sb' });
  const asp = el('span'), aspdd = el('button', { class: 'dd sm' }, asp, el('span', { html: icon('chevDown', 14) }));
  aspdd.onclick = () => menu(aspdd, ASPECTS.map(([k, n]) => ({ label: k === 'orig' ? `Original` : n, checked: (k === 'orig' || k === 'free') ? cs().aspect === k : aspectLabel(cs()) === n || aspectLabel(cs()) === n.split(' × ').reverse().join(' × '), fn: () => setAspect(k) })));
  const swap = el('button', { class: 'ib', title: 'Seitenverhältnis drehen (X)', 'aria-label': 'Seitenverhältnis drehen', html: icon('rotR', 16), onclick: swapAspect });
  const lock = el('button', { class: 'ib', title: 'Seitenverhältnis sperren', 'aria-label': 'Seitenverhältnis sperren' });
  lock.onclick = () => { const s2 = cs(); if (s2.aspect === 'free') { const f = frameSize(s2, R.w, R.h); s2.aspect = `${(s2.crop.w * f.w).toFixed(0)}:${(s2.crop.h * f.h).toFixed(0)}`; } else s2.aspect = 'free'; syncAll(); commit(s2.aspect === 'free' ? 'Seitenverhältnis entsperrt' : 'Seitenverhältnis gesperrt'); };
  b.append(sync(el('div', { style: 'display:flex;align-items:center;gap:6px;padding:2px 0 6px' }, el('span', { class: 'dim' }, 'Seitenverh.'), aspdd, el('span', { class: 'grow' }), swap, lock), () => { asp.textContent = aspectLabel(cs()); lock.innerHTML = icon(cs().aspect === 'free' ? 'unlock' : 'lock', 16); lock.classList.toggle('on', cs().aspect !== 'free'); }));
  const ang = slider('Begradigen', -45, 45, { key: 'angle', step: .05, dec: 2, onLive: () => { const s2 = cs(); s2.crop = shrinkToFit(S.cropBase, s2, R.w, R.h); S.rotating = true; clearTimeout(S.rotT); S.rotT = setTimeout(() => { S.rotating = false; requestRender(); }, 600); } });
  ang.querySelector('.top').insertBefore(el('button', { class: 'gbtn', style: 'padding:0 6px;min-height:20px;font-size:11px;margin-left:auto', onclick: autoStraighten }, 'AUTO'), ang.querySelector('.val'));
  b.append(ang);
  const ov = el('span'), ovdd = el('button', { class: 'dd sm' }, ov, el('span', { html: icon('chevDown', 14) }));
  ovdd.onclick = () => menu(ovdd, OVERLAYS.map(([k, n]) => ({ label: n, checked: S.cropOverlay === k, fn: () => { S.cropOverlay = k; store.set('cropOverlay', k); syncAll(); requestRender(); } })));
  b.append(sync(el('div', { style: 'display:flex;align-items:center;gap:6px;padding:8px 0' }, el('span', { class: 'dim' }, 'Zuschneideüberlagerung'), ovdd), () => { ov.textContent = OVERLAYS.find(o => o[0] === S.cropOverlay)[1]; }));
  b.append(el('div', { class: 'minihead' }, 'Drehen und spiegeln'), el('div', { style: 'display:flex;gap:6px;padding:4px 0 8px' },
    el('button', { class: 'ib', title: 'Nach rechts drehen (Strg+])', 'aria-label': 'Nach rechts drehen', html: icon('rotR', 20), onclick: () => rotate90(1) }),
    el('button', { class: 'ib', title: 'Nach links drehen (Strg+[)', 'aria-label': 'Nach links drehen', html: icon('rotL', 20), onclick: () => rotate90(-1) }),
    el('button', { class: 'ib', title: 'Horizontal spiegeln', 'aria-label': 'Horizontal spiegeln', html: icon('flipH', 20), onclick: () => flip('h') }),
    el('button', { class: 'ib', title: 'Vertikal spiegeln', 'aria-label': 'Vertikal spiegeln', html: icon('flipV', 20), onclick: () => flip('v') })));
  P.append(b);
  sec('geometry', 'Geometrie', g => {
    const up = el('span'), updd = el('button', { class: 'dd sm' }, up, el('span', { html: icon('chevDown', 14) }));
    updd.onclick = () => menu(updd, UPRIGHT.map(([k, n]) => ({ label: n, checked: cs().upright === k, fn: () => setUpright(k) })));
    g.append(sync(el('div', { style: 'display:flex;align-items:center;gap:6px;padding:2px 0 8px' }, el('span', { class: 'dim' }, 'Upright'), updd, el('span', { class: 'grow' }), el('button', { class: 'ib', title: 'Auto-Upright', 'aria-label': 'Auto-Upright', html: icon('sparkle', 18), onclick: () => setUpright('auto') })), () => { up.textContent = UPRIGHT.find(u => u[0] === cs().upright)[1]; }));
    const t = el('div', { class: 'subbox' }), tb = el('div', { class: 'sbb' });
    t.append(el('div', { class: 'sbh' }, el('span', { class: 'bx', html: icon('grid2', 15) }), 'Transformieren'), tb);
    const gl = (lbl, key, min, max, def = 0) => slider(lbl, min, max, { key, def, signed: min < 0, onLive: () => geoChanged(), hist: 'Transformieren ' + lbl });
    tb.append(gl('Verzerrung', 'geoDist', -100, 100), gl('Vertikal', 'geoV', -100, 100), gl('Horizontal', 'geoH', -100, 100), gl('Drehen', 'geoRotate', -10, 10), gl('Aspekt', 'geoAspect', -100, 100), gl('Skalieren', 'geoScale', 50, 150, 100), gl('X-Verschiebung', 'geoX', -100, 100), gl('Y-Verschiebung', 'geoY', -100, 100));
    tb.append(chk('Zuschnitt beschränken', () => cs().constrain, v => { cs().constrain = v; if (v) geoChanged(); }));
    g.append(t);
  }, P);
  P.append(el('div', { class: 'hint' }, el('span', { html: icon('info', 14) }), 'Ecken und Kanten ziehen zum Zuschneiden, außerhalb des Rahmens ziehen zum Drehen. Enter übernimmt, Esc verwirft.'));
}
function cropCancel() { if (!S.cropEntry) return; Object.assign(cs(), clone(S.cropEntry)); S.cropBase = clone(cs().crop); syncAll(); requestRender(); commit('Zuschneiden verworfen'); }
function dragCrop(hd, R0, dx, dy, ratio, f) {
  if (hd === 'move') return { x: clamp(R0.x + dx, 0, 1 - R0.w), y: clamp(R0.y + dy, 0, 1 - R0.h), w: R0.w, h: R0.h };
  let x = R0.x, y = R0.y, x2 = R0.x + R0.w, y2 = R0.y + R0.h; const m = .02;
  if (hd.includes('w')) x = Math.min(x + dx, x2 - m); if (hd.includes('e')) x2 = Math.max(x2 + dx, x + m);
  if (hd.includes('n')) y = Math.min(y + dy, y2 - m); if (hd.includes('s')) y2 = Math.max(y2 + dy, y + m);
  x = Math.max(0, x); y = Math.max(0, y); x2 = Math.min(1, x2); y2 = Math.min(1, y2);
  let r = { x, y, w: x2 - x, h: y2 - y };
  if (ratio) {
    const k = f.w / (ratio * f.h);
    if (hd.length === 2) {
      const ax = hd.includes('w') ? R0.x + R0.w : R0.x, ay = hd.includes('n') ? R0.y + R0.h : R0.y;
      let w = r.w, h = w * k; if (r.h > h) { h = r.h; w = h / k; }
      const maxW = hd.includes('w') ? ax : 1 - ax, maxH = hd.includes('n') ? ay : 1 - ay;
      if (w > maxW) { w = maxW; h = w * k; } if (h > maxH) { h = maxH; w = h / k; }
      r = { x: hd.includes('w') ? ax - w : ax, y: hd.includes('n') ? ay - h : ay, w, h };
    } else if (hd === 'n' || hd === 's') { const cx = R0.x + R0.w / 2; let h = r.h, w = h / k; w = Math.min(w, 2 * Math.min(cx, 1 - cx)); h = w * k; const ay = hd === 'n' ? R0.y + R0.h : R0.y; r = { x: cx - w / 2, y: hd === 'n' ? ay - h : ay, w, h }; }
    else { const cy = R0.y + R0.h / 2; let w = r.w, h = w * k; h = Math.min(h, 2 * Math.min(cy, 1 - cy)); w = h / k; const ax = hd === 'w' ? R0.x + R0.w : R0.x; r = { x: hd === 'w' ? ax - w : ax, y: cy - h / 2, w, h }; }
  }
  return r;
}
function fitAlong(R0, r, s) {
  if (!s.constrain || rectInside(r, s, R.w, R.h) || !rectInside(R0, s, R.w, R.h)) return r;
  const lp = t => ({ x: R0.x + (r.x - R0.x) * t, y: R0.y + (r.y - R0.y) * t, w: R0.w + (r.w - R0.w) * t, h: R0.h + (r.h - R0.h) * t });
  let lo = 0, hi = 1; for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; if (rectInside(lp(m), s, R.w, R.h)) lo = m; else hi = m; }
  return lp(lo);
}
function hitCrop(px, py, touch) {
  const s = cs(), [x0, y0] = frameToScreen(s.crop.x, s.crop.y), [x1, y1] = frameToScreen(s.crop.x + s.crop.w, s.crop.y + s.crop.h), tol = touch ? 24 : 12;
  const nL = Math.abs(px - x0) < tol, nR = Math.abs(px - x1) < tol, nT = Math.abs(py - y0) < tol, nB = Math.abs(py - y1) < tol, inX = px > x0 - tol && px < x1 + tol, inY = py > y0 - tol && py < y1 + tol;
  if (nT && nL) return 'nw'; if (nT && nR) return 'ne'; if (nB && nL) return 'sw'; if (nB && nR) return 'se';
  if (nT && inX) return 'n'; if (nB && inX) return 's'; if (nL && inY) return 'w'; if (nR && inY) return 'e';
  if (px > x0 && px < x1 && py > y0 && py < y1) return 'move'; return 'rotate';
}
const CURSORS = { nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize', n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize', move: 'move', rotate: 'grab' };
let cropDrag = null;
TOOLS.crop = {
  down(e, p) {
    const s = cs(), hd = hitCrop(p.x, p.y, e.pointerType === 'touch'), [fx, fy] = screenToFrame(p.x, p.y), c = s.crop, [cx, cy] = frameToScreen(c.x + c.w / 2, c.y + c.h / 2);
    cropDrag = { hd, R0: clone(c), fx, fy, ang0: s.angle, a0: Math.atan2(p.y - cy, p.x - cx), cx, cy }; if (hd === 'rotate') S.rotating = true; S.cropDragging = true; requestRender(); return true;
  },
  move(e, p) {
    const d = cropDrag; if (!d) return; const s = cs();
    if (d.hd === 'rotate') { let a = (Math.atan2(p.y - d.cy, p.x - d.cx) - d.a0) * 180 / Math.PI; if (a > 180) a -= 360; if (a < -180) a += 360; s.angle = clamp(Math.round((d.ang0 + a) * 20) / 20, -45, 45); s.crop = shrinkToFit(S.cropBase, s, R.w, R.h); }
    else { const [fx, fy] = screenToFrame(p.x, p.y), f = frameSize(s, R.w, R.h); s.crop = fitAlong(d.R0, dragCrop(d.hd, d.R0, fx - d.fx, fy - d.fy, aspectRatio(s, R.w, R.h), f), s); S.cropBase = clone(s.crop); }
    syncSliders(); requestRender();
  },
  up() { if (!cropDrag) return; const d = cropDrag; cropDrag = null; S.rotating = false; S.cropDragging = false; requestRender(); commit(d.hd === 'rotate' ? `Begradigen ${signed(cs().angle, 2)}°` : 'Zuschneiden'); },
  hover(e, p) { $('#stage').style.cursor = CURSORS[hitCrop(p.x, p.y, e.pointerType === 'touch')]; },
  draw(x, L) {
    const s = cs(), [x0, y0] = frameToScreen(s.crop.x, s.crop.y), [x1, y1] = frameToScreen(s.crop.x + s.crop.w, s.crop.y + s.crop.h), w = x1 - x0, h = y1 - y0;
    x.fillStyle = 'rgba(0,0,0,.6)'; x.beginPath(); x.rect(0, 0, L.sw, L.sh); x.rect(x0, y0, w, h); x.fill('evenodd');
    x.save(); x.beginPath(); x.rect(x0, y0, w, h); x.clip(); x.strokeStyle = 'rgba(255,255,255,.45)'; x.lineWidth = 1; x.beginPath();
    const ovl = S.rotating ? 'fine' : S.cropOverlay, ln = (a, b, c, d) => { x.moveTo(a, b); x.lineTo(c, d); };
    if (ovl === 'thirds' || ovl === 'fine' || ovl === 'grid') { const n = ovl === 'thirds' ? 3 : ovl === 'grid' ? 6 : 10; for (let i = 1; i < n; i++) { ln(x0 + w * i / n, y0, x0 + w * i / n, y1); ln(x0, y0 + h * i / n, x1, y0 + h * i / n); } }
    else if (ovl === 'diag') { const m = Math.min(w, h); ln(x0, y0, x0 + m, y0 + m); ln(x1, y0, x1 - m, y0 + m); ln(x0, y1, x0 + m, y1 - m); ln(x1, y1, x1 - m, y1 - m); }
    else if (ovl === 'tri') { ln(x0, y1, x1, y0); const t = (w * w) / (w * w + h * h); ln(x0, y0, x0 + w * t, y0 + h * t); ln(x1, y1, x1 - w * t, y1 - h * t); }
    else if (ovl === 'golden') { const g = .382; for (const f of [g, 1 - g]) { ln(x0 + w * f, y0, x0 + w * f, y1); ln(x0, y0 + h * f, x1, y0 + h * f); } }
    else if (ovl === 'spiral') { let rx = x0, ry = y0, rw = w, rh = h; for (let i = 0; i < 7; i++) { const sq = Math.min(rw, rh); const k = i % 4; if (k === 0) { x.moveTo(rx + sq, ry + sq); x.arc(rx + sq, ry + sq, sq, Math.PI, Math.PI * 1.5); rx += sq; rw -= sq; } else if (k === 1) { x.moveTo(rx, ry + sq); x.arc(rx, ry + sq, sq, Math.PI * 1.5, 0); ry += sq; rh -= sq; } else if (k === 2) { x.moveTo(rx + rw - sq, ry); x.arc(rx + rw - sq, ry, sq, 0, Math.PI * .5); rw -= sq; } else { x.moveTo(rx + sq, ry + rh - sq); x.arc(rx + sq, ry + rh - sq, sq, Math.PI * .5, Math.PI); rh -= sq; } } }
    x.stroke(); x.restore();
    x.strokeStyle = '#fff'; x.lineWidth = 1; x.strokeRect(x0 + .5, y0 + .5, w - 1, h - 1);
    const k = 18, t = 3; x.fillStyle = '#fff';
    for (const [cx, cy, sx, sy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) { x.fillRect(sx > 0 ? cx - 1 : cx - t + 1, sy > 0 ? cy - 1 : cy - k + 1, t, k); x.fillRect(sx > 0 ? cx - 1 : cx - k + 1, sy > 0 ? cy - 1 : cy - t + 1, k, t); }
    for (const [cx, cy, hz] of [[x0 + w / 2, y0, 1], [x0 + w / 2, y1, 1], [x0, y0 + h / 2, 0], [x1, y0 + h / 2, 0]]) hz ? x.fillRect(cx - 12, cy - 1.5, 24, 3) : x.fillRect(cx - 1.5, cy - 12, 3, 24);
    if (S.cropDragging) { const p = curPhoto(), f = frameSize(s, R.w, R.h), kk = p.w / R.w, txt = `${Math.round(s.crop.w * f.w * kk)} × ${Math.round(s.crop.h * f.h * kk)}`; x.font = '12px ' + getComputedStyle(document.body).fontFamily; const tw = x.measureText(txt).width + 14; x.fillStyle = 'rgba(20,20,20,.85)'; x.fillRect(x0 + w / 2 - tw / 2, y0 + h / 2 - 12, tw, 24); x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, x0 + w / 2, y0 + h / 2); }
  }
};

/* ---------- Entfernen: Entfernen, Reparieren, Klonen, Rote Augen ---------- */
const RM_TOOLS = [['remove', 'eraser', 'Entfernen'], ['heal', 'heal', 'Reparieren'], ['clone', 'stamp', 'Klonen'], '|', ['redeye', 'redeye', 'Rote Augen']];
function spotList() { const s = cs(); return [...s.spots.map((p, i) => ({ kind: 'spots', i, p })), ...s.redeye.map((p, i) => ({ kind: 'redeye', i, p }))]; }
function selSpot() { const h = S.heal.sel; if (!h) return null; const a = cs()[h.kind]; return a && a[h.i] ? a[h.i] : null; }
function srcPx() { const f = frameSize(cs(), R.w, R.h); return frameScale() * R.h / f.h; } // Bildschirm-px pro Quellhöhe
function buildRemove(P) {
  P.append(el('div', { class: 'ph' }, el('h2', { class: 'dup' }, 'Entfernen')));
  const row = el('div', { class: 'toolrow' });
  for (const t of RM_TOOLS) { if (t === '|') { row.append(el('span', { class: 'bar' })); continue; } const [k, ic, n] = t; row.append(el('button', { class: 'tbtn' + (S.heal.mode === k ? ' on' : ''), title: n, 'aria-label': n, html: icon(ic, 20), onclick: () => { S.heal.mode = k; S.heal.sel = null; renderPanel(); requestRender(); } })); }
  P.append(row);
  const b = el('div', { class: 'sb' }), sp = selSpot(), red = S.heal.mode === 'redeye';
  const prop = (key, def) => ({ get: () => { const s2 = selSpot(); return s2 ? (key === 'size' ? Math.round(s2.r * 200 * 10) / 10 : s2[key] ?? def) : S.heal[key] ?? def; }, set: v => { const s2 = selSpot(); if (s2) { if (key === 'size') s2.r = v / 200; else s2[key] = v; } else S.heal[key] = v; }, noCommit: !sp, signed: false });
  b.append(slider(red ? 'Pupillengröße' : 'Größe', .5, 40, Object.assign({ step: .1, dec: 1, def: 4, hist: 'Größe' }, prop('size', 4))));
  if (!red) { b.append(slider('Weiche Kante', 0, 100, Object.assign({ def: 50, hist: 'Weiche Kante' }, prop('feather', 50))), slider('Deckkraft', 1, 100, Object.assign({ def: 100, hist: 'Deckkraft' }, prop('opacity', 100)))); }
  else b.append(slider('Abdunkeln', 0, 100, Object.assign({ def: 60, hist: 'Rote Augen abdunkeln' }, prop('opacity', 60))));
  b.append(el('div', { style: 'height:6px' }));
  b.append(el('label', { class: 'chk' }, el('input', { type: 'checkbox', checked: S.heal.showAll !== false, onchange: e => { S.heal.showAll = e.target.checked; requestRender(); } }), 'Überlagerung immer anzeigen'));
  const vis = el('input', { type: 'checkbox', checked: !!S.heal.visualize, onchange: e => { S.heal.visualize = e.target.checked; renderPanel(); requestRender(); } });
  b.append(el('label', { class: 'chk', title: 'Taste A' }, vis, 'Bereiche anzeigen (Staub und Flecken)'));
  if (S.heal.visualize) b.append(slider('Schwellenwert', 1, 100, { get: () => S.heal.visT ?? 40, set: v => S.heal.visT = v, def: 40, signed: false, noCommit: true }));
  if (sp) b.append(el('div', { style: 'display:flex;gap:8px;margin-top:10px;flex-wrap:wrap' }, el('button', { class: 'gbtn', onclick: deleteSpot }, 'Ausgewählte Stelle löschen'), el('button', { class: 'gbtn', onclick: () => { S.heal.sel = null; renderPanel(); requestRender(); } }, 'Auswahl aufheben')));
  P.append(b);
  const n = cs().spots.length + cs().redeye.length;
  P.append(el('div', { class: 'hint' }, el('span', { html: icon('info', 14) }), red ? 'Auf die Mitte eines Auges klicken. Ziehen legt die Größe fest.' : S.heal.mode === 'remove' ? 'Auf störende Stellen klicken oder ziehen. Die passende Quelle wird automatisch gesucht. Stellen lassen sich verschieben, die Quelle (gestrichelt) ebenso.' : 'Auf die Stelle klicken. Die Quelle (gestrichelt) wird automatisch gewählt und lässt sich verschieben.'));
  if (n) P.append(el('div', { class: 'btnrow' }, el('span', { class: 'dim' }, `${n} Korrektur${n > 1 ? 'en' : ''}`), el('span', { class: 'grow' }), el('button', { class: 'gbtn', onclick: () => { cs().spots = []; cs().redeye = []; S.heal.sel = null; renderPanel(); requestRender(); commit('Alle Korrekturen entfernt'); } }, 'Alle entfernen')));
}
function deleteSpot() { const h = S.heal.sel; if (!h) return; cs()[h.kind].splice(h.i, 1); S.heal.sel = null; renderPanel(); requestRender(); commit('Korrektur gelöscht'); }
function spotScreen(p, src) { const s = cs(), [fx, fy] = srcToFrame(src ? p.sx : p.x, src ? p.sy : p.y, s, R.w, R.h); return frameToScreen(fx, fy); }
function hitSpot(px, py) {
  const k = srcPx(); let best = null;
  for (const it of spotList()) { const r = it.p.r * k, [x, y] = spotScreen(it.p); if (Math.hypot(px - x, py - y) < Math.max(r, 8)) best = { ...it, part: 'dst' }; if (it.kind === 'spots') { const [sx, sy] = spotScreen(it.p, true); if (Math.hypot(px - sx, py - sy) < Math.max(r, 8)) best = { ...it, part: 'src' }; } }
  return best;
}
let healDrag = null;
TOOLS.remove = {
  down(e, p) {
    if (!insideMain(p.x, p.y)) return true;
    const s = cs(), [fx, fy] = screenToFrame(p.x, p.y), [sx, sy] = frameToSrc(fx, fy, s, R.w, R.h); if (sx < 0 || sy < 0 || sx > 1 || sy > 1) return true;
    const hit = hitSpot(p.x, p.y);
    if (hit) { S.heal.sel = { kind: hit.kind, i: hit.i }; healDrag = { mode: 'move', hit, sx, sy, p0: clone(hit.p) }; renderPanel(); requestRender(); return true; }
    const mode = S.heal.mode, r = (S.heal.size ?? 4) / 200;
    if (mode === 'redeye') { s.redeye.push({ x: sx, y: sy, r, feather: 30, opacity: S.heal.opacity ?? 60 }); S.heal.sel = { kind: 'redeye', i: s.redeye.length - 1 }; }
    else { s.spots.push({ x: sx, y: sy, sx, sy, r, feather: S.heal.feather ?? 50, opacity: S.heal.opacity ?? 100, mode: mode === 'clone' ? 'clone' : 'heal', auto: true }); S.heal.sel = { kind: 'spots', i: s.spots.length - 1 }; }
    healDrag = { mode: 'create', sx, sy, x0: p.x, y0: p.y }; requestRender(); return true;
  },
  move(e, p) {
    const d = healDrag; if (!d) return; const s = cs(), sp = selSpot(); if (!sp) return;
    const [fx, fy] = screenToFrame(p.x, p.y), [sx, sy] = frameToSrc(fx, fy, s, R.w, R.h);
    if (d.mode === 'create') { const dist = Math.hypot(p.x - d.x0, p.y - d.y0) / srcPx(); if (dist > .01) sp.r = clamp(dist, .003, .2); }
    else if (d.hit.part === 'src') { sp.sx = d.p0.sx + (sx - d.sx); sp.sy = d.p0.sy + (sy - d.sy); sp.auto = false; }
    else { sp.x = d.p0.x + (sx - d.sx); sp.y = d.p0.y + (sy - d.sy); if (sp.sx != null && d.hit.kind === 'spots') { sp.sx = d.p0.sx + (sx - d.sx); sp.sy = d.p0.sy + (sy - d.sy); } }
    requestRender();
  },
  up() {
    const d = healDrag; healDrag = null; if (!d) return; const sp = selSpot();
    if (d.mode === 'create' && sp && S.heal.sel.kind === 'spots') { const [cx, cy] = findHealSource(sp.x, sp.y, sp.r); sp.sx = cx; sp.sy = cy; }
    renderPanel(); requestRender();
    commit(d.mode === 'create' ? ({ remove: 'Entfernen', heal: 'Reparieren', clone: 'Klonen', redeye: 'Rote Augen' }[S.heal.mode]) : 'Korrektur verschoben');
  },
  hover(e, p) { S.heal.hover = p; $('#stage').style.cursor = hitSpot(p.x, p.y) ? 'move' : 'none'; drawOverlay(); },
  leave() { S.heal.hover = null; drawOverlay(); },
  wheel(e) { if (!e.altKey && !e.shiftKey) return false; S.heal.size = clamp((S.heal.size ?? 4) * Math.exp(-e.deltaY * .002), .5, 40); renderPanel(); drawOverlay(); return true; },
  draw(x, L) {
    const k = srcPx(), sel = selSpot(), all = S.heal.showAll !== false;
    for (const it of spotList()) {
      const on = sel === it.p; if (!all && !on) continue;
      const r = it.p.r * k, [dx, dy] = spotScreen(it.p);
      x.lineWidth = on ? 2 : 1.2; x.strokeStyle = on ? '#fff' : 'rgba(255,255,255,.75)'; x.shadowColor = 'rgba(0,0,0,.8)'; x.shadowBlur = 3;
      x.beginPath(); x.arc(dx, dy, r, 0, 7); x.stroke();
      if (it.kind === 'spots') { const [sx, sy] = spotScreen(it.p, true); x.setLineDash([4, 3]); x.beginPath(); x.arc(sx, sy, r, 0, 7); x.stroke(); x.setLineDash([]); if (on) { const a = Math.atan2(dy - sy, dx - sx), d = Math.hypot(dx - sx, dy - sy); if (d > 2 * r) { x.beginPath(); x.moveTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r); const ex = dx - Math.cos(a) * r, ey = dy - Math.sin(a) * r; x.lineTo(ex, ey); x.lineTo(ex - Math.cos(a - .5) * 8, ey - Math.sin(a - .5) * 8); x.moveTo(ex, ey); x.lineTo(ex - Math.cos(a + .5) * 8, ey - Math.sin(a + .5) * 8); x.stroke(); } } }
      else { x.beginPath(); x.moveTo(dx - 4, dy); x.lineTo(dx + 4, dy); x.moveTo(dx, dy - 4); x.lineTo(dx, dy + 4); x.stroke(); }
      x.shadowBlur = 0;
    }
    const h = S.heal.hover; if (h && insideMain(h.x, h.y) && !healDrag && !hitSpot(h.x, h.y)) { const r = (S.heal.size ?? 4) / 200 * k; x.strokeStyle = '#fff'; x.lineWidth = 1.2; x.shadowColor = 'rgba(0,0,0,.9)'; x.shadowBlur = 3; x.beginPath(); x.arc(h.x, h.y, r, 0, 7); x.stroke(); if (S.heal.mode !== 'redeye') { x.globalAlpha = .6; x.beginPath(); x.arc(h.x, h.y, r * (1 - (S.heal.feather ?? 50) / 200), 0, 7); x.stroke(); x.globalAlpha = 1; } x.shadowBlur = 0; }
  }
};

/* ---------- Maskieren ---------- */
const COMP_TYPES = { brush: ['brush', 'Pinsel'], linear: ['linear', 'Linearer Verlauf'], radial: ['radial', 'Radialer Verlauf'], color: ['colorRange', 'Farbbereich'], luminance: ['luminance', 'Luminanzbereich'], sky: ['sky', 'Himmel'] };
const MASK_PRESETS = [['Aufhellen', { exposure: .5, shadows: 15 }], ['Abdunkeln', { exposure: -.5, highlights: -15 }], ['Wärmer', { temp: 25 }], ['Kühler', { temp: -25 }], ['Mehr Kontrast', { contrast: 30, clarity: 15 }], ['Himmel abdunkeln', { exposure: -.6, highlights: -40, saturation: 15, dehaze: 15 }], ['Haut weichzeichnen', { texture: -40, clarity: -25 }], ['Iris verbessern', { exposure: .3, clarity: 25, saturation: 20 }], ['Weichzeichnen', { clarity: -60, texture: -60, sharpness: -60 }]];
const amask = () => (cs().masks || []).find(m => m.id === S.mask.active) || null;
const acomp = () => { const m = amask(); return m ? m.comps.find(c => c.id === S.mask.comp) || m.comps[m.comps.length - 1] : null; };
function maskOverlayIndex() {
  if (S.panel !== 'mask' || S.view !== 'detail') return -1;
  const id = S.mask.hoverId || (S.mask.overlay ? S.mask.active : null); if (!id) return -1;
  return (cs().masks || []).filter(m => m.visible !== false && m.comps && m.comps.length).slice(0, 12).findIndex(m => m.id === id);
}
function newComp(type, op = 'add') {
  const id = uid(), c = { id, type, op, invert: false };
  if (type === 'brush') Object.assign(c, { dabs: [], rev: 0 });
  if (type === 'linear') Object.assign(c, { ax: .5, ay: .15, bx: .5, by: .55, placing: true });
  if (type === 'radial') Object.assign(c, { cx: .5, cy: .5, rx: .2, ry: .15, angle: 0, feather: 50, invert: false, placing: true });
  if (type === 'color') Object.assign(c, { samples: [], refine: 50, placing: true });
  if (type === 'luminance') Object.assign(c, { lo: 50, hi: 100, smooth: 30 });
  return c;
}
function createMask(type) {
  const s = cs(); if (s.masks.length >= 12) { toast('Maximal 12 Masken pro Foto.'); return; }
  const n = s.masks.reduce((m, x) => Math.max(m, +(/Maske (\d+)/.exec(x.name) || [0, 0])[1]), 0) + 1;
  const c = newComp(type), m = { id: uid(), name: 'Maske ' + n, visible: true, invert: false, amount: 100, adj: {}, comps: [c] };
  s.masks.push(m); S.mask.active = m.id; S.mask.comp = c.id; S.mask.creating = null;
  if (type === 'sky' || type === 'luminance') commit(`${COMP_TYPES[type][1]}: Maske erstellt`);
  renderPanel(); renderMaskList(); requestRender();
  if (type === 'color') startColorPick(c);
}
function addComp(type, op) {
  const m = amask(); if (!m) return createMask(type); if (m.comps.length >= 16) { toast('Maximal 16 Komponenten pro Maske.'); return; }
  const c = newComp(type, op); m.comps.push(c); S.mask.comp = c.id; S.mask.creating = null;
  if (type === 'sky' || type === 'luminance') commit(`${COMP_TYPES[type][1]} ${op === 'sub' ? 'subtrahiert' : op === 'int' ? 'geschnitten' : 'hinzugefügt'}`);
  renderPanel(); renderMaskList(); requestRender(); if (type === 'color') startColorPick(c);
}
function startColorPick(c, add) {
  startPick('color', add ? 'Weitere Farbe anklicken' : 'Farbe im Bild anklicken (Umschalt+Klick: zweite Farbe)', (fx, fy, sx, sy) => {
    if (sx < 0 || sy < 0 || sx > 1 || sy > 1) return; const t = [0, 0, 0], acc = [0, 0, 0];
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { srcRGB(sx + i / SRC.w, sy + j / SRC.h, t); acc[0] += t[0] / 9; acc[1] += t[1] / 9; acc[2] += t[2] / 9; }
    const shift = S.lastPointerShift; if ((add || shift) && c.samples.length) c.samples[1] = acc; else c.samples = [acc];
    delete c.placing; endPick(); requestRender(); renderMaskList(); commit('Farbbereich ausgewählt');
  });
}
function maskMenuItems(m) {
  return [{ label: 'Umbenennen …', fn: () => renameMask(m) }, { label: m.invert ? 'Umkehren aufheben' : 'Maske umkehren', fn: () => { m.invert = !m.invert; requestRender(); renderMaskList(); commit('Maske umgekehrt'); } },
  { label: m.visible === false ? 'Maske einblenden' : 'Maske ausblenden', fn: () => { m.visible = m.visible === false; requestRender(); renderMaskList(); commit(m.visible ? 'Maske eingeblendet' : 'Maske ausgeblendet'); } },
  { label: 'Duplizieren', fn: () => dupMask(m, false) }, { label: 'Duplizieren und umkehren', fn: () => dupMask(m, true) }, '-',
  { head: 'Schneiden mit' }, ...['luminance', 'color', 'linear', 'radial', 'brush', 'sky'].map(t => ({ label: COMP_TYPES[t][1], fn: () => { S.mask.active = m.id; addComp(t, 'int'); } })), '-',
  { label: 'Maske löschen', fn: () => { const s = cs(); s.masks = s.masks.filter(x => x !== m); S.mask.active = s.masks.length ? s.masks[s.masks.length - 1].id : null; S.mask.comp = null; renderPanel(); renderMaskList(); requestRender(); commit('Maske gelöscht'); } }];
}
function dupMask(m, inv) { const s = cs(), c = clone(m); c.id = uid(); c.name = m.name + ' Kopie'; c.comps.forEach(k => { k.id = uid(); }); if (inv) c.invert = !c.invert; s.masks.push(c); S.mask.active = c.id; S.mask.comp = null; renderPanel(); renderMaskList(); requestRender(); commit(inv ? 'Maske dupliziert und umgekehrt' : 'Maske dupliziert'); }
function renameMask(m) { const inp = el('input', { class: 'field', value: m.name }); modal('Maske umbenennen', [inp], [{ label: 'Abbrechen' }, { label: 'Umbenennen', primary: true, onClick: () => { m.name = inp.value.trim() || m.name; renderPanel(); renderMaskList(); commit('Maske umbenannt'); } }]); setTimeout(() => inp.select(), 50); }
function createMenuItems(op) {
  const f = t => () => op ? addComp(t, op) : createMask(t);
  return [{ label: 'Himmel', fn: f('sky') }, '-', { label: 'Pinsel', key: 'B', fn: f('brush') }, { label: 'Linearer Verlauf', key: 'L', fn: f('linear') }, { label: 'Radialer Verlauf', key: 'R', fn: f('radial') }, '-', { head: 'Bereich' }, { label: 'Farbbereich', fn: f('color') }, { label: 'Luminanzbereich', fn: f('luminance') }];
}
let maskThumbJob = 0;
function renderMaskList() {
  const box = $('#maskList'), s = curPhoto() && cs();
  const show = S.panel === 'mask' && S.view === 'detail' && s && s.masks.length && !S.mask.listCollapsed;
  box.hidden = !show; if (!show) { box.replaceChildren(); return; }
  box.replaceChildren();
  box.append(el('div', { class: 'mlh' }, el('button', { class: 'ib' + (S.mask.overlay ? ' on' : ''), title: 'Überlagerung anzeigen (O)', 'aria-label': 'Überlagerung anzeigen', html: icon('eye', 16), onclick: () => { S.mask.overlay = !S.mask.overlay; store.set('maskOverlay', S.mask.overlay); renderMaskList(); requestRender(); } }), el('button', { class: 'ib', title: 'Einklappen', 'aria-label': 'Maskenliste einklappen', html: icon('chevRight', 16), onclick: () => { S.mask.listCollapsed = true; renderMaskList(); renderPanel(); } })));
  const plus = el('button', { class: 'plus-blue', title: 'Neue Maske erstellen', 'aria-label': 'Neue Maske erstellen', html: icon('plus', 20) });
  plus.onclick = () => { S.mask.creating = 'new'; S.mask.active = null; renderPanel(); renderMaskList(); requestRender(); };
  box.append(plus);
  const thumbs = [];
  for (const m of s.masks) {
    const cv = el('canvas', { width: 96, height: 96 }), on = m.id === S.mask.active;
    const t = el('div', { class: 'mthumb' + (on ? ' on' : '') + (m.visible === false ? ' hiddenm' : ''), title: m.name, role: 'button', tabindex: '0' }, cv);
    t.onclick = () => { S.mask.active = m.id; S.mask.comp = m.comps[m.comps.length - 1]?.id; S.mask.creating = null; renderPanel(); renderMaskList(); requestRender(); };
    t.oncontextmenu = e => { e.preventDefault(); menu(t, maskMenuItems(m)); };
    t.onmouseenter = () => { if (!on) { S.mask.hoverId = m.id; requestRender(); } }; t.onmouseleave = () => { if (S.mask.hoverId) { S.mask.hoverId = null; requestRender(); } };
    box.append(t); thumbs.push([cv, m]);
    if (on) {
      const comps = el('div', { class: 'mcomps' });
      for (const c of m.comps) { const ce = el('button', { class: 'mcomp' + (acomp() === c ? ' on' : ''), title: COMP_TYPES[c.type][1] + (c.op === 'sub' ? ' (subtrahiert)' : c.op === 'int' ? ' (Schnittmenge)' : ''), html: icon(COMP_TYPES[c.type][0], 16), onclick: () => { S.mask.comp = c.id; renderPanel(); renderMaskList(); requestRender(); } }); if (c.op !== 'add' && m.comps[0] !== c) ce.append(el('span', { class: 'op' }, c.op === 'sub' ? '−' : '∩')); comps.append(ce); }
      box.append(comps);
      const add = el('button', { class: 'ib', title: 'Hinzufügen', 'aria-label': 'Komponente hinzufügen', html: icon('plus', 16), style: 'border:1.5px solid #777;border-radius:50%;width:26px;height:26px' }), sub = el('button', { class: 'ib', title: 'Subtrahieren', 'aria-label': 'Komponente subtrahieren', html: icon('minus', 16), style: 'border:1.5px solid #777;border-radius:50%;width:26px;height:26px' });
      add.onclick = () => menu(add, createMenuItems('add')); sub.onclick = () => menu(sub, createMenuItems('sub'));
      box.append(el('div', { class: 'mlops' }, add, sub, el('button', { class: 'ib', title: 'Weitere Optionen', 'aria-label': 'Maskenoptionen', html: icon('more', 16), onclick: e => menu(e.currentTarget, maskMenuItems(m)) })));
    }
  }
  const col = el('button', { class: 'ib', title: 'Überlagerungsfarbe', 'aria-label': 'Überlagerungsfarbe', html: `<span style="width:14px;height:14px;border-radius:3px;display:block;background:rgba(${(S.mask.color || [1, .1, .1]).slice(0, 3).map(v => v * 255 | 0)})"></span>` });
  col.onclick = () => menu(col, [['Rot', [1, .1, .1]], ['Grün', [.1, .9, .2]], ['Blau', [.15, .45, 1]], ['Weiß', [1, 1, 1]], ['Schwarz', [0, 0, 0]]].map(([n, c]) => ({ label: n, fn: () => { S.mask.color = [...c, (S.mask.color || [0, 0, 0, .5])[3]]; renderMaskList(); requestRender(); } })).concat(['-', ...[30, 50, 70].map(o => ({ label: `Deckkraft ${o} %`, checked: Math.round((S.mask.color || [0, 0, 0, .5])[3] * 100) === o, fn: () => { S.mask.color = [...(S.mask.color || [1, .1, .1]).slice(0, 3), o / 100]; requestRender(); } }))]));
  const tg = el('span', { class: 'toggle' + (S.mask.overlay ? ' on' : ''), role: 'switch', 'aria-checked': String(S.mask.overlay), title: 'Überlagerung', onclick: () => { S.mask.overlay = !S.mask.overlay; store.set('maskOverlay', S.mask.overlay); renderMaskList(); requestRender(); } });
  box.append(el('div', { class: 'mlfoot' }, tg, col));
  const job = ++maskThumbJob;
  (async () => { for (const [cv, m] of thumbs) { await sleep(0); if (job !== maskThumbJob || !cv.isConnected || !R.hasImage) return; const idx = cs().masks.filter(x => x.visible !== false && x.comps.length).slice(0, 12).indexOf(m); const s2 = effective(cs()), o = outputSize(s2, R.w, R.h), k = 96 / Math.max(o.w, o.h), w = Math.max(1, Math.round(o.w * k)), h = Math.max(1, Math.round(o.h * k)); const c = idx >= 0 ? R.toCanvas(s2, w, h, { maskOnly: idx }) : null; const x = cv.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, 96, 96); if (c) x.drawImage(c, (96 - w) / 2, (96 - h) / 2); } })();
}
const maskThumbsSoon = debounce(() => { if (S.panel === 'mask') renderMaskList(); }, 400);
function buildMask(P) {
  const s = cs(), m = amask();
  if (!m || S.mask.creating) {
    P.append(el('div', { class: 'ph' }, el('h2', {}, 'Neue Maske erstellen')));
    const tiles = el('div', { class: 'tiles' });
    for (const [t, n] of [['sky', 'Himmel'], ['linear', 'Linearer Verlauf'], ['radial', 'Radialer Verlauf']]) tiles.append(el('button', { class: 'tile', onclick: () => createMask(t) }, el('span', { class: 'tb', html: icon(COMP_TYPES[t][0], 26) }), n));
    P.append(tiles);
    const list = el('div', { class: 'mlist', style: 'border-top:1px solid #3a3a3a;padding-top:6px' });
    list.append(el('button', { class: 'mi', onclick: () => createMask('brush') }, el('span', { html: icon('brush', 18) }), 'Pinsel', el('span', { class: 'dim', style: 'margin-left:auto' }, 'B')));
    const rng = el('button', { class: 'mi' }, el('span', { html: icon('colorRange', 18) }), 'Bereich', el('span', { html: icon('chevDown', 14) }));
    const subs = el('div'); subs.hidden = !S.mask.rangeOpen;
    rng.onclick = () => { S.mask.rangeOpen = !S.mask.rangeOpen; subs.hidden = !S.mask.rangeOpen; };
    subs.append(el('button', { class: 'mi sub', onclick: () => createMask('color') }, el('span', { html: icon('colorRange', 16) }), 'Farbbereich'), el('button', { class: 'mi sub', onclick: () => createMask('luminance') }, el('span', { html: icon('luminance', 16) }), 'Luminanzbereich'));
    list.append(rng, subs); P.append(list);
    if (S.mask.creating && s.masks.length) P.append(el('div', { class: 'btnrow', style: 'padding-top:10px' }, el('button', { class: 'gbtn', onclick: () => { S.mask.creating = null; S.mask.active = s.masks[s.masks.length - 1].id; renderPanel(); renderMaskList(); requestRender(); } }, 'Abbrechen')));
    P.append(el('div', { class: 'hint', style: 'border-top:1px solid #3a3a3a;margin-top:10px;padding-top:14px' }, el('span', { html: icon('info', 14) }), 'Motiv-, Hintergrund-, Objekt- und Personenmasken brauchen KI-Modelle und sind hier nicht enthalten. „Himmel“ arbeitet mit einer Farb- und Kantenanalyse.'));
    if (S.mask.listCollapsed && s.masks.length) P.append(el('div', { class: 'btnrow' }, el('button', { class: 'gbtn', onclick: () => { S.mask.listCollapsed = false; renderMaskList(); } }, 'Maskenliste einblenden')));
    return;
  }
  const c = acomp();
  const inv = el('input', { type: 'checkbox', checked: !!c.invert, onchange: e => { c.invert = e.target.checked; requestRender(); renderMaskList(); commit('Komponente umgekehrt'); } });
  P.append(el('div', { class: 'ph' }, el('h2', {}, COMP_TYPES[c.type][1]), el('span', { class: 'grow' }), el('label', { class: 'chk' }, inv, 'Umkehren')));
  const opt = el('div', { class: 'sb' });
  const B = S.mask.brush;
  if (c.type === 'brush') {
    const segb = el('div', { class: 'seg2', style: 'margin-bottom:6px' }, el('button', { class: B.erase ? '' : 'on', onclick: () => { B.erase = false; renderPanel(); } }, 'Pinsel'), el('button', { class: B.erase ? 'on' : '', onclick: () => { B.erase = true; renderPanel(); } }, 'Radiergummi'));
    opt.append(segb, slider('Größe', 1, 50, { get: () => B.size, set: v => B.size = v, def: 6, signed: false, noCommit: true, onLive: () => drawOverlay() }), slider('Weiche Kante', 0, 100, { get: () => B.feather, set: v => B.feather = v, def: 50, signed: false, noCommit: true }), slider('Fluss', 1, 100, { get: () => B.flow, set: v => B.flow = v, def: 100, signed: false, noCommit: true }));
    opt.append(el('label', { class: 'chk' }, el('input', { type: 'checkbox', checked: B.auto, onchange: e => { B.auto = e.target.checked; } }), 'Automatisch maskieren'));
    opt.append(el('div', { class: 'dim', style: 'font-size:12px;margin-top:4px' }, 'Im Bild malen. Alt gedrückt halten zum Radieren, [ ] ändert die Größe.'));
  } else if (c.type === 'radial') {
    opt.append(slider('Weiche Kante', 0, 100, { get: () => acomp().feather ?? 50, set: v => acomp().feather = v, def: 50, signed: false, hist: 'Verlauf weiche Kante', onLive: () => drawOverlay() }));
    opt.append(el('div', { class: 'dim', style: 'font-size:12px' }, c.placing ? 'Im Bild ziehen, um den Verlauf aufzuziehen.' : 'Mitte verschieben, Griffe ziehen zum Skalieren, oberen Griff zum Drehen.'));
  } else if (c.type === 'linear') opt.append(el('div', { class: 'dim', style: 'font-size:12px' }, c.placing ? 'Im Bild vom vollen Effekt zum Auslaufen ziehen.' : 'Endpunkte ziehen, Mitte verschiebt den ganzen Verlauf.'));
  else if (c.type === 'color') {
    const sw = el('div', { class: 'pcrow' }); for (const smp of c.samples) sw.append(el('span', { class: 'pcs on', style: `background:rgb(${smp.map(v => v * 255 | 0)})` }));
    sw.append(el('button', { class: 'gbtn', onclick: () => startColorPick(c) }, c.samples.length ? 'Neu wählen' : 'Farbe wählen'), c.samples.length === 1 ? el('button', { class: 'gbtn', onclick: () => startColorPick(c, true) }, '+ Farbe') : null);
    opt.append(sw, slider('Verfeinern', 0, 100, { get: () => acomp().refine ?? 50, set: v => acomp().refine = v, def: 50, signed: false, hist: 'Farbbereich verfeinern' }));
  } else if (c.type === 'luminance') {
    opt.append(slider('Untere Grenze', 0, 100, { get: () => acomp().lo, set: v => { const k = acomp(); k.lo = Math.min(v, k.hi - 1); }, def: 50, signed: false, hist: 'Luminanzbereich' }), slider('Obere Grenze', 0, 100, { get: () => acomp().hi, set: v => { const k = acomp(); k.hi = Math.max(v, k.lo + 1); }, def: 100, signed: false, hist: 'Luminanzbereich' }), slider('Glättung', 0, 100, { get: () => acomp().smooth ?? 30, set: v => acomp().smooth = v, def: 30, signed: false, hist: 'Luminanzbereich Glättung' }));
    opt.append(el('button', { class: 'gbtn', style: 'margin-top:6px', onclick: () => startPick('lum', 'Helligkeit im Bild anklicken', (fx, fy, sx, sy) => { const t = srcRGB(sx, sy, [0, 0, 0]), L = Math.round(luma(...t) * 100), k = acomp(); k.lo = clamp(L - 15, 0, 99); k.hi = clamp(L + 15, 1, 100); endPick(); syncAll(); requestRender(); commit('Luminanz ausgewählt'); }) }, 'Luminanz im Bild auswählen'));
  } else if (c.type === 'sky') opt.append(el('div', { class: 'dim', style: 'font-size:12px' }, 'Der Himmel wird über Farbe, Helligkeit und Kanten vom oberen Bildrand aus erkannt. Mit Subtrahieren lassen sich Bereiche ausnehmen.'));
  opt.append(el('label', { class: 'chk', style: 'margin-top:4px' }, el('input', { type: 'checkbox', checked: !!S.mask.bwView, onchange: e => { S.mask.bwView = e.target.checked; requestRender(); } }), 'Maske in Schwarzweiß anzeigen'));
  P.append(opt);
  const pre = el('button', { class: 'dd sm' }, 'Preset', el('span', { html: icon('chevDown', 14) }));
  pre.onclick = () => menu(pre, [...MASK_PRESETS.map(([n, a]) => ({ label: n, fn: () => { m.adj = clone(a); syncAll(); requestRender(); commit('Masken-Preset: ' + n); } })), '-', { label: 'Regler zurücksetzen', fn: () => { m.adj = {}; syncAll(); requestRender(); commit('Maskenregler zurückgesetzt'); } }]);
  const nm = el('span', { style: 'font-weight:700;color:var(--white);font-size:14px;cursor:text', title: 'Doppelklick zum Umbenennen', ondblclick: () => renameMask(m) }, m.name);
  P.append(el('div', { class: 'prow' }, nm, el('span', { class: 'grow' }), pre));
  P.append(el('div', { style: 'padding:6px 18px 4px' }, slider('Betrag', 0, 200, { get: () => amask().amount ?? 100, set: v => amask().amount = v, def: 100, signed: false, hist: 'Maskenbetrag' })));
  const L = (lbl, k, min, max, o = {}) => slider(lbl, min, max, Object.assign({ get: () => (amask().adj[k] ?? 0), set: v => { amask().adj[k] = v; }, hist: m.name + ' ' + lbl }, o));
  sec('mlight', 'Licht', b => b.append(L('Belichtung', 'exposure', -4, 4, { step: .01, dec: 2 }), L('Kontrast', 'contrast', -100, 100), L('Lichter', 'highlights', -100, 100), L('Tiefen', 'shadows', -100, 100), L('Weiß', 'whites', -100, 100), L('Schwarz', 'blacks', -100, 100)), P);
  sec('mcolor', 'Farbe', b => {
    b.append(L('Temperatur', 'temp', -100, 100, { track: TR.temp }), L('Tonung', 'tint', -100, 100, { track: TR.tint }), L('Farbton', 'hue', -180, 180, { track: TR.hue }), L('Sättigung', 'saturation', -100, 100, { track: TR.sat }));
    const wh = el('div', { style: 'display:flex;align-items:center;gap:10px;margin-top:8px' }, el('span', { class: 'dim' }, 'Farbe'));
    const sw = el('span', { style: 'width:22px;height:22px;border-radius:50%;border:1.5px solid #888;cursor:pointer', title: 'Färben' });
    const paint = () => { const col = amask().adj.color; sw.style.background = col && col.s ? `hsl(${col.h} ${col.s}% 50%)` : 'transparent'; };
    sw.onclick = () => menu(sw, [['Keine', null], ['Warm', { h: 35, s: 60 }], ['Gold', { h: 48, s: 70 }], ['Rot', { h: 0, s: 60 }], ['Magenta', { h: 310, s: 50 }], ['Blau', { h: 215, s: 60 }], ['Türkis', { h: 180, s: 50 }], ['Grün', { h: 120, s: 40 }]].map(([n, v]) => ({ label: n, fn: () => { amask().adj.color = v; paint(); requestRender(); commit('Maske färben: ' + n); } })));
    wh.append(sw); b.append(sync(wh, paint));
  }, P);
  sec('meffects', 'Effekte', b => b.append(L('Struktur', 'texture', -100, 100), L('Klarheit', 'clarity', -100, 100), L('Dunst entfernen', 'dehaze', -100, 100)), P);
  sec('mdetail', 'Detail', b => b.append(L('Schärfe', 'sharpness', -100, 100), L('Rauschen', 'noise', -100, 100)), P, false);
  P.append(el('div', { class: 'btnrow', style: 'padding-top:12px' }, el('button', { class: 'gbtn', onclick: e => menu(e.currentTarget, maskMenuItems(m)) }, 'Maskenoptionen …'), S.mask.listCollapsed ? el('button', { class: 'gbtn', onclick: () => { S.mask.listCollapsed = false; renderMaskList(); } }, 'Liste einblenden') : null));
}
/* Masken-Interaktion im Bild */
let maskDrag = null, lastDab = null;
function brushDab(c, fx, fy, erase) {
  const B = S.mask.brush, s = cs(), f = frameSize(s, R.w, R.h), r = B.size / 200;
  if (lastDab) { const dx = (fx - lastDab[0]) * f.w / f.h, dy = fy - lastDab[1], d = Math.hypot(dx, dy), stp = Math.max(r * .25, .002); if (d < stp) return; const n = Math.floor(d / stp); for (let i = 1; i <= n; i++) { const t = i / n; c.dabs.push({ x: lastDab[0] + (fx - lastDab[0]) * t, y: lastDab[1] + (fy - lastDab[1]) * t, r, f: B.feather / 100, flow: B.flow / 100 * .6, erase: !!erase, auto: !!B.auto }); } }
  else c.dabs.push({ x: fx, y: fy, r, f: B.feather / 100, flow: B.flow / 100 * .6, erase: !!erase, auto: !!B.auto });
  lastDab = [fx, fy];
}
function gradHandles(c) {
  if (c.type === 'linear') { const [ax, ay] = frameToScreen(c.ax, c.ay), [bx, by] = frameToScreen(c.bx, c.by); return { a: [ax, ay], b: [bx, by], m: [(ax + bx) / 2, (ay + by) / 2] }; }
  if (c.type === 'radial') { const f = frameScale(), [cx, cy] = frameToScreen(c.cx, c.cy), rx = c.rx * f, ry = c.ry * f, a = c.angle || 0, co = Math.cos(a), si = Math.sin(a); const pt = (u, v) => [cx + u * co - v * si, cy + u * si + v * co]; return { c: [cx, cy], e: pt(rx, 0), w: pt(-rx, 0), s: pt(0, ry), n: pt(0, -ry), rot: pt(0, -ry - 26), rx, ry, a }; }
  return null;
}
TOOLS.mask = {
  down(e, p) {
    const c = acomp(); if (!c || S.mask.creating) return false;
    S.lastPointerShift = e.shiftKey;
    const [fx, fy] = screenToFrame(p.x, p.y);
    if (c.type === 'brush') { lastDab = null; maskDrag = { kind: 'brush', erase: S.mask.brush.erase || e.altKey }; c.rev = (c.rev || 0) + 1; brushDab(c, fx, fy, maskDrag.erase); requestRender(); return true; }
    if (c.type === 'linear') {
      if (c.placing) { maskDrag = { kind: 'lin-new', fx, fy }; c.ax = fx; c.ay = fy; c.bx = fx; c.by = fy + .001; return true; }
      const h = gradHandles(c), hit = ['a', 'b', 'm'].find(k => Math.hypot(p.x - h[k][0], p.y - h[k][1]) < 14);
      if (hit) { maskDrag = { kind: 'lin', hit, fx, fy, c0: clone(c) }; return true; } return false;
    }
    if (c.type === 'radial') {
      if (c.placing) { maskDrag = { kind: 'rad-new', fx, fy }; c.cx = fx; c.cy = fy; c.rx = .001; c.ry = .001; return true; }
      const h = gradHandles(c); const hit = ['rot', 'e', 'w', 'n', 's'].find(k => Math.hypot(p.x - h[k][0], p.y - h[k][1]) < 12) || (Math.hypot(p.x - h.c[0], p.y - h.c[1]) < 14 ? 'c' : null);
      const inside = (() => { const dx = p.x - h.c[0], dy = p.y - h.c[1], u = dx * Math.cos(-h.a) - dy * Math.sin(-h.a), v = dx * Math.sin(-h.a) + dy * Math.cos(-h.a); return (u / h.rx) ** 2 + (v / h.ry) ** 2 < 1; })();
      if (hit || inside) { maskDrag = { kind: 'rad', hit: hit || 'c', fx, fy, c0: clone(c), p0: p }; return true; } return false;
    }
    return false;
  },
  move(e, p) {
    const d = maskDrag, c = acomp(); if (!d || !c) return; const [fx, fy] = screenToFrame(p.x, p.y), s = cs(), f = frameSize(s, R.w, R.h), ar = f.w / f.h;
    if (d.kind === 'brush') { brushDab(c, fx, fy, d.erase); S.mask.hover = p; requestRender(); return; }
    if (d.kind === 'lin-new') { c.bx = fx; c.by = fy; }
    else if (d.kind === 'lin') { const dx = fx - d.fx, dy = fy - d.fy; if (d.hit === 'a') { c.ax = d.c0.ax + dx; c.ay = d.c0.ay + dy; } else if (d.hit === 'b') { c.bx = d.c0.bx + dx; c.by = d.c0.by + dy; } else { c.ax = d.c0.ax + dx; c.ay = d.c0.ay + dy; c.bx = d.c0.bx + dx; c.by = d.c0.by + dy; } }
    else if (d.kind === 'rad-new') { c.rx = Math.max(.01, Math.abs(fx - d.fx) * ar); c.ry = Math.max(.01, Math.abs(fy - d.fy)); }
    else if (d.kind === 'rad') {
      const dx = fx - d.fx, dy = fy - d.fy, a = d.c0.angle || 0;
      if (d.hit === 'c') { c.cx = d.c0.cx + dx; c.cy = d.c0.cy + dy; }
      else if (d.hit === 'rot') { const h = gradHandles(c); c.angle = Math.atan2(p.y - h.c[1], p.x - h.c[0]) + Math.PI / 2; }
      else { const ux = (dx * ar) * Math.cos(-a) - dy * Math.sin(-a), uy = (dx * ar) * Math.sin(-a) + dy * Math.cos(-a); if (d.hit === 'e') c.rx = Math.max(.01, d.c0.rx + ux); if (d.hit === 'w') c.rx = Math.max(.01, d.c0.rx - ux); if (d.hit === 's') c.ry = Math.max(.01, d.c0.ry + uy); if (d.hit === 'n') c.ry = Math.max(.01, d.c0.ry - uy); if (e.shiftKey) { c.ry = c.rx; } }
    }
    requestRender();
  },
  up() {
    const d = maskDrag, c = acomp(); maskDrag = null; lastDab = null; if (!d || !c) return;
    if (d.kind === 'brush') { commit(d.erase ? 'Pinsel radieren' : 'Pinselstrich'); maskThumbsSoon(); return; }
    if (d.kind === 'lin-new' || d.kind === 'rad-new') { if (d.kind === 'rad-new' && c.rx < .02 && c.ry < .02) { c.rx = .18; c.ry = .14; } if (d.kind === 'lin-new' && Math.hypot(c.bx - c.ax, c.by - c.ay) < .02) { c.by = c.ay + .3; } delete c.placing; renderPanel(); commit(COMP_TYPES[c.type][1]); renderMaskList(); return; }
    commit(COMP_TYPES[c.type][1] + ' angepasst'); maskThumbsSoon();
  },
  hover(e, p) {
    const c = acomp(); S.mask.hover = p; const st = $('#stage');
    if (!c || S.mask.creating) { st.style.cursor = ''; return; }
    if (c.type === 'brush') { st.style.cursor = 'none'; drawOverlay(); return; }
    if ((c.type === 'linear' || c.type === 'radial') && c.placing) { st.style.cursor = 'crosshair'; return; }
    const h = gradHandles(c); if (!h) { st.style.cursor = ''; return; }
    const near = Object.entries(h).some(([k, v]) => Array.isArray(v) && Math.hypot(p.x - v[0], p.y - v[1]) < 14); st.style.cursor = near ? 'move' : '';
  },
  leave() { S.mask.hover = null; drawOverlay(); },
  wheel(e) { const c = acomp(); if (!c || c.type !== 'brush' || (!e.altKey && !e.shiftKey)) return false; S.mask.brush.size = clamp(S.mask.brush.size * Math.exp(-e.deltaY * .002), 1, 50); syncSliders(); drawOverlay(); return true; },
  draw(x, L) {
    const c = acomp(); if (!c || S.mask.creating) return;
    x.shadowColor = 'rgba(0,0,0,.9)'; x.shadowBlur = 3; x.strokeStyle = '#fff'; x.lineWidth = 1.3;
    if (c.type === 'brush') { const h = S.mask.hover; if (h && insideMain(h.x, h.y)) { const r = S.mask.brush.size / 200 * frameScale(); x.beginPath(); x.arc(h.x, h.y, r, 0, 7); x.stroke(); x.globalAlpha = .6; x.beginPath(); x.arc(h.x, h.y, r * (1 - S.mask.brush.feather / 200), 0, 7); x.stroke(); x.globalAlpha = 1; if (S.mask.brush.erase) { x.beginPath(); x.moveTo(h.x - 5, h.y); x.lineTo(h.x + 5, h.y); x.stroke(); } else { x.beginPath(); x.moveTo(h.x - 5, h.y); x.lineTo(h.x + 5, h.y); x.moveTo(h.x, h.y - 5); x.lineTo(h.x, h.y + 5); x.stroke(); } } }
    const knob = (pt, fill) => { x.beginPath(); x.arc(pt[0], pt[1], 6, 0, 7); x.fillStyle = fill || 'rgba(255,255,255,.95)'; x.fill(); x.lineWidth = 1.5; x.strokeStyle = '#111'; x.stroke(); x.strokeStyle = '#fff'; };
    if (c.type === 'linear' && !(c.placing && !maskDrag)) {
      const h = gradHandles(c), dx = h.b[0] - h.a[0], dy = h.b[1] - h.a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, big = Math.hypot(L.sw, L.sh);
      for (const [pt, dash] of [[h.a, false], [h.m, true], [h.b, false]]) { x.setLineDash(dash ? [6, 4] : []); x.beginPath(); x.moveTo(pt[0] - nx * big, pt[1] - ny * big); x.lineTo(pt[0] + nx * big, pt[1] + ny * big); x.stroke(); }
      x.setLineDash([]); knob(h.a); knob(h.b); knob(h.m, '#1473e6');
    }
    if (c.type === 'radial' && !(c.placing && !maskDrag)) {
      const h = gradHandles(c);
      x.beginPath(); x.ellipse(h.c[0], h.c[1], h.rx, h.ry, h.a, 0, 7); x.stroke();
      const f = clamp((c.feather ?? 50) / 100, .002, 1); x.setLineDash([5, 4]); x.beginPath(); x.ellipse(h.c[0], h.c[1], h.rx * (1 - f), h.ry * (1 - f), h.a, 0, 7); x.stroke(); x.setLineDash([]);
      for (const k of ['e', 'w', 'n', 's']) knob(h[k]); knob(h.c, '#1473e6'); x.beginPath(); x.moveTo(h.n[0], h.n[1]); x.lineTo(h.rot[0], h.rot[1]); x.stroke(); knob(h.rot, '#ccc');
    }
    x.shadowBlur = 0;
  }
};
