/* ============================================================
   Zustand, Katalog, Alben, Verlauf, Laden, Import
   ============================================================ */
const S = {
  photos: [], byId: new Map(), albums: [], cur: null, sel: new Set(),
  view: 'detail', panel: 'edit', source: { kind: 'all' }, filter: { rating: 0, ratingOp: '>=', flag: 'all', edited: 'all', text: '' },
  sort: store.get('sort', 'captured'), sortDir: store.get('sortDir', -1),
  cmp: 'off', cmpSplit: .5, zoom: 'fit', zoomScale: 1, pan: { x: 0, y: 0 }, clip: false,
  preview: null, previewName: '', clipboard: null, hist: new Map(), loadedId: null, layout: null, histo: null, modal: null,
  tool: null, mask: { active: null, comp: null, overlay: store.get('maskOverlay', true), brush: { size: 6, feather: 50, flow: 100, auto: false, erase: false } },
  heal: { mode: 'remove', size: 4, feather: 50, opacity: 100, sel: null, visualize: false }, redeye: { sel: null },
  presetAmount: null
};
let R = null, BG = null;
const curPhoto = () => S.byId.get(S.cur) || null;
const cs = () => curPhoto().settings;
const viewSettings = () => effective(S.preview || cs());

/* ---------- Auswahl & Sortierung ---------- */
function inSource(p) {
  const s = S.source;
  if (s.kind === 'recent') return Date.now() - p.added < 1000 * 60 * 60 * 24 * 30;
  if (s.kind === 'album') { const a = S.albums.find(a => a.id === s.id); return !!a && a.ids.includes(p.id); }
  if (s.kind === 'deleted') return false;
  return true;
}
function matchesText(p, t) {
  if (!t) return true; t = t.toLowerCase();
  const x = p.exif || {};
  return [p.name, p.title, p.caption, ...(p.keywords || []), x.Make, x.Model, x.LensModel, fmtDate(p.captured, false)].filter(Boolean).some(v => String(v).toLowerCase().includes(t));
}
function visible() {
  const f = S.filter;
  const a = S.photos.filter(p => {
    if (!inSource(p)) return false;
    if (f.flag === 'picked' && p.flag !== 1) return false;
    if (f.flag === 'rejected' && p.flag !== -1) return false;
    if (f.flag === 'unflagged' && p.flag !== 0) return false;
    if (f.edited === 'edited' && !isEdited(p.settings)) return false;
    if (f.edited === 'unedited' && isEdited(p.settings)) return false;
    if (f.rating) { if (f.ratingOp === '>=' ? p.rating < f.rating : f.ratingOp === '<=' ? p.rating > f.rating : p.rating !== f.rating) return false; }
    return matchesText(p, f.text.trim());
  });
  const k = S.sort, d = S.sortDir;
  a.sort((x, y) => d * (k === 'name' ? x.name.localeCompare(y.name, 'de', { numeric: true }) : k === 'rating' ? (x.rating - y.rating) || (x.captured - y.captured) : k === 'added' ? (x.added - y.added) : (x.captured - y.captured)));
  return a;
}
function selectedPhotos() { const v = [...S.sel].map(id => S.byId.get(id)).filter(Boolean); return v.length ? v : (curPhoto() ? [curPhoto()] : []); }

/* ---------- Speichern ---------- */
const dirty = new Set();
const flush = debounce(async () => { const ids = [...dirty]; dirty.clear(); for (const id of ids) { const p = S.byId.get(id); if (p) await DB.put(p); } }, 600);
function persist(p) { dirty.add(p.id); flush(); }
const saveAlbums = debounce(() => { DB.setMeta('albums', S.albums); store.set('albums', S.albums); }, 300);

