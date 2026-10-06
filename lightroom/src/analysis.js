/* ============================================================
   Bildanalyse: Quellproben, Pinselmasken, Himmel, Upright,
   inhaltsbasierte Quellsuche, Auto-Tonwert, Auto-Weißabgleich
   ============================================================ */
const SRC = { d: null, w: 0, h: 0 };
function setSourceSample(img, w, h) {
  const k = Math.min(1, 1024 / Math.max(w, h)), c = mkCanvas(Math.round(w * k), Math.round(h * k)), x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(img, 0, 0, c.width, c.height); SRC.d = x.getImageData(0, 0, c.width, c.height).data; SRC.w = c.width; SRC.h = c.height;
  FRAME_GRID.key = '';
}
/* bilineare Quellprobe, Ergebnis 0..1 Gamma-RGB */
function srcRGB(sx, sy, out) {
  const W = SRC.w, H = SRC.h, d = SRC.d; const x = clamp(sx * W - .5, 0, W - 1.001), y = clamp(sy * H - .5, 0, H - 1.001);
  const ix = x | 0, iy = y | 0, fx = x - ix, fy = y - iy, i00 = (iy * W + ix) * 4, i10 = i00 + 4, i01 = i00 + W * 4, i11 = i01 + 4;
  for (let c = 0; c < 3; c++) out[c] = ((d[i00 + c] * (1 - fx) + d[i10 + c] * fx) * (1 - fy) + (d[i01 + c] * (1 - fx) + d[i11 + c] * fx) * fy) / 255;
  return out;
}
/* Farbraster im Rahmenraum (für Auto-Maske und Himmel) */
const FRAME_GRID = { key: '', W: 0, H: 0, rgb: null };
function frameGrid(s, W, H) {
  const key = JSON.stringify(geomOf(s)) + W + 'x' + H;
  if (FRAME_GRID.key === key) return FRAME_GRID;
  const rgb = new Float32Array(W * H * 3), t = [0, 0, 0];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const [sx, sy] = frameToSrc((x + .5) / W, (y + .5) / H, s, R.w, R.h); const i = (y * W + x) * 3;
    if (sx < 0 || sy < 0 || sx > 1 || sy > 1) { rgb[i] = rgb[i + 1] = rgb[i + 2] = -1; continue; }
    srcRGB(sx, sy, t); rgb[i] = t[0]; rgb[i + 1] = t[1]; rgb[i + 2] = t[2];
  }
  Object.assign(FRAME_GRID, { key, W, H, rgb }); return FRAME_GRID;
}
/* Pinsel rastern (inkrementell zwischengespeichert) */
const RASTER = new Map();
function rasterBrush(c, W, H, s) {
  let e = RASTER.get(c.id); const dabs = c.dabs || [];
  const sig = d => d ? d.x + ',' + d.y + ',' + d.r + ',' + (d.erase ? 1 : 0) : '';
  if (!e || e.W !== W || e.H !== H || dabs.length < e.n || (e.n && sig(dabs[e.n - 1]) !== e.sig)) { e = { W, H, n: 0, buf: new Float32Array(W * H), sig: '' }; RASTER.set(c.id, e); }
  const needGrid = dabs.slice(e.n).some(d => d.auto), grid = needGrid ? frameGrid(s, Math.round(W / 2), Math.round(H / 2)) : null;
  for (let i = e.n; i < dabs.length; i++) paintDab(e.buf, W, H, dabs[i], grid);
  e.n = dabs.length; e.sig = sig(dabs[e.n - 1]);
  const out = new Uint8Array(W * H); for (let i = 0; i < out.length; i++) out[i] = e.buf[i] * 255 + .5; return out;
}
function paintDab(buf, W, H, d, grid) {
  const cx = d.x * W, cy = d.y * H, R = Math.max(1, d.r * H), f = clamp(d.f ?? .5, .01, 1), flow = d.flow ?? 1;
  const x0 = Math.max(0, Math.floor(cx - R)), x1 = Math.min(W - 1, Math.ceil(cx + R)), y0 = Math.max(0, Math.floor(cy - R)), y1 = Math.min(H - 1, Math.ceil(cy + R));
  let tc = null; if (d.auto && grid) { const gx = clamp(Math.round(d.x * grid.W - .5), 0, grid.W - 1), gy = clamp(Math.round(d.y * grid.H - .5), 0, grid.H - 1), gi = (gy * grid.W + gx) * 3; tc = [grid.rgb[gi], grid.rgb[gi + 1], grid.rgb[gi + 2]]; }
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const dist = Math.hypot(x + .5 - cx, y + .5 - cy) / R; if (dist >= 1) continue;
    let a = flow * (1 - smooth(1 - f, 1, dist));
    if (tc) { const gx = Math.min(grid.W - 1, (x * grid.W / W) | 0), gy = Math.min(grid.H - 1, (y * grid.H / H) | 0), gi = (gy * grid.W + gx) * 3; const dr = grid.rgb[gi] - tc[0], dg = grid.rgb[gi + 1] - tc[1], db = grid.rgb[gi + 2] - tc[2]; a *= 1 - smooth(.07, .16, Math.sqrt(dr * dr + dg * dg + db * db)); }
    const i = y * W + x; buf[i] = d.erase ? buf[i] * (1 - a) : buf[i] + a * (1 - buf[i]);
  }
}
/* Himmel auswählen: Bereichswachstum vom oberen Rand mit Kantenstopp */
function detectSky(s, W, H) {
  const gw = 256, gh = Math.max(8, Math.round(256 * H / W)), g = frameGrid(s, gw, gh), rgb = g.rgb, n = gw * gh;
  const L = new Float32Array(n), grad = new Float32Array(n);
  for (let i = 0; i < n; i++) L[i] = rgb[i * 3] < 0 ? -1 : luma(rgb[i * 3], rgb[i * 3 + 1], rgb[i * 3 + 2]);
  for (let y = 1; y < gh - 1; y++) for (let x = 1; x < gw - 1; x++) { const i = y * gw + x; let m = 0; for (const j of [i - 1, i + 1, i - gw, i + gw]) { const dr = rgb[i * 3] - rgb[j * 3], dg = rgb[i * 3 + 1] - rgb[j * 3 + 1], db = rgb[i * 3 + 2] - rgb[j * 3 + 2]; m = Math.max(m, Math.sqrt(dr * dr + dg * dg + db * db)); } grad[i] = m; }
  // Saatpunkte: obere Zeilen, die hell genug und glatt sind
  const mean = [0, 0, 0]; let cnt = 0;
  for (let y = 0; y < 3; y++) for (let x = 0; x < gw; x++) { const i = y * gw + x; if (L[i] > .12) { mean[0] += rgb[i * 3]; mean[1] += rgb[i * 3 + 1]; mean[2] += rgb[i * 3 + 2]; cnt++; } }
  const out = new Float32Array(n); if (!cnt) return out;
  mean.forEach((v, k) => mean[k] = v / cnt);
  const seen = new Uint8Array(n), q = [];
  for (let x = 0; x < gw; x++) { const i = x; if (L[i] > .12 && grad[i] < .12) { seen[i] = 1; q.push(i); } }
  while (q.length) {
    const i = q.pop(); out[i] = 1; const x = i % gw, y = (i / gw) | 0;
    for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
      if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue; const j = ny * gw + nx; if (seen[j] || L[j] < 0) continue;
      const dr = rgb[i * 3] - rgb[j * 3], dg = rgb[i * 3 + 1] - rgb[j * 3 + 1], db = rgb[i * 3 + 2] - rgb[j * 3 + 2], step = Math.sqrt(dr * dr + dg * dg + db * db);
      const mr = rgb[j * 3] - mean[0], mg = rgb[j * 3 + 1] - mean[1], mb = rgb[j * 3 + 2] - mean[2], far = Math.sqrt(mr * mr + mg * mg + mb * mb);
      if (step < .045 && grad[j] < .11 && far < .55 && L[j] > .08) { seen[j] = 1; q.push(j); }
    }
  }
  // Löcher und Wolken ergänzen: Bereiche ohne Kontakt zum unteren Rand, die eingeschlossen oder hell und farbarm sind
  const lab = new Int32Array(n).fill(-1);
  for (let i = 0; i < n; i++) {
    if (out[i] || lab[i] >= 0 || L[i] < 0) continue; const comp = [i]; lab[i] = i; let bottom = false, border = false, sl = 0, ss = 0;
    for (let k = 0; k < comp.length; k++) {
      const j = comp[k], x = j % gw, y = (j / gw) | 0; if (y >= gh - 2) bottom = true; if (x === 0 || x === gw - 1 || y === 0) border = true;
      sl += L[j]; const mx = Math.max(rgb[j * 3], rgb[j * 3 + 1], rgb[j * 3 + 2]), mn = Math.min(rgb[j * 3], rgb[j * 3 + 1], rgb[j * 3 + 2]); ss += mx - mn;
      for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) { if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue; const m = ny * gw + nx; if (!out[m] && lab[m] < 0 && L[m] >= 0) { lab[m] = i; comp.push(m); } }
    }
    if (bottom) continue;
    const ml = sl / comp.length, ms = ss / comp.length;
    if ((!border && comp.length < n * .1) || (ml > .55 && ms < .25 && comp.length < n * .25)) for (const j of comp) out[j] = 1;
  }
  // weiche Kante
  const tmp = new Float32Array(n);
  for (let pass = 0; pass < 2; pass++) { for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) { let a = 0, c = 0; for (let k = -1; k <= 1; k++) { const xx = pass ? x : clamp(x + k, 0, gw - 1), yy = pass ? clamp(y + k, 0, gh - 1) : y; a += out[yy * gw + xx]; c++; } tmp[y * gw + x] = a / c; } out.set(tmp); }
  return { data: out, w: gw, h: gh };
}
function rasterSky(c, W, H, s) {
  const sk = detectSky(s, W, H), o = new Uint8Array(W * H);
  if (!sk.data) return o;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const gx = clamp((x + .5) / W * sk.w - .5, 0, sk.w - 1.001), gy = clamp((y + .5) / H * sk.h - .5, 0, sk.h - 1.001), ix = gx | 0, iy = gy | 0, fx = gx - ix, fy = gy - iy, d = sk.data, w = sk.w;
    const v = (d[iy * w + ix] * (1 - fx) + d[iy * w + ix + 1] * fx) * (1 - fy) + (d[(iy + 1) * w + ix] * (1 - fx) + d[(iy + 1) * w + ix + 1] * fx) * fy;
    o[y * W + x] = clamp(smooth(.25, .75, v), 0, 1) * 255;
  }
  return o;
}
function rasterComp(c, W, H, s) { return c.type === 'sky' ? rasterSky(c, W, H, s) : rasterBrush(c, W, H, s); }

