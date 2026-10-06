/* ============================================================
   WebGL2-Renderer
   ============================================================ */
const MAX_LAYERS = 8;
class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true, premultipliedAlpha: false, antialias: false, alpha: false });
    if (!gl) throw new Error('WebGL2 nicht verfügbar');
    this.gl = gl;
    this.maxTex = Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE), matchMedia('(pointer:coarse)').matches ? 4096 : 6144);
    this.progMain = this.program(FS_MAIN); this.progBlur = this.program(FS_BLUR); this.progCopy = this.program(FS_COPY);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    this.vao = gl.createVertexArray(); gl.bindVertexArray(this.vao);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    this.lutTex = this.tex(512, 2, null); this.lutKey = '';
    this.dataTex = gl.createTexture(); this.dataKey = ''; this.dataInfo = { maskN: 0, spotN: 0, pointN: 0, rowComp: 0, rowSpot: 0, rowPoint: 0 };
    gl.bindTexture(gl.TEXTURE_2D, this.dataTex); this.nearest();
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 8, 1, 0, gl.RGBA, gl.FLOAT, new Float32Array(32));
    this.profTex = new Map(); this.profId = null;
    this.dummy3D = gl.createTexture(); gl.bindTexture(gl.TEXTURE_3D, this.dummy3D); gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA8, 1, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    this.brushTex = gl.createTexture(); this.layerKeys = []; this.layerW = 0; this.layerH = 0;
    this.allocLayers(4, 4);
    this.hasImage = false; this.rasterize = null;
  }
  nearest() { const gl = this.gl; gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); }
  program(fs) {
    const gl = this.gl, mk = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, VS)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(p, 0, 'aPos'); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const loc = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const name = gl.getActiveUniform(p, i).name.replace(/\[0\]$/, ''); loc[name] = gl.getUniformLocation(p, name); }
    return { p, loc };
  }
  tex(w, h, src, mip = false) {
    const gl = this.gl, t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    if (src && !(src instanceof Uint8Array)) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, src || null);
    if (mip) gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  target(w, h) { const gl = this.gl, tex = this.tex(w, h, null), fbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fbo); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0); gl.bindFramebuffer(gl.FRAMEBUFFER, null); return { tex, fbo, w, h }; }
  freeTarget(t) { if (!t) return; this.gl.deleteTexture(t.tex); this.gl.deleteFramebuffer(t.fbo); }
  pass(prog, target, vp, setup) {
    const gl = this.gl; gl.useProgram(prog.p); gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.fbo : null);
    gl.viewport(vp[0], vp[1], vp[2], vp[3]); gl.uniform1f(prog.loc.uFlipY, target ? 0 : 1); setup(prog.loc); gl.bindVertexArray(this.vao); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  bindTex(unit, tex, loc, kind) { const gl = this.gl; gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(kind || gl.TEXTURE_2D, tex); gl.uniform1i(loc, unit); }
  blurred(srcTex, w, h, iters, step) {
    const gl = this.gl, a = this.target(w, h), b = this.target(w, h);
    this.pass(this.progCopy, a, [0, 0, w, h], l => this.bindTex(0, srcTex, l.uTex));
    for (let i = 0; i < iters; i++) {
      this.pass(this.progBlur, b, [0, 0, w, h], l => { this.bindTex(0, a.tex, l.uTex); gl.uniform2f(l.uDir, step / w, 0); });
      this.pass(this.progBlur, a, [0, 0, w, h], l => { this.bindTex(0, b.tex, l.uTex); gl.uniform2f(l.uDir, 0, step / h); });
    }
    this.freeTarget(b); return a;
  }
  setImage(img, w, h, maps) {
    const gl = this.gl;
    if (this.src) gl.deleteTexture(this.src); this.freeTarget(this.bS);
    this.w = w; this.h = h; this.src = this.tex(w, h, img, true);
    const long = Math.max(w, h), ks = Math.min(1, 640 / long);
    this.bS = this.blurred(this.src, Math.max(2, Math.round(w * ks)), Math.max(2, Math.round(h * ks)), 1, 1);
    this.layerKeys = []; this.dataKey = '';
    maps = maps || localMaps(img, w, h); this.maps = maps; this.lutKey = '';
    for (const k of ['gfTex', 'gfcTex']) if (this[k]) gl.deleteTexture(this[k]);
    const up = data => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, maps.W, maps.H, 0, gl.RGBA, gl.FLOAT, data); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return t; };
    this.gfTex = up(maps.sh); this.gfcTex = up(maps.cl);
    this.hasImage = true;
  }
  /* Pinsel-/Rasterebenen der Masken */
  allocLayers(W, H) {
    const gl = this.gl; gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.brushTex);
    gl.texImage3D(gl.TEXTURE_2D_ARRAY, 0, gl.R8, W, H, MAX_LAYERS, 0, gl.RED, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.layerW = W; this.layerH = H; this.layerKeys = [];
  }
  layerSize(s) { const f = frameSize(s, this.w, this.h), k = 1024 / Math.max(f.w, f.h); return [Math.max(8, Math.round(f.w * k)), Math.max(8, Math.round(f.h * k))]; }
  uploadLayer(i, data) { const gl = this.gl; gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.brushTex); gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, i, this.layerW, this.layerH, 1, gl.RED, gl.UNSIGNED_BYTE, data); }
  /* Parameter-Datentextur: Masken, Komponenten, Reparaturpunkte, Punktfarben */
  updateData(s) {
    const okComp = c => !(c.type === 'color' && !(c.samples && c.samples.length));
    const masks = (s.masks || []).filter(m => m.visible !== false && m.comps && m.comps.length).slice(0, 12).map(m => m.comps.every(okComp) ? m : Object.assign({}, m, { comps: m.comps.filter(okComp).length ? m.comps.filter(okComp) : [{ type: 'linear', op: 'add', ax: 0, ay: -2, bx: 0, by: -1 }] }));
    const spots = [...(s.spots || []), ...(s.redeye || []).map(r => ({ ...r, mode: 'redeye' }))].slice(0, 128);
    const points = (s.points || []).slice(0, 8);
    const [LW_, LH_] = this.layerSize(s);
    if (LW_ !== this.layerW || LH_ !== this.layerH) this.allocLayers(LW_, LH_);
    const comps = []; let layer = 0;
    for (const m of masks) { m._cs = comps.length; for (const c of m.comps.slice(0, 16)) { const cc = { c, layer: -1 }; if ((c.type === 'brush' || c.type === 'sky') && layer < MAX_LAYERS) cc.layer = layer++; comps.push(cc); } m._cn = comps.length - m._cs; }
    // Rasterebenen aktualisieren
    for (const cc of comps) {
      if (cc.layer < 0) continue;
      const key = cc.c.type === 'sky' ? 'sky|' + JSON.stringify(geomOf(s)) + '|' + (cc.c.refine || 0) : 'b|' + cc.c.id + '|' + (cc.c.rev || 0) + '|' + (cc.c.dabs ? cc.c.dabs.length : 0);
      if (this.layerKeys[cc.layer] !== key && this.rasterize) { this.uploadLayer(cc.layer, this.rasterize(cc.c, this.layerW, this.layerH, s)); this.layerKeys[cc.layer] = key; }
    }
    const rowComp = masks.length, rowSpot = rowComp + comps.length, rowPoint = rowSpot + spots.length, rows = Math.max(1, rowPoint + points.length);
    const d = new Float32Array(8 * 4 * rows), put = (row, col, a) => d.set(a, (row * 8 + col) * 4);
    masks.forEach((m, i) => {
      const a = m.adj || {}, v = k => a[k] || 0;
      put(i, 0, [m._cs, m._cn, m.invert ? 1 : 0, (m.amount ?? 100) / 100]);
      put(i, 1, [v('exposure'), v('contrast') / 100 * .85, v('highlights') / 100, v('shadows') / 100]);
      put(i, 2, [v('whites') / 100, v('blacks') / 100, v('temp') / 100, v('tint') / 100]);
      put(i, 3, [v('texture') / 100, v('clarity') / 100, v('dehaze') / 100, v('saturation') / 100]);
      put(i, 4, [Math.max(v('sharpness'), -100) / 150, v('noise') / 100, v('hue') / 360, 0]);
      const col = a.color && a.color.s ? hslRgb(a.color.h / 360, 1, .5) : [0, 0, 0], lm = luma(...col), cs_ = a.color ? a.color.s / 100 * .25 : 0;
      put(i, 5, [(col[0] - lm) * cs_, (col[1] - lm) * cs_, (col[2] - lm) * cs_, 0]);
    });
    const TYPES = { brush: 1, linear: 2, radial: 3, luminance: 4, color: 5, sky: 6 }, OPS = { add: 0, sub: 1, int: 2 };
    comps.forEach((cc, j) => {
      const c = cc.c, r = rowComp + j;
      put(r, 0, [TYPES[c.type] || 0, OPS[c.op] || 0, Math.max(cc.layer, 0), c.invert ? 1 : 0]);
      if (c.type === 'linear') put(r, 1, [c.ax, c.ay, c.bx, c.by]);
      if (c.type === 'radial') { put(r, 1, [c.cx, c.cy, c.rx, c.ry]); put(r, 2, [c.angle || 0, (c.feather ?? 50) / 100, 0, 0]); }
      if (c.type === 'luminance') { const sm = (c.smooth ?? 30) / 100 * .25; put(r, 1, [c.lo / 100, c.hi / 100, sm, sm]); }
      if (c.type === 'color') { const s0 = c.samples[0] || [0, 0, 0], s1 = c.samples[1]; put(r, 1, [s0[0], s0[1], s0[2], s1 ? 1 : 0]); put(r, 2, [...(s1 || [0, 0, 0]), (c.refine ?? 50) / 100]); }
    });
    const MODES = { heal: 0, clone: 1, redeye: 2 };
    spots.forEach((p, j) => { put(rowSpot + j, 0, [p.x, p.y, p.sx ?? p.x, p.sy ?? p.y]); put(rowSpot + j, 1, [p.r, (p.feather ?? 50) / 100, (p.opacity ?? 100) / 100, MODES[p.mode] ?? 0]); });
    points.forEach((p, j) => { put(rowPoint + j, 0, [p.h / 360, p.s, p.l, (p.range ?? 50) / 100]); put(rowPoint + j, 1, [(p.dh || 0) / 360 * .5, (p.ds || 0) / 100, (p.dl || 0) / 100, 0]); });
    const gl = this.gl; gl.bindTexture(gl.TEXTURE_2D, this.dataTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 8, rows, 0, gl.RGBA, gl.FLOAT, d);
    this.dataInfo = { maskN: masks.length, spotN: spots.length, pointN: points.length, rowComp, rowSpot, rowPoint, masks };
  }
  updateProfile(id) {
    if (this.profId === id) return; this.profId = id;
    if (!id || id === 'color') return;
    const gl = this.gl;
    if (!this.profTex.has(id)) {
      const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_3D, t);
      gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA8, 33, 33, 33, 0, gl.RGBA, gl.UNSIGNED_BYTE, buildProfileLut(id));
      for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_3D, k, v);
      this.profTex.set(id, t);
    }
  }
  updateLut(s) { const pv = this.maps ? this.maps.pivot : .45, key = [s.whites, s.blacks, s.contrast, pv, s.curveMode, JSON.stringify(s.curve), JSON.stringify(s.pcurve)].join('|'); if (key === this.lutKey) return; this.lutKey = key; const gl = this.gl; gl.bindTexture(gl.TEXTURE_2D, this.lutTex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 512, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, buildLut(s, pv)); }
  uniforms(l, s, o, vpW, vpH) {
    const gl = this.gl, f = (n, v) => l[n] && gl.uniform1f(l[n], v), i1 = (n, v) => l[n] && gl.uniform1i(l[n], v), v2 = (n, a, b) => l[n] && gl.uniform2f(l[n], a, b), v3 = (n, a) => l[n] && gl.uniform3fv(l[n], a), v4 = (n, a) => l[n] && gl.uniform4fv(l[n], a);
    const crop = o.cropEdit ? { x: 0, y: 0, w: 1, h: 1 } : s.crop, fr = frameSize(s, this.w, this.h), outW = crop.w * fr.w, outH = crop.h * fr.h;
    v2('uSrcSize', this.w, this.h); v2('uFrameSize', fr.w, fr.h); v2('uOutSize', outW, outH); const sub = o.sub || [0, 0, 1, 1]; v4('uSub', sub); v2('uLine', 1.2 * sub[2] / vpW, 1.2 * sub[3] / vpH);
    v4('uCrop', [crop.x, crop.y, crop.w, crop.h]); f('uCropEdit', o.cropEdit ? 1 : 0);
    const pxs = outW / (vpW / sub[2]); f('uAngle', frameAngle(s)); f('uPxScale', pxs); f('uLod', Math.max(0, Math.log2(Math.max(pxs, 1)) - .25)); v2('uFlip', s.flipH ? 1 : 0, s.flipV ? 1 : 0);
    const g = geoParams(s); v4('uGeo', [g.pv, g.ph, g.sc, g.dist]); v3('uGeo2', [g.ox, g.oy, g.asp]);
    v4('uTone', [s.exposure, s.contrast / 100 * .85, s.highlights / 100, s.shadows / 100]);
    v4('uTone2', [s.whites / 100, s.blacks / 100, s.temp / 100, s.tint / 100]);
    v4('uPres', [s.texture / 100, s.clarity / 100, s.dehaze / 100, s.vibrance / 100]); f('uSat', s.saturation / 100);
    const mp = this.maps; v2('uKeys', mp.key99, mp.keyMed); v3('uAir', mp.A);
    const h = a => a.map(v => v / 100);
    l.uMix && gl.uniform4fv(l.uMix, [...h(s.hue), ...h(s.sat), ...h(s.lum)]);
    l.uBWM && gl.uniform4fv(l.uBWM, h(s.bwMix)); f('uBW', s.bw ? 1 : 0);
    const gv = (gg, k) => { const c = hslRgb(gg.h / 360, 1, .5), lm = luma(...c); return c.map(v => (v - lm) * gg.s / 100 * k); };
    v3('uGS', gv(s.gS, .32)); v3('uGM', gv(s.gM, .26)); v3('uGH', gv(s.gH, .3)); v3('uGG', gv(s.gG, .22));
    v4('uGL', [s.gS.l / 100, s.gM.l / 100, s.gH.l / 100, s.gG.l / 100]); v2('uGB', s.gBlend / 100, s.gBalance / 100);
    v4('uSharp', [s.sharpen / 150, s.sharpRadius, s.sharpDetail / 100, s.sharpMask / 100]); v3('uNR', [s.nrLum / 100, s.nrDetail / 100, s.nrColor / 100]);
    v4('uVig', [s.vigAmount / 100, s.vigMid / 100, s.vigRound / 100, s.vigFeather / 100]); f('uVigHi', s.vigHi / 100);
    v3('uGrain', [s.grainAmount / 100, s.grainSize / 100, s.grainRough / 100]);
    const fp = s.fringePurple + (s.caRemove ? 35 : 0), fg = s.fringeGreen + (s.caRemove ? 25 : 0);
    v4('uFringe', [Math.min(fp, 100) / 100, s.fringePurpleHue / 360, Math.min(fg, 100) / 100, s.fringeGreenHue / 360]);
    v2('uLensVig', s.lensVig / 100, s.lensVigMid / 100);
    const prof = PROFILE_BY_ID[s.profile]; f('uProfOn', prof && prof.f ? 1 : 0); f('uProfAmt', (s.profileAmount ?? 100) / 100);
    f('uBefore', o.before ? 1 : 0); v2('uSplit', o.split ? (o.split.dir === 'h' ? 2 : 1) : 0, o.split ? o.split.pos : 0); f('uClip', o.clip ? 1 : 0);
    i1('uShowMask', o.showMask ?? -1); i1('uMaskOnly', o.maskOnly ?? -1); v2('uVis', o.vis ? 1 : 0, o.vis || 0); v4('uMaskCol', o.maskCol || [1, .15, .15, .5]);
    const di = this.dataInfo; i1('uMaskN', o.noLocal ? 0 : di.maskN); i1('uSpotN', di.spotN); i1('uPointN', di.pointN); i1('uRowComp', di.rowComp); i1('uRowSpot', di.rowSpot); i1('uRowPoint', di.rowPoint);
  }
  render(s, o) {
    if (!this.hasImage) return;
    const gl = this.gl; this.updateLut(s); this.updateProfile(s.profile); this.updateData(s);
    if (!o.target && !o.keepSize && (this.canvas.width !== o.w || this.canvas.height !== o.h)) { this.canvas.width = o.w; this.canvas.height = o.h; }
    const vp = o.vp || [0, 0, o.w, o.h];
    if (o.clear) { gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, this.canvas.width, this.canvas.height); gl.clearColor(...o.clear, 1); gl.clear(gl.COLOR_BUFFER_BIT); }
    this.pass(this.progMain, o.target || null, vp, l => {
      this.bindTex(0, this.src, l.uSrc); this.bindTex(1, this.gfTex, l.uGF); this.bindTex(2, this.bS.tex, l.uBlurS); this.bindTex(3, this.lutTex, l.uLut); this.bindTex(7, this.gfcTex, l.uGFC);
      this.bindTex(4, this.dataTex, l.uData);
      const pt = this.profTex.get(s.profile); this.bindTex(5, pt || this.dummy3D, l.uProf, gl.TEXTURE_3D);
      this.bindTex(6, this.brushTex, l.uBrush, gl.TEXTURE_2D_ARRAY);
      this.uniforms(l, s, o, vp[2], vp[3]);
    });
  }
  pixels(s, w, h, o = {}) {
    const gl = this.gl, t = this.target(w, h);
    this.render(s, Object.assign({}, o, { w, h, target: t }));
    const px = new Uint8Array(w * h * 4); gl.bindFramebuffer(gl.FRAMEBUFFER, t.fbo); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); this.freeTarget(t); return px;
  }
  toCanvas(s, w, h, o) { const px = this.pixels(s, w, h, o), c = mkCanvas(w, h), x = c.getContext('2d'); x.putImageData(new ImageData(new Uint8ClampedArray(px.buffer), w, h), 0, 0); return c; }
  readPixel(x, y) { const gl = this.gl, p = new Uint8Array(4); gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.readPixels(x, this.canvas.height - 1 - y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, p); return p; }
}
