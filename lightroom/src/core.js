'use strict';
/* ============================================================
   Dunkelkammer – Kern: Hilfsfunktionen, Datenmodell, Geometrie,
   Kurven, Profile, Speicher, EXIF
   ============================================================ */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const clone = o => JSON.parse(JSON.stringify(o));
const debounce = (f, ms) => { let t; const d = (...a) => { clearTimeout(t); t = setTimeout(() => f(...a), ms); }; d.cancel = () => clearTimeout(t); return d; };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const sleep = ms => new Promise(r => setTimeout(r, ms));
function el(tag, attrs = {}, ...kids) {
  const e = tag === 'svg' || tag === 'path' || tag === 'circle' || tag === 'rect' || tag === 'line' || tag === 'polyline' || tag === 'g' ? document.createElementNS('http://www.w3.org/2000/svg', tag) : document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v == null) continue;
    if (k === 'class') e.setAttribute('class', v);
    else if (k === 'style') e.style.cssText = v;
    else if (k === 'text') e.textContent = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) { if (k == null || k === false) continue; e.append(k.nodeType ? k : document.createTextNode(k)); }
  return e;
}
function getPath(o, p) { return p.split('.').reduce((a, k) => (a == null ? a : a[k]), o); }
function setPath(o, p, v) { const ks = p.split('.'); let a = o; for (let i = 0; i < ks.length - 1; i++) a = a[ks[i]]; a[ks[ks.length - 1]] = v; }
function de(v, d = 0) { return (+v).toFixed(d).replace('.', ',').replace(/^-(0(,0+)?)$/, '$1'); }
function signed(v, d = 0) { const s = de(Math.abs(v) < 1e-9 ? 0 : v, d); return v > 1e-9 ? '+' + s : s; }
function parseDe(s) { return parseFloat(String(s).replace(',', '.').replace(/[^\d.+-]/g, '')); }
function fmtBytes(b) { if (!b) return '–'; if (b < 1024 * 1024) return de(b / 1024, 0) + ' KB'; return de(b / 1048576, 1) + ' MB'; }
function fmtDate(t, withTime = true) { if (!t) return '–'; const d = new Date(t); if (isNaN(d)) return String(t); return d.toLocaleString('de-CH', withTime ? { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' } : { day: '2-digit', month: 'long', year: 'numeric' }); }
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
const store = {
  get(k, d) { try { const v = localStorage.getItem('dk2-' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('dk2-' + k, JSON.stringify(v)); } catch { } }
};
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, w | 0); c.height = Math.max(1, h | 0); return c; }
const srgbToLin = v => v <= .04045 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4);
const linToSrgb = v => v <= .0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - .055;
function rgbToHsl(r, g, b) { const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn; let h = 0, s = 0; if (d > 1e-6) { s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; } return [h, s, l]; }
function hslRgb(h, s, l) { if (!s) return [l, l, l]; const q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q; const f = t => { t = ((t % 1) + 1) % 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < .5) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; }; return [f(h + 1 / 3), f(h), f(h - 1 / 3)]; }
const luma = (r, g, b) => .2126 * r + .7152 * g + .0722 * b;