/* ---------- Upright: Linienanalyse ---------- */
function edgels() {
  const k = Math.min(1, 420 / Math.max(SRC.w, SRC.h)), W = Math.max(8, Math.round(SRC.w * k)), H = Math.max(8, Math.round(SRC.h * k)), g = new Float32Array(W * H), t = [0, 0, 0];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { srcRGB((x + .5) / W, (y + .5) / H, t); g[y * W + x] = luma(t[0], t[1], t[2]); }
  const out = [];
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
    const i = y * W + x;
    const gx = (g[i - W + 1] + 2 * g[i + 1] + g[i + W + 1]) - (g[i - W - 1] + 2 * g[i - 1] + g[i + W - 1]);
    const gy = (g[i + W - 1] + 2 * g[i + W] + g[i + W + 1]) - (g[i - W - 1] + 2 * g[i - W] + g[i - W + 1]);
    const m = Math.hypot(gx, gy); if (m < .35) continue;
    out.push({ x: (x + .5) / W, y: (y + .5) / H, dx: -gy / m, dy: gx / m, m });
  }
  out.sort((a, b) => b.m - a.m); const top = out.slice(0, 2500);
  // auf Kantenzüge beschränken: Punkte, deren Nachbarn ähnliche Richtung haben
  return top.filter((_, i) => i % Math.max(1, Math.floor(top.length / 900)) === 0);
}
function uprightAnalyze(s, mode) {
  const E = edgels(); if (E.length < 20) return null;
  const base = Object.assign(clone(s), { angle: 0, geoRotate: 0, geoV: 0, geoH: 0, geoScale: 100, geoX: 0, geoY: 0, geoAspect: 0, upright: 'off' });
  const f = frameSize(base, R.w, R.h);
  // Kantenpunkte in den unkorrigierten Rahmen übertragen (bei 0 Geometrie ist die Abbildung einfach invertierbar)
  const pts = E.map(e => {
    const [fx, fy] = srcToFrame(e.x, e.y, base, R.w, R.h), dsy0 = e.dy * R.w / R.h, l0 = Math.hypot(e.dx, dsy0) || 1, dsx = e.dx / l0, dsy = dsy0 / l0;
    const [fx2, fy2] = srcToFrame(e.x + dsx * .01, e.y + dsy * .01, base, R.w, R.h); const dx = (fx2 - fx) * f.w, dy = (fy2 - fy) * f.h, l = Math.hypot(dx, dy) || 1;
    return { sx: e.x, sy: e.y, dsx, dsy, dx: dx / l, dy: dy / l, m: e.m };
  });
  const lim = Math.sin(20 * Math.PI / 180), V = pts.filter(p => Math.abs(p.dx) < lim), Hz = pts.filter(p => Math.abs(p.dy) < lim);
  const cost = (cand, useV, useH) => {
    const t = Object.assign(clone(base), cand), fr = frameSize(t, R.w, R.h); let c = 0, wsum = 0;
    for (const [set, vertical, use] of [[V, true, useV], [Hz, false, useH]]) {
      if (!use) continue;
      for (const p of set) {
        const e = .006, [x1, y1] = srcToFrame(p.sx - p.dsx * e, p.sy - p.dsy * e, t, R.w, R.h), [x2, y2] = srcToFrame(p.sx + p.dsx * e, p.sy + p.dsy * e, t, R.w, R.h);
        const dx = (x2 - x1) * fr.w, dy = (y2 - y1) * fr.h, l = Math.hypot(dx, dy) || 1, dev = vertical ? dx / l : dy / l;
        c += p.m * Math.min(dev * dev, .03); wsum += p.m;
      }
    }
    return wsum ? c / wsum : 0;
  };
  const search = (keys, ranges, useV, useH) => {
    const best = {}; keys.forEach(k => best[k] = 0); let bc = cost(best, useV, useH);
    for (const step of ranges) {
      let improved = true, guard = 0;
      while (improved && guard++ < 40) { improved = false; for (const k of keys) for (const d of [-step, step]) { const cand = Object.assign({}, best, { [k]: clamp(best[k] + d, -60, 60) }); const c = cost(cand, useV, useH); if (c < bc - 1e-7) { bc = c; Object.assign(best, cand); improved = true; } } }
    }
    return best;
  };
  const rs = [4, 1, .25];
  let out;
  if (mode === 'level') out = search(['geoRotate'], [2, .5, .1], true, true);
  else if (mode === 'vertical') out = search(['geoRotate', 'geoV'], rs, true, false);
  else if (mode === 'full') out = search(['geoRotate', 'geoV', 'geoH'], rs, true, true);
  else { const full = search(['geoRotate', 'geoV', 'geoH'], rs, true, true); out = { geoRotate: full.geoRotate, geoV: full.geoV * .7, geoH: full.geoH * .5 }; }
  for (const k in out) out[k] = Math.round(out[k] * 10) / 10;
  return out;
}

