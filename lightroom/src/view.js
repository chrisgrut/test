/* ============================================================
   Detailansicht: Layout, Rendern, Zoom, Vorher/Nachher, Histogramm
   ============================================================ */
const TOOLS = {};               // Werkzeug-Hooks: crop, remove, mask → { draw, down, move, up, hover, cursor }
let renderQueued = false, loadToken = 0;
function requestRender() { if (!renderQueued) { renderQueued = true; requestAnimationFrame(doRender); } }
function isCropTool() { return S.panel === 'crop' && S.view === 'detail'; }
function stageMsg(t) { const m = $('#stageMsg'); m.hidden = !t; m.textContent = t || ''; $('#glCanvas').style.visibility = t ? 'hidden' : 'visible'; }
async function ensureLoaded() {
  const p = curPhoto();
  if (!p) { stageMsg(S.photos.length ? 'Kein Foto ausgewählt.' : 'Noch keine Fotos. Über „Fotos hinzufügen“ oder per Drag & Drop importieren.'); return; }
  if (S.loadedId === p.id && R.hasImage) { stageMsg(null); requestRender(); return; }
  const tok = ++loadToken; stageMsg('Foto wird geladen …');
  try {
    const im = await getImage(p, R.maxTex); if (tok !== loadToken) return;
    setSourceSample(im.img, im.w, im.h); RASTER.clear();
    R.setImage(im.img, im.w, im.h); S.loadedId = p.id; stageMsg(null);
    onPhotoLoaded(); requestRender();
  } catch (e) { if (tok === loadToken) stageMsg('Das Foto konnte nicht geladen werden: ' + e.message); }
}
function zoomFactor(z, ow, oh, sw, sh, pad) {
  const p = curPhoto(), kOrig = p ? p.w / R.w : 1, dpr = devicePixelRatio || 1;
  if (z === 'fit') return Math.min((sw - pad * 2) / ow, (sh - pad * 2) / oh);
  if (z === 'fill') return Math.max(sw / ow, sh / oh);
  return z * kOrig / dpr;
}
function layout() {
  const st = $('#stage'), sw = st.clientWidth, sh = st.clientHeight, s = viewSettings(), crop = isCropTool();
  const d = crop ? frameSize(s, R.w, R.h) : outputSize(s, R.w, R.h), ow = d.w, oh = d.h;
  const side = S.cmp === 'side-lr' ? [2, 1] : S.cmp === 'side-tb' ? [1, 2] : [1, 1], gap = 10, pad = crop ? 44 : (innerWidth <= 760 ? 6 : 18);
  const zoom = side[0] * side[1] > 1 || crop ? 'fit' : S.zoom;
  const k = zoom === 'fit' ? Math.min((sw - pad * 2 - (side[0] - 1) * gap) / side[0] / ow, (sh - pad * 2 - (side[1] - 1) * gap) / side[1] / oh) : zoomFactor(zoom, ow, oh, sw, sh, pad);
  const cw = Math.max(1, ow * k), ch = Math.max(1, oh * k), TW = cw * side[0] + gap * (side[0] - 1), TH = ch * side[1] + gap * (side[1] - 1);
  const mx = Math.max(0, (TW - sw) / 2), my = Math.max(0, (TH - sh) / 2);
  S.pan.x = clamp(S.pan.x, -mx, mx); S.pan.y = clamp(S.pan.y, -my, my);
  const x0 = (sw - TW) / 2 + S.pan.x, y0 = (sh - TH) / 2 + S.pan.y;
  const rects = [];
  for (let j = 0; j < side[1]; j++) for (let i = 0; i < side[0]; i++) rects.push({ x: x0 + i * (cw + gap), y: y0 + j * (ch + gap), w: cw, h: ch });
  return { sw, sh, ow, oh, k, cw, ch, rects, main: rects[rects.length - 1], zoom, crop, side };
}
function stageBg() { const c = getComputedStyle($('#detail')).backgroundColor.match(/\d+/g) || [27, 27, 27]; return c.slice(0, 3).map(v => v / 255); }
function doRender() {
  renderQueued = false;
  if (!R || !R.hasImage || S.view !== 'detail' || S.loadedId !== S.cur || !curPhoto()) return;
  const L = layout(); S.layout = L; const dpr = devicePixelRatio || 1, gc = $('#glCanvas'), ov = $('#overlay');
  const W = Math.max(1, Math.round(L.sw * dpr)), H = Math.max(1, Math.round(L.sh * dpr));
  for (const c of [gc, ov]) { if (c.width !== W || c.height !== H) { c.width = W; c.height = H; } c.style.width = L.sw + 'px'; c.style.height = L.sh + 'px'; }
  const s = viewSettings(), bg = stageBg();
  const act = S.panel === 'mask' && S.mask.bwView && S.mask.active ? (cs().masks || []).filter(m => m.visible !== false && m.comps && m.comps.length).slice(0, 12).findIndex(m => m.id === S.mask.active) : -1;
  const base = { w: W, h: H, cropEdit: L.crop, clip: S.clip, showMask: maskOverlayIndex(), maskCol: S.mask.color || [1, .1, .1, .5], maskOnly: act, vis: S.panel === 'remove' && S.heal.visualize ? (S.heal.visT ?? 40) / 100 : 0 };
  const draw = (r, extra, first) => {
    const ix0 = Math.max(r.x, 0), iy0 = Math.max(r.y, 0), ix1 = Math.min(r.x + r.w, L.sw), iy1 = Math.min(r.y + r.h, L.sh);
    if (ix1 <= ix0 || iy1 <= iy0) { if (first) R.render(s, Object.assign({}, base, { vp: [0, 0, 1, 1], clear: bg })); return; }
    const vx = Math.round(ix0 * dpr), vy = Math.round((L.sh - iy1) * dpr), vw = Math.max(1, Math.round(ix1 * dpr) - vx), vh = Math.max(1, Math.round((L.sh - iy0) * dpr) - vy);
    const sub = [(vx / dpr - r.x) / r.w, (L.sh - (vy + vh) / dpr - r.y) / r.h, vw / dpr / r.w, vh / dpr / r.h];
    R.render(s, Object.assign({}, base, extra, { vp: [vx, vy, vw, vh], sub, clear: first ? bg : null }));
  };
  const hold = S.holdBefore;
  if (L.side[0] * L.side[1] > 1) { draw(L.rects[0], { before: true }, true); draw(L.rects[1], {}, false); }
  else draw(L.main, { before: S.cmp === 'before' || hold, split: S.cmp === 'split-lr' ? { dir: 'v', pos: S.cmpSplit } : S.cmp === 'split-tb' ? { dir: 'h', pos: S.cmpSplit } : null }, true);
  drawOverlay(); histSoon(); updateHud();
}
function updateHud() {
  const L = S.layout, labels = $('#cmpLabels'); labels.hidden = true; labels.replaceChildren();
  const hud = $('#hud'), hudR = $('#hudR'); let t = '', tr = '';
  if (S.cmp !== 'off' && !L.crop && L) {
    labels.hidden = false;
    const mk = (txt, x, y) => labels.append(el('span', { style: `left:${x}px;top:${y}px` }, txt));
    const r0 = L.rects[0], r1 = L.main;
    if (S.cmp === 'before') mk('Vorher', Math.max(8, r1.x + 10), Math.max(8, r1.y + 10));
    else if (S.cmp === 'side-lr' || S.cmp === 'side-tb') { mk('Vorher', r0.x + 10, r0.y + 10); mk('Nachher', r1.x + 10, r1.y + 10); }
    else if (S.cmp === 'split-lr') { mk('Vorher', Math.max(8, r1.x + 10), Math.max(8, r1.y + 10)); mk('Nachher', Math.min(L.sw - 80, r1.x + r1.w - 76), Math.max(8, r1.y + 10)); }
    else if (S.cmp === 'split-tb') { mk('Vorher', Math.max(8, r1.x + 10), Math.max(8, r1.y + 10)); mk('Nachher', Math.max(8, r1.x + 10), Math.min(L.sh - 34, r1.y + r1.h - 34)); }
  }
  if (S.holdBefore) t = 'Original';
  else if (S.preview && S.previewName) t = 'Vorschau: ' + S.previewName;
  else if (S.pick) t = S.pick.hint;
  if (L && L.zoom !== 'fit' && !L.crop) tr = S.zoom === 'fill' ? 'Ausfüllen' : Math.round(S.zoom * 100) + ' %';
  hud.hidden = !t; hud.textContent = t; hudR.hidden = !tr; hudR.textContent = tr;
}
/* Koordinaten: Bildschirm (CSS-px im Stage) ↔ Ausgabe-uv ↔ Rahmen */
function screenToFrame(px, py) { const L = S.layout, r = L.main, u = (px - r.x) / r.w, v = (py - r.y) / r.h, s = cs(); if (L.crop) return [u, v]; return [s.crop.x + u * s.crop.w, s.crop.y + v * s.crop.h]; }
function frameToScreen(fx, fy) { const L = S.layout, r = L.main, s = cs(); if (L.crop) return [r.x + fx * r.w, r.y + fy * r.h]; return [r.x + (fx - s.crop.x) / s.crop.w * r.w, r.y + (fy - s.crop.y) / s.crop.h * r.h]; }
function frameScale() { const L = S.layout, s = cs(); return L.crop ? L.main.h : L.main.h / s.crop.h; } // Bildschirm-px pro Rahmenhöhe
function insideMain(px, py) { const r = S.layout && S.layout.main; return !!r && px >= r.x && py >= r.y && px <= r.x + r.w && py <= r.y + r.h; }
function setZoom(z, at) {
  if (isCropTool()) return;
  const L = S.layout; const prev = S.zoom; S.zoom = z;
  if (z === 'fit') S.pan = { x: 0, y: 0 };
  else if (L) {
    const r = L.main, fx = at ? (at.x - r.x) / r.w : .5, fy = at ? (at.y - r.y) / r.h : .5;
    const k = zoomFactor(z, L.ow, L.oh, L.sw, L.sh, 18), cw = L.ow * k, ch = L.oh * k, ax = at ? at.x : L.sw / 2, ay = at ? at.y : L.sh / 2;
    S.pan = { x: ax - fx * cw + cw / 2 - L.sw / 2, y: ay - fy * ch + ch / 2 - L.sh / 2 };
  }
  if (prev !== z) renderBottom();
  requestRender();
}
function setCmp(c) { S.cmp = c; if (c === 'side-lr' || c === 'side-tb') S.pan = { x: 0, y: 0 }; renderBottom(); requestRender(); }
function toggleClip(on = !S.clip) { S.clip = on; requestRender(); drawHisto(); }
function drawOverlay() {
  const L = S.layout, dpr = devicePixelRatio || 1; if (!L) return;
  const t = TOOLS[S.panel], split = S.cmp === 'split-lr' || S.cmp === 'split-tb', tool = t && t.draw && S.view === 'detail';
  let o = $('#overlay');
  if (!split && !tool) { if (S.ovDirty) { const n = o.cloneNode(false); o.replaceWith(n); S.ovDirty = false; } return; }
  S.ovDirty = true; o.width = o.width; const x = o.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0);
  x.fillStyle = 'rgba(0,0,0,0.004)'; x.fillRect(0, 0, 1, 1); // erzwingt eine Aktualisierung der Ebene, auch wenn das Werkzeug nichts zeichnet
  if (split) {
    const r = L.main; x.fillStyle = '#fff';
    if (S.cmp === 'split-lr') { const sx = r.x + S.cmpSplit * r.w; x.beginPath(); x.arc(sx, Math.min(L.sh - 30, Math.max(30, r.y + r.h / 2)), 9, 0, 7); x.fill(); }
    else { const sy = r.y + S.cmpSplit * r.h; x.beginPath(); x.arc(Math.min(L.sw - 30, Math.max(30, r.x + r.w / 2)), sy, 9, 0, 7); x.fill(); }
  }
  if (tool) t.draw(x, L);
}