/* ---------- Entwicklungseinstellungen ---------- */
const HUES = [
  { k: 'red', n: 'Rot', h: 0 }, { k: 'orange', n: 'Orange', h: 30 }, { k: 'yellow', n: 'Gelb', h: 60 }, { k: 'green', n: 'Grün', h: 120 },
  { k: 'aqua', n: 'Aquamarin', h: 180 }, { k: 'blue', n: 'Blau', h: 240 }, { k: 'purple', n: 'Lila', h: 270 }, { k: 'magenta', n: 'Magenta', h: 300 }
];
const LINEAR = () => [[0, 0], [1, 1]];
const Z8 = () => [0, 0, 0, 0, 0, 0, 0, 0];
const DEFAULTS = () => ({
  profile: 'color', profileAmount: 100, bw: false,
  wb: 'shot', temp: 0, tint: 0,
  exposure: 0, contrast: 0, highlights: 0, shadows: 0, whites: 0, blacks: 0,
  curveMode: 'point', curve: { rgb: LINEAR(), r: LINEAR(), g: LINEAR(), b: LINEAR() },
  pcurve: { hi: 0, li: 0, da: 0, sh: 0, s1: 25, s2: 50, s3: 75 },
  vibrance: 0, saturation: 0,
  hue: Z8(), sat: Z8(), lum: Z8(), bwMix: Z8(), points: [],
  gS: { h: 0, s: 0, l: 0 }, gM: { h: 0, s: 0, l: 0 }, gH: { h: 0, s: 0, l: 0 }, gG: { h: 0, s: 0, l: 0 }, gBlend: 50, gBalance: 0,
  texture: 0, clarity: 0, dehaze: 0,
  vigAmount: 0, vigMid: 50, vigFeather: 50, vigRound: 0, vigHi: 0,
  grainAmount: 0, grainSize: 25, grainRough: 50,
  sharpen: 0, sharpRadius: 1, sharpDetail: 25, sharpMask: 0,
  nrLum: 0, nrDetail: 50, nrColor: 0,
  caRemove: false, fringePurple: 0, fringePurpleHue: 280, fringeGreen: 0, fringeGreenHue: 120, lensVig: 0, lensVigMid: 50, lensDist: 0,
  upright: 'off', geoV: 0, geoH: 0, geoRotate: 0, geoAspect: 0, geoScale: 100, geoX: 0, geoY: 0, geoDist: 0,
  crop: { x: 0, y: 0, w: 1, h: 1 }, angle: 0, rot: 0, flipH: false, flipV: false, aspect: 'orig', constrain: true,
  masks: [], spots: [], redeye: [],
  off: {}
});
const GEOMETRY_KEYS = ['crop', 'angle', 'rot', 'flipH', 'flipV', 'aspect', 'constrain', 'upright', 'geoV', 'geoH', 'geoRotate', 'geoAspect', 'geoScale', 'geoX', 'geoY', 'geoDist'];
const LOCAL_KEYS = ['masks', 'spots', 'redeye'];
function normalizeSettings(s) {
  const d = DEFAULTS(), o = Object.assign(d, clone(s || {}));
  for (const k of ['gS', 'gM', 'gH', 'gG']) o[k] = Object.assign({ h: 0, s: 0, l: 0 }, o[k]);
  o.curve = Object.assign({ rgb: LINEAR(), r: LINEAR(), g: LINEAR(), b: LINEAR() }, o.curve);
  o.pcurve = Object.assign(DEFAULTS().pcurve, o.pcurve);
  for (const k of ['hue', 'sat', 'lum', 'bwMix']) if (!Array.isArray(o[k]) || o[k].length !== 8) o[k] = Z8();
  o.off = o.off || {};
  return o;
}
function isEdited(s) { return JSON.stringify(normalizeSettings(s)) !== JSON.stringify(DEFAULTS()); }
function developPart(s) { const o = clone(s); for (const k of [...GEOMETRY_KEYS, ...LOCAL_KEYS]) delete o[k]; return o; }
function geomOf(s) { const o = {}; for (const k of GEOMETRY_KEYS) o[k] = clone(s[k]); return o; }
/* Abschnitte, die per Auge ausgeblendet werden können */
const SECTION_KEYS = {
  light: ['exposure', 'contrast', 'highlights', 'shadows', 'whites', 'blacks', 'curve', 'pcurve', 'curveMode'],
  color: ['wb', 'temp', 'tint', 'vibrance', 'saturation', 'hue', 'sat', 'lum', 'bwMix', 'points', 'gS', 'gM', 'gH', 'gG', 'gBlend', 'gBalance'],
  effects: ['texture', 'clarity', 'dehaze', 'vigAmount', 'vigMid', 'vigFeather', 'vigRound', 'vigHi', 'grainAmount', 'grainSize', 'grainRough'],
  detail: ['sharpen', 'sharpRadius', 'sharpDetail', 'sharpMask', 'nrLum', 'nrDetail', 'nrColor'],
  optics: ['caRemove', 'fringePurple', 'fringePurpleHue', 'fringeGreen', 'fringeGreenHue', 'lensVig', 'lensVigMid', 'lensDist'],
  geometry: ['upright', 'geoV', 'geoH', 'geoRotate', 'geoAspect', 'geoScale', 'geoX', 'geoY', 'geoDist'],
  masks: ['masks'], heal: ['spots', 'redeye']
};
/* Effektive Einstellungen: ausgeblendete Abschnitte auf Standard */
function effective(s) {
  if (!s.off || !Object.values(s.off).some(Boolean)) return s;
  const d = DEFAULTS(), o = Object.assign({}, s);
  for (const [sec, on] of Object.entries(s.off)) if (on && SECTION_KEYS[sec]) for (const k of SECTION_KEYS[sec]) o[k] = clone(d[k]);
  return o;
}