/* ---------- Inhaltsbasiertes Entfernen: beste Quelle suchen ---------- */
function findHealSource(x, y, r) {
  const ar = SRC.w / SRC.h, ring = [], t = [0, 0, 0], u = [0, 0, 0];
  for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2; for (const rr of [1.15, 1.45]) ring.push([Math.cos(a) * r * rr / ar, Math.sin(a) * r * rr]); }
  const ref = ring.map(([dx, dy]) => srcRGB(clamp(x + dx, 0, 1), clamp(y + dy, 0, 1), [0, 0, 0]));
  let best = null, bs = Infinity;
  for (const dist of [2.2, 3, 4, 5.5]) for (let k = 0; k < 20; k++) {
    const a = k / 20 * Math.PI * 2 + dist, ox = Math.cos(a) * r * dist / ar, oy = Math.sin(a) * r * dist, cx = x + ox, cy = y + oy;
    if (cx - r * 1.5 / ar < 0 || cy - r * 1.5 < 0 || cx + r * 1.5 / ar > 1 || cy + r * 1.5 > 1) continue;
    let sc = 0; ring.forEach(([dx, dy], i) => { srcRGB(cx + dx, cy + dy, t); const e = ref[i]; sc += (t[0] - e[0]) ** 2 + (t[1] - e[1]) ** 2 + (t[2] - e[2]) ** 2; });
    let mean = 0, sq = 0; for (let j = 0; j < 9; j++) { srcRGB(cx + ((j % 3) - 1) * r * .5 / ar, cy + (((j / 3) | 0) - 1) * r * .5, u); const l = luma(u[0], u[1], u[2]); mean += l; sq += l * l; }
    const varc = sq / 9 - (mean / 9) ** 2; sc = sc / ring.length + varc * 2 + dist * .0004;
    if (sc < bs) { bs = sc; best = [cx, cy]; }
  }
  return best || [clamp(x + r * 2.5 / ar, 0, 1), y];
}