/* ---------- Miniaturen ---------- */
function makeThumb(r, s) { const o = outputSize(s, r.w, r.h), k = Math.min(1, 400 / Math.max(o.w, o.h)); return r.toCanvas(effective(s), Math.max(1, Math.round(o.w * k)), Math.max(1, Math.round(o.h * k))).toDataURL('image/jpeg', .85); }
function thumbFromImage(img, w, h) { const k = Math.min(1, 400 / Math.max(w, h)), c = mkCanvas(Math.round(w * k), Math.round(h * k)), x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(img, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', .85); }
function thumbRatio(p) { const s = p.settings, odd = s.rot % 2 === 1, w = (odd ? p.h : p.w) * s.crop.w, h = (odd ? p.w : p.h) * s.crop.h; return w / h; }
function updateThumbImgs(p) { $$(`img[data-tid="${p.id}"]`).forEach(i => { i.src = p.thumb; }); $$(`[data-id="${p.id}"] .badge-edit`).forEach(d => d.hidden = !isEdited(p.settings)); }
const thumbSoon = debounce(() => { const p = curPhoto(); if (!p || S.loadedId !== p.id || !R.hasImage) return; p.thumb = makeThumb(R, p.settings); p.ratio = thumbRatio(p); persist(p); updateThumbImgs(p); }, 700);
const thumbQueue = []; let thumbBusy = false;
function queueThumb(p) { if (p.id === S.loadedId) { thumbSoon(); return; } if (!thumbQueue.includes(p)) thumbQueue.push(p); runThumbs(); }
async function runThumbs() {
  if (thumbBusy) return; thumbBusy = true;
  while (thumbQueue.length) { const p = thumbQueue.shift(); try { await withBG(p, r => { p.thumb = makeThumb(r, p.settings); p.ratio = thumbRatio(p); }); persist(p); updateThumbImgs(p); } catch (e) { console.warn(e); } }
  thumbBusy = false;
}

/* ---------- Laden ---------- */
const imgCache = new Map();
/* Bild dekodieren und dabei verkleinern. Rückfall über <img>, falls createImageBitmap scheitert
   (z. B. sehr große Handyfotos oder Formate, die nur das Bild-Element des Browsers kennt). */
async function decodeImage(blob, maxSide) {
  let src = null, w = 0, h = 0, release = () => { };
  try {
    const b = await createImageBitmap(blob); src = b; w = b.width; h = b.height; release = () => b.close && b.close();
  } catch (e) {
    const url = URL.createObjectURL(blob);
    try {
      const im = new Image(); im.src = url;
      if (im.decode) await im.decode(); else await new Promise((res, rej) => { im.onload = res; im.onerror = rej; });
      src = im; w = im.naturalWidth; h = im.naturalHeight; release = () => URL.revokeObjectURL(url);
    } catch (e2) { URL.revokeObjectURL(url); throw new Error('decode'); }
  }
  if (!w || !h) { release(); throw new Error('decode'); }
  const k = Math.min(1, maxSide / Math.max(w, h));
  if (k >= 1 && typeof ImageBitmap !== 'undefined' && src instanceof ImageBitmap) return { img: src, w, h, ow: w, oh: h };
  const cw = Math.max(1, Math.round(w * k)), ch = Math.max(1, Math.round(h * k)), c = mkCanvas(cw, ch), x = c.getContext('2d');
  x.imageSmoothingQuality = 'high'; x.drawImage(src, 0, 0, cw, ch); release();
  return { img: c, w: cw, h: ch, ow: w, oh: h };
}
async function decodePhoto(p, maxSide) {
  const blob = await DB.getBlob(p.id); if (!blob) throw new Error('Originaldatei fehlt');
  return decodeImage(blob, maxSide);
}
async function getImage(p, maxSide) {
  if (imgCache.has(p.id)) { const v = imgCache.get(p.id); imgCache.delete(p.id); imgCache.set(p.id, v); return v; }
  const v = await decodePhoto(p, maxSide); imgCache.set(p.id, v);
  while (imgCache.size > 3) { const k = imgCache.keys().next().value; const o = imgCache.get(k); imgCache.delete(k); if (k !== p.id && o.img.close) o.img.close(); }
  return v;
}
async function withBG(p, fn) {
  if (!BG) { BG = new Renderer(mkCanvas(2, 2)); BG.rasterize = rasterComp; }
  const im = await getImage(p, R.maxTex);
  const prevSrc = { d: SRC.d, w: SRC.w, h: SRC.h }, prevKey = FRAME_GRID.key, savedR = R;
  BG.setImage(im.img, im.w, im.h);
  const needsSrc = (p.settings.masks || []).some(m => m.comps.some(c => c.type === 'sky' || (c.dabs || []).some(d => d.auto)));
  if (needsSrc) { setSourceSample(im.img, im.w, im.h); R = BG; }
  try { return fn(BG); } finally { if (needsSrc) { R = savedR; Object.assign(SRC, prevSrc); FRAME_GRID.key = ''; RASTER.clear(); if (savedR) savedR.layerKeys = []; } }
}

/* ---------- Import ---------- */
async function addPhoto(blob, name, extra = {}) {
  const im = await decodeImage(blob, 1600), w = im.ow, h = im.oh;
  let exif = null; if (/jpe?g/i.test(blob.type) || /\.jpe?g$/i.test(name)) { try { exif = parseExif(await blob.slice(0, 256 * 1024).arrayBuffer()); } catch { } }
  const thumb = thumbFromImage(im.img, im.w, im.h), stats = computeStats(im.img, im.w, im.h); im.img.close && im.img.close();
  const id = uid();
  const p = { id, name, w, h, ratio: w / h, size: blob.size, type: blob.type || 'image', added: Date.now() + S.photos.length, captured: exifDate(exif && exif.DateTimeOriginal) || extra.captured || Date.now(), rating: extra.rating || 0, flag: 0, settings: DEFAULTS(), thumb, exif, stats, sample: !!extra.sample, note: extra.note || '', title: '', caption: '', copyright: '', keywords: extra.keywords || [], versions: [] };
  await DB.putBlob(id, blob); await DB.put(p); S.photos.push(p); S.byId.set(id, p); return p;
}
async function importFiles(files, albumId) {
  const list = [...files].filter(f => (f.type || '').startsWith('image/') || /\.(jpe?g|png|webp|gif|avif|bmp|heic|heif)$/i.test(f.name || ''));
  if (!list.length) { toast('Keine Bilddateien gefunden. Unterstützt werden JPEG, PNG, WebP, AVIF und GIF.'); return; }
  let ok = 0, first = null;
  for (const [i, f] of list.entries()) {
    progress(`Fotos werden hinzugefügt … ${i + 1} von ${list.length}`, (i + .5) / list.length);
    try { const p = await addPhoto(f, f.name || ('Eingefügt_' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-') + '.png'), { captured: f.lastModified }); ok++; first = first || p; if (albumId) { const a = S.albums.find(a => a.id === albumId); a && a.ids.push(p.id); } }
    catch (e) { console.warn('Import fehlgeschlagen', f.name, f.type, e); toast(/hei[cf]/i.test(f.type + f.name) ? `${f.name}: HEIC-Fotos kann dieser Browser nicht öffnen. Bitte als JPEG teilen oder in der Kamera „Maximale Kompatibilität“ wählen.` : `${f.name} konnte nicht geöffnet werden. Dieser Browser kennt das Format nicht.`, 7000); await sleep(1800); }
  }
  progress(null);
  if (albumId) saveAlbums();
  if (ok) { if (ok < list.length) await sleep(3000); toast(`${ok} Foto${ok > 1 ? 's' : ''} hinzugefügt`); S.sel = new Set([first.id]); refreshAll(); setCurrent(first.id); }
}
async function loadSamples(onStep) {
  for (const [i, sm] of SAMPLES.entries()) {
    onStep && onStep(i); await sleep(16);
    const c = sm.fn(); const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', .92));
    await addPhoto(blob, sm.name, { sample: true, note: sm.note, captured: Date.now() - (i + 1) * 3600e3, keywords: ['Beispiel'] });
  }
}

/* ---------- Verlauf ---------- */
function hist(p = curPhoto()) {
  let h = S.hist.get(p.id);
  if (!h) { h = { steps: [{ label: isEdited(p.settings) ? 'Geöffnet' : 'Importieren', s: clone(p.settings), t: Date.now() }], idx: 0 }; S.hist.set(p.id, h); }
  return h;
}
function pushHist(p, label) { const h = hist(p); h.steps = h.steps.slice(0, h.idx + 1); h.steps.push({ label, s: clone(p.settings), t: Date.now() }); if (h.steps.length > 300) h.steps.shift(); h.idx = h.steps.length - 1; }
function commit(label) { const p = curPhoto(); if (!p) return; pushHist(p, label); S.presetAmount = null; photoChanged(p); onHistoryChanged(); }
const leftSoon = debounce(() => { if (typeof renderLeft === 'function') renderLeft(); }, 500);
function photoChanged(p) { persist(p); leftSoon(); if (p.id === S.cur) { requestRender(); thumbSoon(); } else queueThumb(p); $$(`[data-id="${p.id}"] .badge-edit`).forEach(d => d.hidden = !isEdited(p.settings)); }
function gotoHistory(i) { const p = curPhoto(); if (!p) return; const h = hist(p); if (i < 0 || i >= h.steps.length) return; h.idx = i; p.settings = clone(h.steps[i].s); S.presetAmount = null; syncAll(); photoChanged(p); onHistoryChanged(); }
function canUndo() { const p = curPhoto(); return !!p && hist(p).idx > 0; }
function canRedo() { const p = curPhoto(); if (!p) return false; const h = hist(p); return h.idx < h.steps.length - 1; }
function undo() { const p = curPhoto(); if (!p) return; const h = hist(p); if (h.idx > 0) { const l = h.steps[h.idx].label; gotoHistory(h.idx - 1); toast('Rückgängig: ' + l); } }
function redo() { const p = curPhoto(); if (!p) return; const h = hist(p); if (h.idx < h.steps.length - 1) { gotoHistory(h.idx + 1); toast('Wiederholen: ' + h.steps[h.idx].label); } }
function setLive(key, v, opt = {}) {
  const p = curPhoto(); if (!p) return; setPath(p.settings, key, v);
  if (opt.wb) p.settings.wb = 'custom';
  if (opt.onLive) opt.onLive(v);
  requestRender();
}