/* ---------- Kurven ---------- */
function curveFn(pts) {
  const p = pts.slice().sort((a, b) => a[0] - b[0]); const n = p.length;
  const xs = p.map(q => q[0]), ys = p.map(q => q[1]);
  if (n < 2) return x => x;
  const d = [], m = new Array(n);
  for (let i = 0; i < n - 1; i++) d[i] = (ys[i + 1] - ys[i]) / Math.max(xs[i + 1] - xs[i], 1e-6);
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (Math.abs(d[i]) < 1e-9) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
    if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
  }
  return x => {
    if (x <= xs[0]) return ys[0]; if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0; while (x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}
/* Parametrische Kurve: vier Bereiche mit verschiebbaren Teilungspunkten */
function pcurveFn(pc) {
  if (!pc.hi && !pc.li && !pc.da && !pc.sh) return x => x;
  const s1 = pc.s1 / 100, s2 = pc.s2 / 100, s3 = pc.s3 / 100;
  const bump = (x, a, b) => { if (x <= a || x >= b) return 0; const t = (x - a) / (b - a); return Math.sin(Math.PI * t); };
  return x => {
    let y = x;
    y += pc.sh / 100 * .25 * bump(x, 0, s1 + (s2 - s1) * .5);
    y += pc.da / 100 * .22 * bump(x, s1 * .5, s2 + (s3 - s2) * .4);
    y += pc.li / 100 * .22 * bump(x, s2 - (s2 - s1) * .4, s3 + (1 - s3) * .5);
    y += pc.hi / 100 * .25 * bump(x, s3 - (s3 - s2) * .5, 1);
    return clamp(y, 0, 1);
  };
}
/* Globale Tonkurve wie bei Adobe: Weiß → Schwarz → Kontrast (bildabhängiger Drehpunkt) → parametrisch → Punktkurve.
   Zeile 0: Hauptkurve über den Eingangsbereich 0..2 (für Lichter über 1), Zeile 1: Kanalkurven R/G/B über 0..1. */
function contrastPivot(st) { if (!st || st.mean == null) return .45; return clamp(.577 + .568 * st.mean - .689 * (st.p1 + st.p99) / 2, .3, .65); }
function toneFn(s, pivot) {
  const w = s.whites / 100, b = s.blacks / 100, c = s.contrast / 100, k = Math.pow(2, c), pv = pivot;
  const pf = s.curveMode === 'param' || (s.pcurve && (s.pcurve.hi || s.pcurve.li || s.pcurve.da || s.pcurve.sh)) ? pcurveFn(s.pcurve) : (x => x);
  const f = curveFn(s.curve.rgb);
  return x => {
    if (w > 0) x = x * (1 + w * .35 * smooth(.25, 1, x)); else if (w < 0) x = x - (-w) * .26 * smooth(.35, 1.6, x) * x;
    if (b > 0) x = x + b * .1 * (1 - smooth(0, .45, x)); else if (b < 0) x = x - (-b) * .12 * (1 - smooth(0, .45, x)) * Math.min(1, x * 12);
    x = Math.max(x, 0);
    if (c && x <= 1) x = x < pv ? pv * Math.pow(x / pv, k) : 1 - (1 - pv) * Math.pow((1 - x) / (1 - pv), k);
    x = clamp(x, 0, 1);
    return clamp(f(pf(x)), 0, 1);
  };
}
function buildLut(s, pivot = .45) {
  const T = toneFn(s, pivot), fr = curveFn(s.curve.r), fg = curveFn(s.curve.g), fb = curveFn(s.curve.b);
  const N = 512, lut = new Uint8Array(N * 2 * 4);
  for (let i = 0; i < N; i++) {
    const v = T(i / (N - 1) * 2); lut[i * 4] = lut[i * 4 + 1] = lut[i * 4 + 2] = Math.round(v * 255); lut[i * 4 + 3] = 255;
    const u = i / (N - 1), j = (N + i) * 4; lut[j] = Math.round(clamp(fr(u), 0, 1) * 255); lut[j + 1] = Math.round(clamp(fg(u), 0, 1) * 255); lut[j + 2] = Math.round(clamp(fb(u), 0, 1) * 255); lut[j + 3] = 255;
  }
  return lut;
}

/* ---------- Geometrie (identisch zum Shader) ---------- */
function frameSize(s, W, H) { const odd = s.rot % 2 === 1; return { w: odd ? H : W, h: odd ? W : H }; }
function outputSize(s, W, H) { const f = frameSize(s, W, H); return { w: Math.max(1, Math.round(s.crop.w * f.w)), h: Math.max(1, Math.round(s.crop.h * f.h)) }; }
function frameAngle(s) { return -((s.angle || 0) + (s.geoRotate || 0) + s.rot * 90) * Math.PI / 180; }
function geoParams(s) {
  return { pv: (s.geoV || 0) / 100 * .9, ph: (s.geoH || 0) / 100 * .9, sc: (s.geoScale || 100) / 100, ox: (s.geoX || 0) / 100 * .5, oy: (s.geoY || 0) / 100 * .5, asp: (s.geoAspect || 0) / 100 * .5, dist: ((s.geoDist || 0) + (s.lensDist || 0)) / 100 * .35 };
}
/* Rahmenkoordinate (0..1, vor dem Freistellen) → Quellkoordinate (0..1) */
function frameToSrc(px, py, s, W, H) {
  const f = frameSize(s, W, H); let qx = (px - .5) * f.w, qy = (py - .5) * f.h;
  const a = frameAngle(s), c = Math.cos(a), sn = Math.sin(a);
  let ux = (c * qx - sn * qy) / H, uy = (sn * qx + c * qy) / H;
  const g = geoParams(s);
  ux /= g.sc; uy /= g.sc; ux -= g.ox; uy -= g.oy; ux *= Math.exp(-g.asp); uy *= Math.exp(g.asp);
  const w = 1 + g.ph * ux + g.pv * uy; ux /= w; uy /= w;
  const r2 = ux * ux + uy * uy, k = 1 + g.dist * r2; ux *= k; uy *= k;
  let sx = ux * H / W + .5, sy = uy + .5;
  if (s.flipH) sx = 1 - sx; if (s.flipV) sy = 1 - sy; return [sx, sy];
}
/* Umkehrung per Newton-Verfahren (für Werkzeuggriffe auf dem Bild) */
function srcToFrame(sx, sy, s, W, H) {
  let x = sx, y = sy;
  for (let i = 0; i < 12; i++) {
    const [a, b] = frameToSrc(x, y, s, W, H), e = 1e-4;
    const [ax, bx] = frameToSrc(x + e, y, s, W, H), [ay, by] = frameToSrc(x, y + e, s, W, H);
    const j11 = (ax - a) / e, j12 = (ay - a) / e, j21 = (bx - b) / e, j22 = (by - b) / e, det = j11 * j22 - j12 * j21;
    if (Math.abs(det) < 1e-12) break;
    const dx = a - sx, dy = b - sy; x -= (j22 * dx - j12 * dy) / det; y -= (-j21 * dx + j11 * dy) / det;
    if (Math.abs(dx) + Math.abs(dy) < 1e-7) break;
  }
  return [x, y];
}
function rectInside(r, s, W, H) {
  const e = 1e-4, pts = [];
  for (let i = 0; i <= 4; i++) { pts.push([r.x + r.w * i / 4, r.y], [r.x + r.w * i / 4, r.y + r.h], [r.x, r.y + r.h * i / 4], [r.x + r.w, r.y + r.h * i / 4]); }
  for (const [x, y] of pts) {
    if (x < -e || y < -e || x > 1 + e || y > 1 + e) return false;
    const [a, b] = frameToSrc(x, y, s, W, H); if (a < -e || b < -e || a > 1 + e || b > 1 + e) return false;
  }
  return true;
}
function shrinkToFit(r, s, W, H) {
  if (!s.constrain || rectInside(r, s, W, H)) return r;
  let cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  const at = k => ({ x: cx - r.w * k / 2, y: cy - r.h * k / 2, w: r.w * k, h: r.h * k });
  if (!rectInside(at(.002), s, W, H)) { cx = .5; cy = .5; }
  let lo = .002, hi = 1; for (let i = 0; i < 28; i++) { const m = (lo + hi) / 2; if (rectInside(at(m), s, W, H)) lo = m; else hi = m; }
  return at(lo);
}
function aspectRatio(s, W, H) {
  if (!s.aspect || s.aspect === 'free') return 0;
  const f = frameSize(s, W, H);
  if (s.aspect === 'orig') return f.w / f.h;
  const [a, b] = s.aspect.split(':').map(Number); return a / b;
}

/* ---------- Profile (3D-LUT-Funktionen auf Anzeigewerten 0..1) ---------- */
function satAdj(r, g, b, k) { const l = luma(r, g, b); return [l + (r - l) * k, l + (g - l) * k, l + (b - l) * k]; }
function sCurve(x, k) { const s = x * x * (3 - 2 * x); return x + (s - x) * k; }
function hueSatFn(fn) { return (r, g, b) => { const [h, s, l] = rgbToHsl(r, g, b); const o = fn(h * 360, s, l); return hslRgb(((o[0] / 360) % 1 + 1) % 1, clamp(o[1], 0, 1), clamp(o[2], 0, 1)); }; }
function tone(r, g, b, t) { return [r + t[0], g + t[1], b + t[2]]; }
function split(r, g, b, sh, hi, k = 1) { const l = luma(r, g, b), ws = 1 - smooth(0, .55, l), wh = smooth(.45, 1, l); const a = hslRgb(sh[0] / 360, 1, .5), c = hslRgb(hi[0] / 360, 1, .5), la = luma(...a), lc = luma(...c); return [0, 1, 2].map(i => [r, g, b][i] + ((a[i] - la) * sh[1] * ws + (c[i] - lc) * hi[1] * wh) * k); }
function mono(r, g, b, w = [.3, .59, .11]) { const v = r * w[0] + g * w[1] + b * w[2]; return [v, v, v]; }
const PROFILES = [
  { id: 'color', g: 'Standard', n: 'Farbe', f: null },
  { id: 'landscape', g: 'Standard', n: 'Landschaft', f: (r, g, b) => { let [h, s, l] = rgbToHsl(r, g, b); const hd = h * 360; const boost = hd > 70 && hd < 260 ? .28 : .1; s = clamp(s * (1 + boost), 0, 1); const c = hslRgb(h, s, l); return c.map(v => sCurve(v, .22)); } },
  { id: 'portrait', g: 'Standard', n: 'Porträt', f: (r, g, b) => { let [h, s, l] = rgbToHsl(r, g, b); const hd = h * 360; if (hd < 50 || hd > 345) { s *= .88; l = l + (1 - l) * .03; } return hslRgb(h, s, l).map(v => sCurve(v, -.06)); } },
  { id: 'vivid', g: 'Standard', n: 'Lebendig', f: (r, g, b) => satAdj(...[r, g, b].map(v => sCurve(v, .3)), 1.3) },
  { id: 'neutral', g: 'Standard', n: 'Neutral', f: (r, g, b) => satAdj(...[r, g, b].map(v => sCurve(v, -.22)), .9) },
  { id: 'mono', g: 'Standard', n: 'Monochrom', bw: true, f: (r, g, b) => mono(r, g, b, [.28, .62, .1]).map(v => sCurve(v, .1)) },
  { id: 'cine1', g: 'Kinematisch', n: 'Kinematisch 01', f: (r, g, b) => { const c = split(r, g, b, [195, .32], [32, .28]); return satAdj(...c.map(v => sCurve(v, .18)), .92); } },
  { id: 'cine2', g: 'Kinematisch', n: 'Kinematisch 02', f: (r, g, b) => { const c = split(r, g, b, [170, .25], [45, .18]); return c.map(v => .05 + v * .9); } },
  { id: 'cine3', g: 'Kinematisch', n: 'Kinematisch 03', f: (r, g, b) => { const c = satAdj(r, g, b, .7); return split(...c, [220, .3], [20, .12]).map(v => sCurve(v, .25)); } },
  { id: 'vint1', g: 'Vintage', n: 'Vintage 01', f: (r, g, b) => { const c = split(...satAdj(r, g, b, .75), [160, .2], [48, .3]); return c.map(v => .07 + v * .86); } },
  { id: 'vint2', g: 'Vintage', n: 'Vintage 02', f: (r, g, b) => tone(...satAdj(r, g, b, .6).map(v => .1 + v * .82), [.04, .015, -.03]) },
  { id: 'vint3', g: 'Vintage', n: 'Vintage 03', f: hueSatFn((h, s, l) => [h + (h > 80 && h < 200 ? 18 : 0), s * .8, .06 + l * .88]) },
  { id: 'mod1', g: 'Modern', n: 'Modern 01', f: (r, g, b) => satAdj(...split(r, g, b, [240, .18], [55, .12]).map(v => sCurve(v, .32)), .85) },
  { id: 'mod2', g: 'Modern', n: 'Modern 02', f: hueSatFn((h, s, l) => [h > 90 && h < 170 ? h + 25 : h, s * (h > 15 && h < 50 ? 1.15 : .8), l]) },
  { id: 'art1', g: 'Künstlerisch', n: 'Künstlerisch 01', f: (r, g, b) => [sCurve(r, .35), sCurve(g, .1), clamp(b * .85 + .1, 0, 1)] },
  { id: 'art2', g: 'Künstlerisch', n: 'Künstlerisch 02', f: (r, g, b) => [clamp(r * .9 + .06, 0, 1), sCurve(g, .3), sCurve(b, -.2) * .95 + .04] },
  { id: 'bw1', g: 'Schwarzweiß', n: 'S/W 01', bw: true, f: (r, g, b) => mono(r, g, b, [.4, .5, .1]).map(v => sCurve(v, .3)) },
  { id: 'bw2', g: 'Schwarzweiß', n: 'S/W 02', bw: true, f: (r, g, b) => mono(r, g, b, [.2, .7, .1]).map(v => .06 + sCurve(v, -.1) * .9) },
  { id: 'bw3', g: 'Schwarzweiß', n: 'S/W 03', bw: true, f: (r, g, b) => { const v = mono(r, g, b, [.55, .4, .05])[0]; return tone(...[v, v, v].map(x => sCurve(x, .45)), [.025, .01, -.02]); } },
  { id: 'bw4', g: 'Schwarzweiß', n: 'S/W 04', bw: true, f: (r, g, b) => { const v = sCurve(mono(r, g, b, [.15, .45, .4])[0], .2); return split(v, v, v, [215, .25], [40, .15]); } }
];
const PROFILE_BY_ID = Object.fromEntries(PROFILES.map(p => [p.id, p]));
function buildProfileLut(id, N = 33) {
  const p = PROFILE_BY_ID[id]; const out = new Uint8Array(N * N * N * 4);
  for (let b = 0; b < N; b++) for (let g = 0; g < N; g++) for (let r = 0; r < N; r++) {
    const i = ((b * N + g) * N + r) * 4; let c = [r / (N - 1), g / (N - 1), b / (N - 1)];
    if (p && p.f) c = p.f(c[0], c[1], c[2]);
    out[i] = Math.round(clamp(c[0], 0, 1) * 255); out[i + 1] = Math.round(clamp(c[1], 0, 1) * 255); out[i + 2] = Math.round(clamp(c[2], 0, 1) * 255); out[i + 3] = 255;
  }
  return out;
}

/* ---------- Speicher ---------- */
const DB = {
  db: null, mem: new Map(),
  async open() {
    try {
      this.db = await new Promise((res, rej) => {
        const r = indexedDB.open('dunkelkammer2', 1);
        r.onupgradeneeded = () => { const d = r.result; d.createObjectStore('photos', { keyPath: 'id' }); d.createObjectStore('blobs'); d.createObjectStore('meta'); };
        r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); setTimeout(() => rej(new Error('timeout')), 4000);
      });
    } catch { this.db = null; }
    return !!this.db;
  },
  req(st, mode, fn) {
    if (!this.db) return Promise.resolve(undefined);
    return new Promise(res => { try { const t = this.db.transaction(st, mode); const q = fn(t.objectStore(st)); t.oncomplete = () => res(q && q.result); t.onerror = t.onabort = () => res(undefined); } catch { res(undefined); } });
  },
  all() { return this.req('photos', 'readonly', s => s.getAll()); },
  put(rec) { return this.req('photos', 'readwrite', s => s.put(rec)); },
  getMeta(k) { return this.req('meta', 'readonly', s => s.get(k)); },
  setMeta(k, v) { return this.req('meta', 'readwrite', s => s.put(v, k)); },
  async putBlob(id, blob) { this.mem.set(id, blob); if (this.db) await this.req('blobs', 'readwrite', s => s.put(blob, id)); },
  async getBlob(id) { if (this.mem.has(id)) return this.mem.get(id); return this.req('blobs', 'readonly', s => s.get(id)); },
  async del(id) { this.mem.delete(id); await this.req('photos', 'readwrite', s => s.delete(id)); await this.req('blobs', 'readwrite', s => s.delete(id)); }
};