/* ---------- Automatik ---------- */
function computeStats(img, w, h) {
  const k = Math.min(1, 160 / Math.max(w, h)), c = mkCanvas(Math.round(w * k), Math.round(h * k)), x = c.getContext('2d');
  x.drawImage(img, 0, 0, c.width, c.height); const d = x.getImageData(0, 0, c.width, c.height).data;
  const lum = []; let r = 0, g = 0, b = 0;
  for (let i = 0; i < d.length; i += 4) { const R_ = d[i] / 255, G = d[i + 1] / 255, B = d[i + 2] / 255; lum.push(luma(R_, G, B)); r += srgbToLin(R_); g += srgbToLin(G); b += srgbToLin(B); }
  const mean = lum.reduce((a, v) => a + v, 0) / lum.length;
  lum.sort((a, b) => a - b); const n = lum.length, q = f => lum[Math.min(n - 1, Math.floor(f * n))];
  return { p1: q(.01), p5: q(.05), p50: q(.5), p95: q(.95), p98: q(.98), p99: q(.99), mean, r: r / n, g: g / n, b: b / n };
}
function autoTone(st) {
  if (!st) return {};
  const ev = clamp(Math.log2(Math.pow(.44 / Math.max(st.p50, .02), 2.2)) * .65, -2.5, 2.5), f = Math.pow(Math.pow(2, ev), 1 / 2.2);
  return {
    exposure: Math.round(ev * 100) / 100, contrast: Math.round(clamp((.72 - (st.p95 - st.p5)) * 60, -15, 30)),
    highlights: st.p99 * f > .95 ? -45 : -15, shadows: st.p5 * f < .08 ? 30 : 12,
    whites: Math.round(clamp((.97 - st.p99 * f) * 160, -40, 40)), blacks: Math.round(clamp((.03 - st.p1 * f) * 260, -45, 15)),
    vibrance: 12, saturation: 2
  };
}
function solveWB(r, g, b) { const a = .35, c = .3; r = Math.max(r, 1e-4); g = Math.max(g, 1e-4); b = Math.max(b, 1e-4); const t = Math.log(b / r) / (2 * a), ti = -Math.log(r * Math.exp(a * t) / g) / c; return { temp: clamp(Math.round(t * 100), -100, 100), tint: clamp(Math.round(ti * 100), -100, 100) }; }
function autoWB(st) { if (!st) return { temp: 0, tint: 0 }; const w = solveWB(st.r, st.g, st.b); return { temp: Math.round(w.temp * .7), tint: Math.round(w.tint * .7) }; }