/* ---------- Histogramm ---------- */
const ZONES = [{ a: 0, b: .12, key: 'blacks', n: 'Schwarz' }, { a: .12, b: .36, key: 'shadows', n: 'Tiefen' }, { a: .36, b: .64, key: 'exposure', n: 'Belichtung' }, { a: .64, b: .88, key: 'highlights', n: 'Lichter' }, { a: .88, b: 1, key: 'whites', n: 'Weiß' }];
let histPending = false;
function histSoon() { if (histPending) return; histPending = true; setTimeout(() => { histPending = false; updateHistogram(); }, 80); }
function updateHistogram() {
  if (!R.hasImage || S.loadedId !== S.cur || !curPhoto() || S.view !== 'detail') return;
  const s = viewSettings(), crop = isCropTool(), o = crop ? frameSize(s, R.w, R.h) : outputSize(s, R.w, R.h), k = Math.min(1, 256 / Math.max(o.w, o.h));
  const w = Math.max(1, Math.round(o.w * k)), h = Math.max(1, Math.round(o.h * k)), px = R.pixels(s, w, h, { cropEdit: crop });
  const r = new Float32Array(256), g = new Float32Array(256), b = new Float32Array(256), l = new Float32Array(256); let hi = 0, lo = 0; const n = w * h;
  for (let i = 0; i < px.length; i += 4) { const R_ = px[i], G = px[i + 1], B = px[i + 2]; r[R_]++; g[G]++; b[B]++; l[Math.round(.2126 * R_ + .7152 * G + .0722 * B)]++; if (R_ > 253 || G > 253 || B > 253) hi++; if (R_ < 2 && G < 2 && B < 2) lo++; }
  const sm = a => { const o2 = new Float32Array(256); for (let i = 0; i < 256; i++) o2[i] = (a[Math.max(0, i - 1)] + 2 * a[i] + a[Math.min(255, i + 1)]) / 4; return o2; };
  S.histo = { r: sm(r), g: sm(g), b: sm(b), l: sm(l), hi: hi / n, lo: lo / n };
  drawHisto(); if (typeof drawCurve === 'function') drawCurve();
}
function drawHisto() {
  const c = $('#histo'); if (!c.offsetParent) return; const dpr = devicePixelRatio || 1, W = Math.round(c.clientWidth * dpr), H = Math.round(c.clientHeight * dpr);
  if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
  const x = c.getContext('2d'); x.globalCompositeOperation = 'source-over'; x.fillStyle = '#232323'; x.fillRect(0, 0, W, H);
  if (S.histHover != null && S.histHover >= 0) { const z = ZONES[S.histHover]; x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(z.a * W, 0, (z.b - z.a) * W, H); }
  const h = S.histo;
  if (h) {
    let mx = 1; for (const a of [h.r, h.g, h.b]) for (let i = 2; i < 254; i++) mx = Math.max(mx, a[i]);
    x.globalCompositeOperation = 'lighter';
    for (const [a, col] of [[h.r, 'rgba(210,55,55,.75)'], [h.g, 'rgba(55,185,70,.75)'], [h.b, 'rgba(50,100,235,.8)']]) {
      x.fillStyle = col; x.beginPath(); x.moveTo(0, H);
      for (let i = 0; i < 256; i++) x.lineTo(i / 255 * W, H - Math.min(1, a[i] / mx) * H * .92);
      x.lineTo(W, H); x.closePath(); x.fill();
    }
    x.globalCompositeOperation = 'source-over';
  }
  const t = 10 * dpr, m = 3 * dpr;
  const tri = (left, active) => { x.beginPath(); if (left) { x.moveTo(m, m); x.lineTo(m + t, m); x.lineTo(m, m + t); } else { x.moveTo(W - m, m); x.lineTo(W - m - t, m); x.lineTo(W - m, m + t); } x.closePath(); x.fillStyle = active || S.clip ? '#f2f2f2' : '#5a5a5a'; x.fill(); };
  tri(true, h && h.lo > .002); tri(false, h && h.hi > .002);
}
function histFoot(text) {
  const f = $('#histoFoot'); f.replaceChildren();
  if (text) { f.append(el('span', {}, text)); return; }
  const p = curPhoto(); if (!p) return;
  const parts = exifParts(p.exif); if (parts.length) parts.forEach(t => f.append(el('span', {}, t)));
  else f.append(el('span', { class: 'dim' }, p.sample ? 'Beispielfoto' : 'Keine Kamerainformationen'), el('span', { class: 'dim' }, `${p.w} × ${p.h}`));
}
function wireHisto() {
  const c = $('#histo'); let d = null;
  const zoneAt = e => { const r = c.getBoundingClientRect(), f = (e.clientX - r.left) / r.width; return ZONES.findIndex(z => f >= z.a && f <= z.b); };
  const fmtZ = (k, v) => k === 'exposure' ? signed(v, 2) : signed(v);
  c.addEventListener('pointerdown', e => {
    if (!curPhoto()) return; const r = c.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    if (y < 20 && (x < 20 || x > r.width - 20)) { toggleClip(); return; }
    const i = zoneAt(e); if (i < 0) return; d = { i, x0: e.clientX, v0: cs()[ZONES[i].key], w: r.width }; c.setPointerCapture(e.pointerId);
  });
  c.addEventListener('pointermove', e => {
    if (!d) { S.histHover = zoneAt(e); const z = ZONES[S.histHover]; histFoot(z && curPhoto() ? `${z.n}  ${fmtZ(z.key, cs()[z.key])}` : null); drawHisto(); return; }
    const z = ZONES[d.i], dx = (e.clientX - d.x0) / d.w; const v = z.key === 'exposure' ? clamp(Math.round((d.v0 + dx * 4) * 100) / 100, -5, 5) : clamp(Math.round(d.v0 + dx * 200), -100, 100);
    cs()[z.key] = v; histFoot(`${z.n}  ${fmtZ(z.key, v)}`); syncSliders(); requestRender();
  });
  const end = () => { if (!d) return; const z = ZONES[d.i], v = cs()[z.key]; d = null; commit(`${z.n} ${fmtZ(z.key, v)}`); };
  c.addEventListener('pointerup', end); c.addEventListener('pointercancel', end);
  c.addEventListener('pointerleave', () => { if (!d) { S.histHover = null; histFoot(null); drawHisto(); } });
}

