/* ============================================================
   Beispielfotos (prozedural erzeugt, keine externen Dateien)
   ============================================================ */
function rng(seed) { let s = seed % 2147483647; if (s <= 0) s += 2147483646; return () => (s = s * 16807 % 2147483647) / 2147483647; }
function noiseGen(seed) {
  const r = rng(seed), perm = [...Array(256).keys()];
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
  const p = new Uint8Array(512); for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
  const val = (x, y) => p[(p[x & 255] + (y & 255)) & 511] / 255;
  const n2 = (x, y) => { const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, u = fx * fx * (3 - 2 * fx), w = fy * fy * (3 - 2 * fy); const a = val(ix, iy), b = val(ix + 1, iy), c = val(ix, iy + 1), d = val(ix + 1, iy + 1); return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w; };
  const fbm = (x, y, o = 5) => { let s = 0, a = .5, f = 1, n = 0; for (let i = 0; i < o; i++) { s += a * n2(x * f, y * f); n += a; a *= .5; f *= 2; } return s / n; };
  return { n2, fbm, r };
}
function cloudLayer(x, W, H, N, o) {
  const cw = Math.ceil(W / 6), ch = Math.ceil(H / 6), c = mkCanvas(cw, ch), cx = c.getContext('2d'), id = cx.createImageData(cw, ch);
  for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) {
    const v = N.fbm(i / cw * o.sx + o.ox, j / ch * o.sy, 6);
    let a = clamp((v - o.th) / (o.soft), 0, 1); a *= o.fade ? o.fade(j / ch) : 1;
    const k = (j * cw + i) * 4, sh = clamp((v - o.th) * 2.2, 0, 1);
    id.data[k] = o.lit[0] * (1 - sh) + o.dark[0] * sh; id.data[k + 1] = o.lit[1] * (1 - sh) + o.dark[1] * sh; id.data[k + 2] = o.lit[2] * (1 - sh) + o.dark[2] * sh; id.data[k + 3] = a * 255 * o.alpha;
  }
  cx.putImageData(id, 0, 0); x.imageSmoothingQuality = 'high'; x.drawImage(c, 0, 0, W, H);
}
function ridge(x, W, base, H, N, o) {
  x.beginPath(); x.moveTo(0, base);
  for (let i = 0; i <= W; i += 3) { const t = i / W; let n = N.fbm(t * o.f + o.ox, o.oy, 6); n = 1 - Math.abs(n * 2 - 1); const y = base - H * (o.b + o.a * (o.ridged ? n * n : N.fbm(t * o.f + o.ox, o.oy + 3, 5))); x.lineTo(i, y); }
  x.lineTo(W, base); x.closePath();
}
function addGrain(c, amt, colorAmt, seed) {
  const x = c.getContext('2d'), d = x.getImageData(0, 0, c.width, c.height), a = d.data, r = rng(seed);
  for (let i = 0; i < a.length; i += 4) { const n = (r() + r() + r() - 1.5) * amt; const cr = colorAmt ? (r() - .5) * colorAmt : 0, cb = colorAmt ? (r() - .5) * colorAmt : 0; a[i] = a[i] + n + cr; a[i + 1] = a[i + 1] + n; a[i + 2] = a[i + 2] + n + cb; }
  x.putImageData(d, 0, 0);
}
function sceneLake() {
  const W = 1500, H = 1000, c = mkCanvas(W, H), x = c.getContext('2d'), N = noiseGen(11), hz = Math.round(H * .58);
  let g = x.createLinearGradient(0, 0, 0, hz); g.addColorStop(0, '#1c2547'); g.addColorStop(.42, '#5e4a72'); g.addColorStop(.78, '#cf7c5c'); g.addColorStop(1, '#efbd82');
  x.fillStyle = g; x.fillRect(0, 0, W, hz);
  const sx = W * .66, sy = hz - H * .27; g = x.createRadialGradient(sx, sy, 0, sx, sy, H * .6);
  g.addColorStop(0, 'rgba(255,246,214,1)'); g.addColorStop(.035, 'rgba(255,230,180,.95)'); g.addColorStop(.14, 'rgba(255,184,120,.45)'); g.addColorStop(1, 'rgba(255,150,100,0)');
  x.fillStyle = g; x.fillRect(0, 0, W, hz);
  cloudLayer(x, W, hz * .8, N, { sx: 2.5, sy: 8, ox: 3, th: .52, soft: .16, lit: [255, 176, 150], dark: [86, 58, 96], alpha: .9, fade: t => 1 - t * .6 });
  const layers = [{ b: .17, a: .2, f: 2.1, col: ['#7d6e92', '#a08aa0'], ox: 1 }, { b: .07, a: .17, f: 3.3, col: ['#4c4466', '#5f5576'], ox: 7, ridged: true }, { b: .02, a: .08, f: 6, col: ['#252338', '#2d2a40'], ox: 13 }];
  for (const L of layers) { ridge(x, W, hz, H, N, { b: L.b, a: L.a, f: L.f, ox: L.ox, oy: L.ox * .7, ridged: L.ridged }); g = x.createLinearGradient(0, hz - H * (L.b + L.a), 0, hz); g.addColorStop(0, L.col[0]); g.addColorStop(1, L.col[1]); x.fillStyle = g; x.fill(); }
  // Uferbäume
  const r = N.r; x.fillStyle = '#16151f';
  for (let i = 0; i < 160; i++) { const tx = r() * W, th = 8 + r() * 34, tw = th * .32; x.beginPath(); x.moveTo(tx - tw, hz + 2); x.lineTo(tx, hz - th); x.lineTo(tx + tw, hz + 2); x.fill(); }
  x.fillRect(0, hz - 3, W, 6);
  // Spiegelung: oberen Bildteil vertikal gespiegelt unter den Horizont legen
  const tmp = mkCanvas(W, hz); tmp.getContext('2d').drawImage(c, 0, 0);
  x.save(); x.beginPath(); x.rect(0, hz, W, H - hz); x.clip(); x.translate(0, hz * 2); x.scale(1, -1); x.globalAlpha = .9; x.drawImage(tmp, 0, 0); x.restore();
  g = x.createLinearGradient(0, hz, 0, H); g.addColorStop(0, 'rgba(24,30,58,.25)'); g.addColorStop(1, 'rgba(10,14,30,.7)'); x.fillStyle = g; x.fillRect(0, hz, W, H - hz);
  for (let i = 0; i < 900; i++) { const y = hz + Math.pow(r(), 1.6) * (H - hz), len = 10 + r() * 80 * (y - hz) / (H - hz) + 6; x.fillStyle = r() < .5 ? 'rgba(255,220,180,.10)' : 'rgba(0,0,20,.16)'; x.fillRect(r() * W, y, len, 1 + (y - hz) / 220); }
  // flach & leicht unterbelichtet wie ein Kamera-JPEG mit Reserven
  x.fillStyle = 'rgba(70,70,80,.1)'; x.fillRect(0, 0, W, H);
  addGrain(c, 5, 0, 3); return c;
}
function sceneCoast() {
  const W = 1500, H = 1000, c = mkCanvas(W, H), x = c.getContext('2d'), N = noiseGen(29), r = N.r, hz = Math.round(H * .47);
  let g = x.createLinearGradient(0, 0, 0, hz); g.addColorStop(0, '#2f6db8'); g.addColorStop(1, '#a8d0ee'); x.fillStyle = g; x.fillRect(0, 0, W, hz);
  cloudLayer(x, W, hz, N, { sx: 3.2, sy: 4.5, ox: 8, th: .5, soft: .12, lit: [255, 255, 255], dark: [150, 165, 190], alpha: 1, fade: t => clamp(1.25 - t, 0, 1) });
  g = x.createLinearGradient(0, hz, 0, H * .74); g.addColorStop(0, '#1d5f86'); g.addColorStop(.6, '#1f7f8f'); g.addColorStop(1, '#3fa6a1'); x.fillStyle = g; x.fillRect(0, hz, W, H * .74 - hz);
  for (let i = 0; i < 2200; i++) { const t = Math.pow(r(), .8), y = hz + t * (H * .74 - hz), w = 4 + t * 50 * r(); x.fillStyle = `rgba(255,255,255,${(.08 + t * .25) * r()})`; x.fillRect(r() * W, y, w, 1 + t * 2); }
  // Schaumlinie und Sand
  x.beginPath(); x.moveTo(0, H); for (let i = 0; i <= W; i += 4) x.lineTo(i, H * .72 + Math.sin(i / 90) * 10 + N.fbm(i / 200, 4) * 30); x.lineTo(W, H); x.closePath();
  g = x.createLinearGradient(0, H * .72, 0, H); g.addColorStop(0, '#e9dcc2'); g.addColorStop(.12, '#cbb28a'); g.addColorStop(1, '#a98d66'); x.fillStyle = g; x.fill();
  x.strokeStyle = 'rgba(255,255,255,.85)'; x.lineWidth = 4; x.beginPath(); for (let i = 0; i <= W; i += 4) { const y = H * .72 + Math.sin(i / 90) * 10 + N.fbm(i / 200, 4) * 30; i ? x.lineTo(i, y) : x.moveTo(i, y); } x.stroke();
  for (let i = 0; i < 6000; i++) { x.fillStyle = r() < .5 ? 'rgba(90,70,40,.18)' : 'rgba(255,245,220,.18)'; x.fillRect(r() * W, H * .75 + r() * H * .25, 2, 2); }
  // Felsen
  const rock = (cx, cy, rw, rh) => { x.beginPath(); for (let a = 0; a <= Math.PI * 2 + .01; a += .15) { const k = .75 + N.fbm(cx + Math.cos(a) * 2, cy + Math.sin(a) * 2, 4) * .5; x.lineTo(cx + Math.cos(a) * rw * k, cy + Math.min(0, Math.sin(a)) * rh * k + Math.max(0, Math.sin(a)) * rh * .25); } x.closePath(); g = x.createLinearGradient(cx - rw, cy - rh, cx + rw, cy); g.addColorStop(0, '#6b6259'); g.addColorStop(1, '#2b2724'); x.fillStyle = g; x.fill(); };
  rock(1180, H * .74, 220, 190); rock(1400, H * .76, 140, 120); rock(980, H * .76, 90, 60);
  x.fillStyle = 'rgba(255,255,255,.07)'; x.fillRect(0, 0, W, H);
  addGrain(c, 4, 0, 5); return c;
}
function sceneForest() {
  const W = 1000, H = 1400, c = mkCanvas(W, H), x = c.getContext('2d'), N = noiseGen(47), r = N.r;
  let g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#c9d1bf'); g.addColorStop(.6, '#9aa88d'); g.addColorStop(1, '#55613f'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  for (let layer = 0; layer < 5; layer++) {
    const d = layer / 4, n = 14 - layer * 2, col = [Math.round(170 - d * 140), Math.round(178 - d * 140), Math.round(160 - d * 135)];
    for (let i = 0; i < n; i++) {
      const tx = r() * W, tw = 8 + d * 46 + r() * 10; g = x.createLinearGradient(tx - tw, 0, tx + tw, 0);
      g.addColorStop(0, `rgb(${col.map(v => v * .8 | 0)})`); g.addColorStop(.5, `rgb(${col})`); g.addColorStop(1, `rgb(${col.map(v => v * .7 | 0)})`);
      x.fillStyle = g; x.fillRect(tx - tw / 2, 0, tw, H * (.78 + d * .2));
    }
    x.fillStyle = `rgba(200,210,195,${.18 - d * .03})`; x.fillRect(0, 0, W, H);
  }
  x.save(); x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 7; i++) { const x0 = W * (.45 + r() * .6), w0 = 30 + r() * 70; g = x.createLinearGradient(x0, 0, x0 - W * .5, H); g.addColorStop(0, 'rgba(255,246,210,.22)'); g.addColorStop(1, 'rgba(255,246,210,0)'); x.fillStyle = g; x.beginPath(); x.moveTo(x0, 0); x.lineTo(x0 + w0, 0); x.lineTo(x0 + w0 - W * .55, H); x.lineTo(x0 - W * .55 - w0 * 1.5, H); x.fill(); }
  x.restore();
  for (let i = 0; i < 2600; i++) { const fx = r() * W, fy = H * .8 + Math.pow(r(), .6) * H * .2, l = 10 + r() * 30, a = -Math.PI / 2 + (r() - .5) * 1.6; x.strokeStyle = `rgba(${40 + r() * 50 | 0},${70 + r() * 60 | 0},${25 + r() * 30 | 0},.7)`; x.lineWidth = 1.5; x.beginPath(); x.moveTo(fx, fy); x.lineTo(fx + Math.cos(a) * l, fy + Math.sin(a) * l); x.stroke(); }
  x.fillStyle = 'rgba(205,212,200,.22)'; x.fillRect(0, 0, W, H);
  addGrain(c, 5, 0, 9); return c;
}
function sceneNight() {
  const W = 1500, H = 1000, c = mkCanvas(W, H), x = c.getContext('2d'), N = noiseGen(83), r = N.r, street = H * .74;
  let g = x.createLinearGradient(0, 0, 0, street); g.addColorStop(0, '#070c1f'); g.addColorStop(1, '#2a2c4f'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 120; i++) { x.fillStyle = `rgba(255,255,255,${r() * .6})`; x.fillRect(r() * W, r() * H * .35, 1.5, 1.5); }
  const lights = [];
  let bx = -20; while (bx < W) {
    const bw = 90 + r() * 120, bh = H * (.32 + r() * .3), top = street - bh, shade = 18 + r() * 16 | 0;
    x.fillStyle = `rgb(${shade},${shade - 3},${shade + 8})`; x.beginPath(); x.moveTo(bx, street); x.lineTo(bx, top); x.lineTo(bx + bw / 2, top - bw * .45); x.lineTo(bx + bw, top); x.lineTo(bx + bw, street); x.fill();
    for (let wy = top + 22; wy < street - 40; wy += 46) for (let wx = bx + 16; wx < bx + bw - 24; wx += 34) { if (r() < .42) { const warm = r() < .8; x.fillStyle = warm ? `rgb(255,${190 + r() * 40 | 0},${90 + r() * 50 | 0})` : '#9fc4ff'; x.fillRect(wx, wy, 16, 24); lights.push([wx + 8, wy + 12, warm]); } else { x.fillStyle = '#101018'; x.fillRect(wx, wy, 16, 24); } }
    bx += bw + 4;
  }
  x.save(); x.globalCompositeOperation = 'lighter';
  for (const [lx, ly, warm] of lights) { g = x.createRadialGradient(lx, ly, 0, lx, ly, 30); g.addColorStop(0, warm ? 'rgba(255,190,100,.35)' : 'rgba(140,180,255,.3)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(lx - 30, ly - 30, 60, 60); }
  x.restore();
  g = x.createLinearGradient(0, street, 0, H); g.addColorStop(0, '#1b1a26'); g.addColorStop(1, '#0b0b12'); x.fillStyle = g; x.fillRect(0, street, W, H - street);
  x.save(); x.globalCompositeOperation = 'lighter';
  for (const [lx, ly, warm] of lights) { if (r() < .5) continue; const ry = street + (street - ly) * .35; g = x.createLinearGradient(0, street, 0, ry + 40); g.addColorStop(0, warm ? 'rgba(255,170,80,.0)' : 'rgba(120,160,255,0)'); g.addColorStop(.5, warm ? 'rgba(255,170,80,.16)' : 'rgba(120,160,255,.12)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(lx - 7, street, 14, ry - street + 40); }
  for (let i = 0; i < 6; i++) { const lx = 120 + i * 260 + r() * 40; x.fillStyle = '#222'; x.fillRect(lx - 3, street - 210, 6, 210); g = x.createRadialGradient(lx, street - 214, 0, lx, street - 214, 140); g.addColorStop(0, 'rgba(255,214,150,.9)'); g.addColorStop(.08, 'rgba(255,190,110,.5)'); g.addColorStop(1, 'rgba(255,150,60,0)'); x.fillStyle = g; x.fillRect(lx - 140, street - 354, 280, 280); }
  for (let i = 0; i < 26; i++) { const bxx = r() * W, byy = street + 30 + r() * (H - street - 30), br = 14 + r() * 30; x.fillStyle = r() < .7 ? `rgba(255,180,90,${.08 + r() * .1})` : `rgba(120,170,255,${.08 + r() * .1})`; x.beginPath(); x.arc(bxx, byy, br, 0, Math.PI * 2); x.fill(); }
  x.restore();
  addGrain(c, 16, 22, 13); return c;
}
function sceneFacade() {
  /* Altbaufassade, schräg von unten fotografiert: stürzende Linien und leicht verkippt */
  const W = 1200, H = 1500, flat = mkCanvas(W, H), x = flat.getContext('2d'), N = noiseGen(57), r = N.r;
  let g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#7fb2e6'); g.addColorStop(1, '#cfe2f3'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  const bx = 120, bw = W - 240, top = 180;
  g = x.createLinearGradient(bx, 0, bx + bw, 0); g.addColorStop(0, '#d9c3a0'); g.addColorStop(1, '#c4a982'); x.fillStyle = g; x.fillRect(bx, top, bw, H - top);
  x.fillStyle = '#8a6f52'; x.fillRect(bx - 20, top - 30, bw + 40, 34); x.fillRect(bx - 10, top + 360, bw + 20, 14); x.fillRect(bx - 10, top + 760, bw + 20, 14);
  for (let row = 0; row < 4; row++) for (let col = 0; col < 5; col++) {
    const wx = bx + 50 + col * (bw - 100) / 5 + 14, wy = top + 70 + row * 300, ww = (bw - 100) / 5 - 40, wh = 190;
    x.fillStyle = '#efe6d4'; x.fillRect(wx - 10, wy - 10, ww + 20, wh + 20);
    g = x.createLinearGradient(wx, wy, wx + ww, wy + wh); g.addColorStop(0, '#3b5670'); g.addColorStop(1, '#1b2a3a'); x.fillStyle = g; x.fillRect(wx, wy, ww, wh);
    x.fillStyle = '#efe6d4'; x.fillRect(wx + ww / 2 - 3, wy, 6, wh); x.fillRect(wx, wy + wh * .38, ww, 6);
    x.fillStyle = 'rgba(255,255,255,.18)'; x.beginPath(); x.moveTo(wx, wy); x.lineTo(wx + ww * .5, wy); x.lineTo(wx, wy + wh * .6); x.fill();
  }
  x.fillStyle = '#4a3828'; x.fillRect(W / 2 - 90, H - 330, 180, 330);
  for (let i = 0; i < 9000; i++) { x.fillStyle = r() < .5 ? 'rgba(90,60,30,.08)' : 'rgba(255,255,255,.08)'; x.fillRect(bx + r() * bw, top + r() * (H - top), 2, 2); }
  /* Perspektive: oben schmaler (Kamera nach oben geneigt) und 2,5° gedreht */
  const c = mkCanvas(W, H), y = c.getContext('2d'); y.fillStyle = '#9cc4ec'; y.fillRect(0, 0, W, H);
  const strips = 300;
  for (let i = 0; i < strips; i++) {
    const v0 = i / strips, v1 = (i + 1) / strips, k0 = .74 + .26 * v0, k1 = .74 + .26 * v1;
    y.save(); y.translate(W / 2, H / 2); y.rotate(2.5 * Math.PI / 180); y.translate(-W / 2, -H / 2);
    y.drawImage(flat, 0, v0 * H, W, (v1 - v0) * H + 1, W / 2 - W * k0 / 2 * 1.08, v0 * H, W * k0 * 1.08, (v1 - v0) * H + 1); y.restore();
  }
  addGrain(c, 4, 0, 21); return c;
}
const SAMPLES = [
  { name: 'Bergsee_Abendlicht.jpg', fn: sceneLake, note: 'Flaches Abendlicht – probiere Tiefen, Dunst und Color Grading.' },
  { name: 'Kueste_Mittag.jpg', fn: sceneCoast, note: 'Helle Lichter – Lichter, Weiß und Farbmischer (Blau).' },
  { name: 'Nebelwald.jpg', fn: sceneForest, note: 'Dunstiges Hochformat – Dunst entfernen, Klarheit, Freistellen.' },
  { name: 'Altstadt_Nacht.jpg', fn: sceneNight, note: 'Verrauschte Nachtszene – Rauschreduzierung und Weißabgleich.' },
  { name: 'Fassade_Upright.jpg', fn: sceneFacade, note: 'Stürzende Linien – Geometrie › Upright ausprobieren.' }
];