/* ---------- Lokale Tonwertkarten (Guided Filter auf log2-Luminanz, feste 512-px-Kopie) ---------- */
function boxMean(src, W, H, r, out) {
  // Integralbild-Box-Filter mit Randkorrektur
  const I = new Float64Array((W + 1) * (H + 1));
  for (let y = 0; y < H; y++) { let row = 0; for (let x = 0; x < W; x++) { row += src[y * W + x]; I[(y + 1) * (W + 1) + x + 1] = I[y * (W + 1) + x + 1] + row; } }
  for (let y = 0; y < H; y++) { const y0 = Math.max(0, y - r), y1 = Math.min(H, y + r + 1); for (let x = 0; x < W; x++) { const x0 = Math.max(0, x - r), x1 = Math.min(W, x + r + 1); out[y * W + x] = (I[y1 * (W + 1) + x1] - I[y0 * (W + 1) + x1] - I[y1 * (W + 1) + x0] + I[y0 * (W + 1) + x0]) / ((y1 - y0) * (x1 - x0)); } }
  return out;
}
function guided(I, W, H, r, eps) {
  const n = W * H, mI = boxMean(I, W, H, r, new Float32Array(n)), I2 = new Float32Array(n);
  for (let i = 0; i < n; i++) I2[i] = I[i] * I[i];
  const mII = boxMean(I2, W, H, r, new Float32Array(n)), a = new Float32Array(n), b = new Float32Array(n);
  for (let i = 0; i < n; i++) { const v = Math.max(mII[i] - mI[i] * mI[i], 0); a[i] = v / (v + eps); b[i] = mI[i] * (1 - a[i]); }
  return [boxMean(a, W, H, r, new Float32Array(n)), boxMean(b, W, H, r, new Float32Array(n))];
}
function localMaps(img, w, h) {
  const k = Math.min(1, 512 / Math.max(w, h)), W = Math.max(4, Math.round(w * k)), H = Math.max(4, Math.round(h * k));
  const c = mkCanvas(W, H), x = c.getContext('2d', { willReadFrequently: true }); x.imageSmoothingQuality = 'high'; x.drawImage(img, 0, 0, W, H);
  const d = x.getImageData(0, 0, W, H).data, n = W * H, L = new Float32Array(n), Dk = new Float32Array(n), lin = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const r = srgbToLin(d[i * 4] / 255), g = srgbToLin(d[i * 4 + 1] / 255), b = srgbToLin(d[i * 4 + 2] / 255);
    lin[i * 3] = r; lin[i * 3 + 1] = g; lin[i * 3 + 2] = b;
    L[i] = Math.log2(Math.max(luma(r, g, b), 1e-4)); Dk[i] = Math.log2(Math.max(Math.min(r, g, b), 1e-4));
  }
  const long = Math.max(W, H), rSH = Math.max(2, Math.round(long * .032)), rC = Math.max(1, Math.round(long * .012));
  const [aL, bL] = guided(L, W, H, rSH, 1.5), [aD, bD] = guided(Dk, W, H, rSH, .5), [aC, bC] = guided(L, W, H, rC, .25);
  const sh = new Float32Array(n * 4), cl = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) { sh[i * 4] = aL[i]; sh[i * 4 + 1] = bL[i]; sh[i * 4 + 2] = aD[i]; sh[i * 4 + 3] = bD[i]; cl[i * 4] = aC[i]; cl[i * 4 + 1] = bC[i]; }
  const sorted = Float32Array.from(L).sort(), q = f => sorted[Math.min(n - 1, Math.floor(f * n))];
  // Luftlicht: hellste 5 % unter den 5 % Pixeln mit dem höchsten Dunkelkanal
  const idx = [...Array(n).keys()].sort((a, b) => Dk[b] - Dk[a]).slice(0, Math.max(1, Math.round(n * .05)));
  idx.sort((a, b) => L[b] - L[a]); const top = idx.slice(0, Math.max(1, Math.round(idx.length * .05)));
  const A = [0, 0, 0]; for (const i of top) { A[0] += lin[i * 3]; A[1] += lin[i * 3 + 1]; A[2] += lin[i * 3 + 2]; }
  let mean = 0; const enc = new Float32Array(n); for (let i = 0; i < n; i++) { enc[i] = luma(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]) / 255; mean += enc[i]; } mean /= n; enc.sort();
  const pivot = clamp(.577 + .568 * mean - .689 * (enc[Math.floor(n * .01)] + enc[Math.min(n - 1, Math.floor(n * .99))]) / 2, .3, .65);
  return { W, H, sh, cl, key99: q(.99), keyMed: q(.5), A: A.map(v => Math.max(v / top.length, .05)), pivot };
}