/* ---------- EXIF (JPEG) ---------- */
function parseExif(buf) {
  try {
    const v = new DataView(buf); if (v.getUint16(0) !== 0xFFD8) return null;
    let o = 2;
    while (o < v.byteLength - 10) {
      const m = v.getUint16(o); if ((m & 0xFF00) !== 0xFF00) break;
      const len = v.getUint16(o + 2);
      if (m === 0xFFE1 && v.getUint32(o + 4) === 0x45786966) return readTiff(v, o + 10);
      o += 2 + len;
    }
  } catch { }
  return null;
}
function readTiff(v, t) {
  const le = v.getUint16(t) === 0x4949; const u16 = p => v.getUint16(p, le), u32 = p => v.getUint32(p, le);
  const T0 = { 0x010F: 'Make', 0x0110: 'Model', 0x0132: 'DateTime', 0x8769: 'ExifIFD', 0x8825: 'GPSIFD' };
  const TX = { 0x829A: 'ExposureTime', 0x829D: 'FNumber', 0x8827: 'ISO', 0x9003: 'DateTimeOriginal', 0x920A: 'FocalLength', 0xA434: 'LensModel', 0x9204: 'ExposureBias', 0x9209: 'Flash' };
  const TG = { 0x0001: 'GPSLatRef', 0x0002: 'GPSLat', 0x0003: 'GPSLonRef', 0x0004: 'GPSLon' };
  const SZ = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 }, out = {};
  const val = (type, cnt, e) => {
    const total = (SZ[type] || 1) * cnt, p = total > 4 ? t + u32(e) : e;
    if (p + total > v.byteLength) return undefined;
    if (type === 2) { let s = ''; for (let i = 0; i < cnt - 1; i++) { const c = v.getUint8(p + i); if (!c) break; s += String.fromCharCode(c); } return s.trim(); }
    if (type === 3) return u16(p); if (type === 4) return u32(p);
    if (type === 5) { if (cnt > 1) { const a = []; for (let i = 0; i < cnt; i++) { const d = u32(p + i * 8 + 4); a.push(d ? u32(p + i * 8) / d : 0); } return a; } const d = u32(p + 4); return d ? u32(p) / d : 0; }
    if (type === 10) { const d = v.getInt32(p + 4, le); return d ? v.getInt32(p, le) / d : 0; }
  };
  const ifd = (off, tags) => {
    if (t + off + 2 > v.byteLength) return; const n = u16(t + off);
    for (let i = 0; i < n; i++) { const e = t + off + 2 + i * 12; if (e + 12 > v.byteLength) break; const name = tags[u16(e)]; if (name) out[name] = val(u16(e + 2), u32(e + 4), e + 8); }
  };
  ifd(u32(t + 4), T0); if (out.ExifIFD) ifd(out.ExifIFD, TX); if (out.GPSIFD) ifd(out.GPSIFD, TG); delete out.ExifIFD; delete out.GPSIFD;
  return Object.keys(out).length ? out : null;
}
function exifParts(x) {
  if (!x) return [];
  const p = [];
  if (x.ISO) p.push('ISO ' + x.ISO);
  if (x.FocalLength) p.push(de(x.FocalLength, 0) + ' mm');
  if (x.FNumber) p.push('f/' + de(x.FNumber, x.FNumber < 10 ? 1 : 0));
  if (x.ExposureTime) p.push(x.ExposureTime >= 1 ? de(x.ExposureTime, 1) + ' s' : '1/' + Math.round(1 / x.ExposureTime) + ' s');
  return p;
}
function exifDate(s) { if (!s) return null; const m = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/.exec(s); return m ? new Date(+m[1], m[2] - 1, +m[3], +m[4], +m[5], +m[6]).getTime() : null; }