/* ---------- Zeiger im Bild ---------- */
function wireStage() {
  const st = $('#stage'); let down = null; const ptrs = new Map(); let pinch = null, holdT = null;
  const pos = e => { const r = st.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  st.addEventListener('pointerdown', e => {
    if (!S.layout || e.button > 0 || e.target.closest('#maskList')) return; const p = pos(e); ptrs.set(e.pointerId, p); st.setPointerCapture(e.pointerId);
    if (ptrs.size === 2 && !isCropTool()) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: S.zoom === 'fit' || S.zoom === 'fill' ? S.layout.k * (devicePixelRatio || 1) / (curPhoto().w / R.w) : S.zoom, c: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } }; down = null; clearTimeout(holdT); return; }
    if (S.pick) { if (insideMain(p.x, p.y)) { const [fx, fy] = screenToFrame(p.x, p.y); const [sx, sy] = frameToSrc(fx, fy, cs(), R.w, R.h); S.pick.fn(fx, fy, sx, sy); } return; }
    const t = TOOLS[S.panel]; if (t && t.down && t.down(e, p)) { down = { tool: true }; return; }
    const L = S.layout, r = L.main;
    if (S.cmp === 'split-lr' && Math.abs(p.x - (r.x + S.cmpSplit * r.w)) < 16) { down = { mode: 'split' }; return; }
    if (S.cmp === 'split-tb' && Math.abs(p.y - (r.y + S.cmpSplit * r.h)) < 16) { down = { mode: 'split' }; return; }
    down = { mode: L.zoom !== 'fit' ? 'pan' : 'click', sx: p.x, sy: p.y, x: p.x, y: p.y, moved: false };
    if (down.mode === 'pan') st.classList.add('panning');
    if (e.pointerType === 'touch' && L.zoom === 'fit') holdT = setTimeout(() => { S.holdBefore = true; down && (down.moved = true); requestRender(); }, 450);
  });
  st.addEventListener('pointermove', e => {
    if (e.target.closest && e.target.closest('#maskList') && !down) return;
    const p = pos(e); if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, p);
    if (pinch && ptrs.size === 2) { const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y); const z = clamp(pinch.z * d / pinch.d, .1, 4); setZoom(z < .12 ? 'fit' : z, pinch.c); return; }
    const t = TOOLS[S.panel];
    if (down && down.tool) { t && t.move && t.move(e, p); return; }
    if (!down) { if (t && t.hover) t.hover(e, p); else st.style.cursor = ''; return; }
    if (Math.hypot(p.x - down.sx, p.y - down.sy) > 4) { down.moved = true; clearTimeout(holdT); }
    if (down.mode === 'pan') { S.pan.x += p.x - down.x; S.pan.y += p.y - down.y; requestRender(); }
    else if (down.mode === 'split') { const r = S.layout.main; S.cmpSplit = S.cmp === 'split-lr' ? clamp((p.x - r.x) / r.w, .02, .98) : clamp((p.y - r.y) / r.h, .02, .98); requestRender(); }
    down.x = p.x; down.y = p.y;
  });
  const up = e => {
    ptrs.delete(e.pointerId); clearTimeout(holdT);
    if (pinch) { if (ptrs.size < 2) pinch = null; return; }
    if (S.holdBefore) { S.holdBefore = false; requestRender(); down = null; return; }
    if (!down) return; const d = down; down = null; st.classList.remove('panning');
    if (d.tool) { const t = TOOLS[S.panel]; t && t.up && t.up(e, pos(e)); return; }
    if (d.mode === 'click' && !d.moved && insideMain(d.sx, d.sy)) setZoom(1, { x: d.sx, y: d.sy });
    else if (d.mode === 'pan' && !d.moved) setZoom('fit');
  };
  st.addEventListener('pointerup', up); st.addEventListener('pointercancel', up);
  st.addEventListener('pointerleave', e => { const t = TOOLS[S.panel]; t && t.leave && t.leave(e); });
  st.addEventListener('wheel', e => {
    const t = TOOLS[S.panel]; if (t && t.wheel && t.wheel(e)) { e.preventDefault(); return; }
    if (e.ctrlKey || e.metaKey) { e.preventDefault(); const L = S.layout; if (!L) return; const cur = L.zoom === 'fit' || L.zoom === 'fill' ? L.k * (devicePixelRatio || 1) / (curPhoto().w / R.w) : S.zoom; const z = clamp(cur * Math.exp(-e.deltaY * .01), .1, 4); setZoom(z, pos(e)); return; }
    if (S.layout && S.layout.zoom !== 'fit') { e.preventDefault(); S.pan.x -= e.deltaX; S.pan.y -= e.deltaY; requestRender(); }
  }, { passive: false });
  new ResizeObserver(() => { requestRender(); drawHisto(); if (typeof drawCurve === 'function') drawCurve(); if (S.view !== 'detail') renderGrid(); }).observe(st);
}
