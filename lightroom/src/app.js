/* ============================================================
   App: Ansichten, Werkzeugleiste, Mobil, Tastatur, Dialoge, Start
   ============================================================ */
const MSEC = [['edit:light', 'luminance', 'Licht'], ['edit:color', 'thermo', 'Farbe'], ['edit:effects', 'vignette', 'Effekte'], ['edit:detail', 'triangle', 'Detail'], ['edit:optics', 'lens', 'Optik']];
const MSEC_TITLES = { light: 'Licht', color: 'Farbe', effects: 'Effekte', detail: 'Detail', optics: 'Optik', profile: 'Profil' };
const RAIL = [['presets', 'presets', 'Presets (Umschalt+P)'], ['edit', 'edit', 'Bearbeiten (E)'], ['crop', 'crop', 'Zuschneiden (C)'], ['remove', 'eraser', 'Entfernen (H)'], ['mask', 'mask', 'Maskieren (M)'], '-', ['versions', 'versions', 'Versionen (Umschalt+V)'], ['more', 'more', 'Weitere Optionen'], 'space', ['keywords', 'tag', 'Stichwörter (K)'], ['info', 'info', 'Informationen (I)']];
function isMobile() { return innerWidth <= 760; }

/* ---------- Ansichten & Bedienfelder ---------- */
function setView(v) {
  if (v === 'detail' && !curPhoto()) { const f = visible()[0]; if (!f) { toast('Keine Fotos vorhanden.'); return; } S.cur = f.id; S.sel = new Set([f.id]); }
  if (S.pick) endPick();
  S.view = v; store.set('view', v);
  const app = $('#app'); app.classList.remove('v-grid', 'v-square', 'v-detail'); app.classList.add('v-' + v);
  $('#grid').hidden = v === 'detail'; $('#gridHead').hidden = v === 'detail'; $('#detail').hidden = v !== 'detail';
  if (v !== 'detail' && ['crop', 'remove', 'mask', 'edit', 'presets'].includes(S.panel) && !isMobile()) { S.panelBefore = S.panel; S.panel = 'info'; }
  if (v === 'detail' && S.panel === 'info' && S.panelBefore) { S.panel = S.panelBefore; S.panelBefore = null; }
  applyPanelVisibility(); renderBottom(); renderFilm(); renderPanel(); renderMaskList();
  if (v === 'detail') { ensureLoaded(); requestAnimationFrame(() => { requestRender(); drawHisto(); }); }
  else requestAnimationFrame(() => { renderGrid(); const c = $(`#grid [data-id="${S.cur}"]`); c && c.scrollIntoView({ block: 'nearest' }); });
}
function applyPanelVisibility() { $('#histoBox').hidden = !(S.view === 'detail' && ['edit', 'crop', 'remove', 'mask', 'presets'].includes(S.panel)) || !S.showHisto; }
function setPanel(p) {
  if (p === 'more') return;
  if (S.pick) endPick();
  const app = $('#app');
  if (S.panel === p && !isMobile() && !app.classList.contains('no-right')) { app.classList.add('no-right'); requestRender(); return; }
  app.classList.remove('no-right', 'sheet-closed');
  if (S.panel === 'crop' && p !== 'crop') S.cropEntry = null;
  if (['crop', 'remove', 'mask', 'edit', 'presets'].includes(p) && S.view !== 'detail') { S.panel = p; setView('detail'); }
  S.panel = p; S.profileBrowser = false; store.set('panel', p);
  if (p === 'crop') cropEnter();
  if (p === 'mask') { const s = curPhoto() && cs(); if (s && !S.mask.active && s.masks.length) S.mask.active = s.masks[s.masks.length - 1].id; }
  if (isMobile()) S.mSection = p === 'edit' ? (S.mSection || 'light') : null;
  applyPanelVisibility(); renderPanel(); renderMaskList(); requestRender(); requestAnimationFrame(drawHisto);
}
function renderRail() {
  const r = $('#rail'); r.replaceChildren();
  for (const it of RAIL) {
    if (it === '-') { r.append(el('span', { class: 'rsep' })); continue; }
    if (it === 'space') { r.append(el('span', { class: 'rspace' })); continue; }
    const [k, ic, t] = it, b = el('button', { class: 'rb', title: t, 'aria-label': t, html: icon(ic, 20) }); b.dataset.p = k;
    b.onclick = () => k === 'more' ? moreMenu(b) : setPanel(k);
    r.append(b);
  }
}
function moreMenu(anchor) {
  menu(anchor, [{ label: 'Bearbeitungseinstellungen kopieren', key: 'Strg+C', fn: copySettings }, { label: 'Einstellungen zum Kopieren auswählen …', key: 'Strg+Umschalt+C', fn: copyDialog }, { label: 'Bearbeitungseinstellungen einfügen', key: 'Strg+V', fn: pasteSettings }, '-',
  { label: 'Auf Original zurücksetzen', key: 'Umschalt+R', fn: resetToOriginal }, { label: S.showHisto ? 'Histogramm ausblenden' : 'Histogramm anzeigen', key: 'Strg+0', fn: toggleHisto }, { label: 'Exportieren …', key: 'Umschalt+E', fn: openExport }, '-', { label: 'Tastaturbefehle', key: '?', fn: showHelp }]);
}
function toggleHisto() { S.showHisto = !S.showHisto; store.set('histo', S.showHisto); applyPanelVisibility(); drawHisto(); }
function refreshAll() { renderLeft(); renderSearch(); if (S.view !== 'detail') renderGrid(); renderFilm(); renderBottom(); if (['info', 'keywords'].includes(S.panel)) renderPanel(); }
function onPhotoLoaded() { histFoot(null); syncAll(); renderMaskList(); if (S.panel === 'crop') cropEnter(); if (S.panel === 'presets' || S.profileBrowser) renderPanel(); }

/* ---------- Mobil ---------- */
function renderMobileBars() {
  const T = $('#mTools'); T.replaceChildren();
  for (const [k, ic, n] of [['presets', 'presets', 'Presets'], ['crop', 'crop', 'Zuschn.'], ['edit', 'edit', 'Bearb.'], ['mask', 'mask', 'Maskieren'], ['remove', 'eraser', 'Entfernen']]) {
    const b = el('button', { 'data-p': k, onclick: () => { if (S.panel === k && !$('#app').classList.contains('sheet-closed')) { $('#app').classList.add('sheet-closed'); requestRender(); return; } setPanel(k); } }, el('span', { class: 'bx', html: icon(ic, 21) }), n); T.append(b);
  }
  const M = $('#mSections'); M.replaceChildren();
  M.append(el('button', { title: 'Profil & Auto', 'aria-label': 'Profil und Auto', 'data-s': 'profile', html: icon('sparkle', 20), onclick: () => mSection('profile') }), el('span', { class: 'bar' }));
  for (const [k, ic, n] of MSEC) { const id = k.split(':')[1]; M.append(el('button', { title: n, 'aria-label': n, 'data-s': id, html: icon(ic, 20), onclick: () => mSection(id) })); }
}
function mSection(id) { S.panel = 'edit'; S.mSection = id; $('#app').classList.remove('sheet-closed'); renderPanel(); requestRender(); }
function updateMobileSections() {
  $('#mSections').hidden = S.panel !== 'edit';
  $$('#mSections button').forEach(b => b.classList.toggle('on', b.dataset.s === S.mSection));
  if (!isMobile()) { $$('#panel .sec').forEach(s => s.classList.remove('mshow')); $$('#panel .mhide').forEach(e => e.classList.remove('mhide-on')); return; }
  const sec = S.panel === 'edit' ? (S.mSection || 'light') : null;
  $$('#panel .sec').forEach(s => s.classList.toggle('mshow', S.panel !== 'edit' || s.dataset.sec === sec));
  if (S.panel === 'edit') { const prof = sec === 'profile'; $$('#panel .mhide').forEach(e => e.style.display = prof && !e.classList.contains('ph') ? 'flex' : ''); }
  $('#mSheetTitle').textContent = S.panel === 'edit' ? MSEC_TITLES[sec] : PANEL_TITLES[S.panel];
}

/* ---------- Dialoge ---------- */
let toastT;
function toast(msg, ms = 2600) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, ms); }
function progress(text, f) { const p = $('#progress'); if (!text) { p.hidden = true; return; } p.hidden = false; $('#progressText').textContent = text; $('#progressBar').style.width = Math.round((f || 0) * 100) + '%'; }
function modal(title, body, buttons) {
  if (S.modal) S.modal.close(); closeMenu();
  const m = el('div', { class: 'modal' }), close = () => { m.remove(); S.modal = null; };
  const d = el('div', { class: 'dlg', role: 'dialog', 'aria-modal': 'true', 'aria-label': title }, el('h3', {}, title), el('div', { class: 'db' }, body),
    el('div', { class: 'df' }, ...buttons.map(b => el('button', { class: 'gbtn' + (b.primary ? ' blue' : ''), onclick: async ev => { const btn = ev.currentTarget; btn.disabled = true; const r = b.onClick ? await b.onClick() : undefined; if (r !== false) close(); else btn.disabled = false; } }, b.label))));
  m.addEventListener('pointerdown', e => { if (e.target === m) close(); }); m.append(d); document.body.append(m); S.modal = { close };
  d.querySelectorAll('input,textarea,select').forEach(i => i.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter' && i.tagName === 'INPUT') { const pb = d.querySelector('.df .blue'); pb && pb.click(); } if (e.key === 'Escape') close(); }));
  const f = d.querySelector('input:not([type=checkbox]):not([type=range]), select, .df .blue'); if (f) setTimeout(() => f.focus(), 20);
  return { close, m, d };
}
function confirmDlg(title, text, okLabel, onOk) { modal(title, el('p', { style: 'margin:0' }, text), [{ label: 'Abbrechen' }, { label: okLabel, primary: true, onClick: onOk }]); }
function showHelp() {
  const keys = [['G / Umschalt+G', 'Fotoraster / Quadratisches Raster'], ['D', 'Detailansicht'], ['E', 'Bearbeiten'], ['C', 'Zuschneiden'], ['H', 'Entfernen / Reparieren'], ['M', 'Maskieren'], ['B · L · R', 'Pinsel · Linearer · Radialer Verlauf (beim Maskieren)'], ['W', 'Weißabgleich-Pipette'], ['Umschalt+A', 'Auto'], ['V', 'Schwarzweiß'], ['Umschalt+P / Umschalt+V', 'Presets / Versionen'], ['I / K', 'Informationen / Stichwörter'], ['P', 'Meine Fotos ein/aus'], ['\\', 'Original anzeigen'], ['Y / Alt+Y', 'Vorher/Nachher geteilt'], ['Leertaste', 'Zoom umschalten'], ['Strg + / Strg −', 'Zoomen'], ['J', 'Beschneidung anzeigen'], ['O', 'Maskenüberlagerung ein/aus'], ['A', 'Bereiche anzeigen (Entfernen)'], ['[ / ]', 'Pinselgröße'], ['/', 'Filmstreifen'], ['0–5', 'Bewertung'], ['Z / X / U', 'Markieren / Ablehnen / Aufheben'], ['← →', 'Vorheriges / nächstes Foto'], ['Strg+Z / Strg+Umschalt+Z', 'Rückgängig / Wiederholen'], ['Strg+C / Strg+V', 'Einstellungen kopieren / einfügen'], ['Strg+[ / Strg+]', 'Links / rechts drehen'], ['Umschalt+R', 'Auf Original zurücksetzen'], ['Umschalt+E', 'Exportieren'], ['Strg+0', 'Histogramm ein/aus'], ['Entf', 'Foto entfernen'], ['Doppelklick auf Regler', 'Regler zurücksetzen'], ['Im Histogramm ziehen', 'Schwarz, Tiefen, Belichtung, Lichter, Weiß']];
  const g = el('div', { class: 'keys' }); for (const [k, v] of keys) g.append(el('kbd', {}, k), el('span', {}, v));
  modal('Tastaturbefehle', g, [{ label: 'Schließen', primary: true }]);
}

/* ---------- Tastatur ---------- */
function onKey(e) {
  if (S.modal) { if (e.key === 'Escape') S.modal.close(); return; }
  if (S.menu && e.key === 'Escape') { closeMenu(); return; }
  const t = e.target, typing = t.matches && t.matches('input:not([type=range]):not([type=checkbox]), textarea, select'); if (typing) return;
  const onRange = t.matches && t.matches('input[type=range]'), mod = e.ctrlKey || e.metaKey, k = e.key, kl = k.toLowerCase(), det = S.view === 'detail';
  if (mod) {
    if (kl === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
    else if (kl === 'y') { e.preventDefault(); redo(); }
    else if (kl === 'c') { if (!String(getSelection())) { e.preventDefault(); e.shiftKey ? copyDialog() : copySettings(); } }
    else if (kl === 'v') { if (S.clipboard) { e.preventDefault(); pasteSettings(); } }
    else if (kl === 'e') { e.preventDefault(); openExport(); }
    else if (kl === 'a' && !det) { e.preventDefault(); S.sel = new Set(visible().map(p => p.id)); renderGrid(); renderGridHeadOnly(); }
    else if (k === '0') { e.preventDefault(); toggleHisto(); }
    else if (k === '+' || k === '=') { e.preventDefault(); const z = typeof S.zoom === 'number' ? S.zoom : .5; setZoom(Math.min(4, z * 2)); }
    else if (k === '-') { e.preventDefault(); const z = typeof S.zoom === 'number' ? S.zoom / 2 : 'fit'; setZoom(z < .2 ? 'fit' : z); }
    else if (k === '[' || k === ']') { e.preventDefault(); if (curPhoto() && R.hasImage) { setPanel('crop'); rotate90(k === ']' ? 1 : -1); } }
    return;
  }
  if (e.altKey && kl === 'y') { e.preventDefault(); setCmp(S.cmp === 'split-tb' ? 'off' : 'split-tb'); return; }
  if (e.altKey) return;
  const cur = curPhoto();
  switch (k) {
    case 'g': setView('grid'); break;
    case 'G': setView('square'); break;
    case 'd': case 'D': setView('detail'); break;
    case 'e': case 'E': if (e.shiftKey) openExport(); else setPanel('edit'); break;
    case 'c': case 'C': if (cur) setPanel('crop'); break;
    case 'h': case 'H': if (cur) setPanel('remove'); break;
    case 'm': case 'M': if (cur) setPanel('mask'); break;
    case 'i': case 'I': setPanel('info'); break;
    case 'k': case 'K': setPanel('keywords'); break;
    case 'P': setPanel('presets'); break;
    case 'p': $('#app').classList.toggle('no-left'); $('#app').classList.toggle('show-left'); requestRender(); setTimeout(() => S.view !== 'detail' && renderGrid(), 50); break;
    case 'V': setPanel('versions'); break;
    case 'v': if (cur && det) toggleBW(); break;
    case 'A': if (cur && det) doAuto(); break;
    case 'a': if (S.panel === 'remove') { S.heal.visualize = !S.heal.visualize; renderPanel(); requestRender(); } break;
    case 'R': if (cur) resetToOriginal(); break;
    case 'w': case 'W': if (cur) startWBPick(); break;
    case 'j': case 'J': toggleClip(); break;
    case 'o': case 'O': if (S.panel === 'mask') { S.mask.overlay = !S.mask.overlay; store.set('maskOverlay', S.mask.overlay); renderMaskList(); requestRender(); } break;
    case 'b': case 'l': case 'r': if (S.panel === 'mask' && cur) { const ty = { b: 'brush', l: 'linear', r: 'radial' }[k]; if (amask() && !S.mask.creating) addComp(ty, 'add'); else createMask(ty); } break;
    case '\\': if (det) setCmp(S.cmp === 'before' ? 'off' : 'before'); break;
    case 'y': case 'Y': if (det) setCmp(S.cmp === 'split-lr' ? 'off' : 'split-lr'); break;
    case '/': S.film = !S.film; store.set('film', S.film); renderFilm(); renderBottom(); break;
    case ' ': if (det && (t === document.body || t.closest('#stage'))) { e.preventDefault(); setZoom(S.zoom === 'fit' ? 1 : 'fit'); } break;
    case 'x': case 'X': if (S.panel === 'crop' && det) swapAspect(); else setFlag(-1); break;
    case 'z': case 'Z': setFlag(1); break;
    case 'u': case 'U': setFlag(0); break;
    case '0': case '1': case '2': case '3': case '4': case '5': if (!onRange) setRating(+k); break;
    case '[': case ']': { const f = k === ']' ? 1.15 : 1 / 1.15; if (S.panel === 'mask') { S.mask.brush.size = clamp(S.mask.brush.size * f, 1, 50); syncSliders(); drawOverlay(); } else if (S.panel === 'remove') { S.heal.size = clamp((S.heal.size ?? 4) * f, .5, 40); renderPanel(); drawOverlay(); } break; }
    case 'ArrowLeft': case 'ArrowRight': if (onRange || (t.classList && t.classList.contains('wheel'))) return; e.preventDefault(); stepPhoto(k === 'ArrowLeft' ? -1 : 1); break;
    case 'ArrowUp': case 'ArrowDown': if (!det && !onRange) { e.preventDefault(); gridStep(k === 'ArrowUp' ? -1 : 1); } break;
    case 'Enter': if (S.panel === 'crop' && det) setPanel('edit'); else if (!det && (t === document.body || t.closest('#grid'))) setView('detail'); break;
    case 'Escape': if (S.pick) endPick(); else if (S.panel === 'crop' && det) { cropCancel(); setPanel('edit'); } else if (S.cmp !== 'off') setCmp('off'); else if (S.mask.creating) { S.mask.creating = null; renderPanel(); } else $('#app').classList.remove('show-left'); break;
    case 'Delete': case 'Backspace': if (S.panel === 'remove' && S.heal.sel && det) deleteSpot(); else { e.preventDefault(); deleteSelected(); } break;
    case '?': showHelp(); break;
  }
}
function gridStep(dir) {
  const cells = $$('#grid .scell, #grid .jcell'); const i = cells.findIndex(c => c.dataset.id === S.cur); if (i < 0) return;
  const r0 = cells[i].getBoundingClientRect(), cx = r0.left + r0.width / 2;
  const cand = cells.filter(c => { const r = c.getBoundingClientRect(); return dir > 0 ? r.top > r0.top + 4 : r.top < r0.top - 4; });
  if (!cand.length) return; const rowTop = dir > 0 ? Math.min(...cand.map(c => c.getBoundingClientRect().top)) : Math.max(...cand.map(c => c.getBoundingClientRect().top));
  const row = cand.filter(c => Math.abs(c.getBoundingClientRect().top - rowTop) < 4); let best = row[0], bd = Infinity;
  for (const c of row) { const r = c.getBoundingClientRect(), d = Math.abs(r.left + r.width / 2 - cx); if (d < bd) { bd = d; best = c; } }
  S.sel = new Set([best.dataset.id]); setCurrent(best.dataset.id);
}

/* ---------- Verdrahtung ---------- */
function wire() {
  $('#tSidebar').innerHTML = icon('sidebar', 20); $('#tFilter').innerHTML = icon('filter', 18); $('#tUndo').innerHTML = icon('undo', 19); $('#tRedo').innerHTML = icon('redo', 19); $('#tShare').innerHTML = icon('share', 19); $('#tHelp').innerHTML = icon('help', 19); $('#tCloud').innerHTML = icon('cloud', 20); $('#searchIc').innerHTML = icon('search', 16); $('#searchClear').innerHTML = icon('close', 14);
  $('#tBack').innerHTML = icon('chevLeft', 22); $('#tAddM').innerHTML = icon('plus', 20); $('#tInfoM').innerHTML = icon('info', 20); $('#tMore').innerHTML = icon('more', 20);
  $('#tSidebar').onclick = () => { const a = $('#app'); if (innerWidth <= 980) a.classList.toggle('show-left'); else a.classList.toggle('no-left'); requestRender(); setTimeout(() => S.view !== 'detail' && renderGrid(), 50); };
  $('#tBack').onclick = () => S.view === 'detail' ? setView('grid') : $('#app').classList.toggle('show-left');
  $('#tInfoM').onclick = () => setPanel('info');
  $('#tMore').onclick = e => menu(e.currentTarget, [{ label: 'Rückgängig', fn: undo }, { label: 'Wiederholen', fn: redo }, '-', { label: 'Fotos hinzufügen', fn: () => $('#fileInput').click() }, { label: 'Versionen', fn: () => setPanel('versions') }, { label: 'Stichwörter', fn: () => setPanel('keywords') }, { label: 'Informationen', fn: () => setPanel('info') }, '-', { label: 'Einstellungen kopieren', fn: copySettings }, { label: 'Einstellungen einfügen', fn: pasteSettings }, { label: 'Auf Original zurücksetzen', fn: resetToOriginal }, '-', { label: 'Meine Fotos & Alben', fn: () => $('#app').classList.add('show-left') }]);
  $('#tUndo').onclick = undo; $('#tRedo').onclick = redo; $('#tShare').onclick = e => menu(e.currentTarget, [{ label: 'Exportieren …', key: 'Umschalt+E', fn: openExport }, { label: 'Fotos hinzufügen …', fn: () => $('#fileInput').click() }]); $('#tHelp').onclick = showHelp;
  $('#tFilter').onclick = e => filterMenu(e.currentTarget);
  const si = $('#search'); si.addEventListener('input', () => { S.filter.text = si.value; if (S.view === 'detail' && si.value) setView('grid'); refreshAll(); }); si.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Escape') { si.value = ''; S.filter.text = ''; refreshAll(); si.blur(); } });
  $('#searchClear').onclick = e => { e.preventDefault(); resetFilters(); };
  $('#fileInput').addEventListener('change', e => { const files = [...(e.target.files || [])]; e.target.value = ''; if (files.length) importFiles(files, S.source.kind === 'album' ? S.source.id : null); });
  $('#mSheetDone').onclick = () => { if (S.mSection && S.mSection !== 'light') { S.mSection = 'light'; renderPanel(); } else { $('#app').classList.add('sheet-closed'); requestRender(); } };
  let depth = 0; const files = e => e.dataTransfer && [...e.dataTransfer.types].includes('Files');
  window.addEventListener('dragenter', e => { if (!files(e)) return; e.preventDefault(); depth++; $('#drop').hidden = false; });
  window.addEventListener('dragover', e => { if (files(e)) e.preventDefault(); });
  window.addEventListener('dragleave', e => { if (!files(e)) return; depth = Math.max(0, depth - 1); if (!depth) $('#drop').hidden = true; });
  window.addEventListener('drop', e => { if (!files(e)) return; e.preventDefault(); depth = 0; $('#drop').hidden = true; importFiles(e.dataTransfer.files, S.source.kind === 'album' ? S.source.id : null); });
  document.addEventListener('paste', e => { const f = [...((e.clipboardData && e.clipboardData.files) || [])]; if (f.length) { e.preventDefault(); importFiles(f); } });
  document.addEventListener('keydown', onKey);
  document.addEventListener('pointerdown', e => { S.lastPointerShift = e.shiftKey; }, true);
  new ResizeObserver(() => { if (S.view !== 'detail') renderGrid(); }).observe($('#grid'));
  let wasMobile = isMobile(); addEventListener('resize', () => { const m = isMobile(); if (m !== wasMobile) { wasMobile = m; if (m && S.panel === 'edit') S.mSection = S.mSection || 'light'; renderPanel(); } drawHisto(); });
}

/* ---------- Start ---------- */
function bootStep(i) { $('#bootMsg').textContent = `Beispielfoto ${i + 1} von ${SAMPLES.length} wird entwickelt …`; $('#bootBar').style.width = Math.round((i + 1) / SAMPLES.length * 100) + '%'; }
async function boot() {
  try { R = new Renderer($('#glCanvas')); R.rasterize = rasterComp; }
  catch (e) { $('#bootMsg').textContent = 'Dieser Browser unterstützt kein WebGL2. Bitte eine aktuelle Version von Chrome, Edge, Firefox oder Safari verwenden.'; console.error(e); return; }
  await DB.open();
  const recs = (await DB.all()) || [];
  for (const p of recs) { p.settings = normalizeSettings(p.settings); p.keywords = p.keywords || []; p.versions = p.versions || []; S.photos.push(p); S.byId.set(p.id, p); }
  S.albums = (await DB.getMeta('albums')) || store.get('albums', []) || [];
  if (!S.photos.length && (!store.get('samples', false) || !DB.db)) { await loadSamples(bootStep); store.set('samples', true); S.albums = S.albums.length ? S.albums : [{ id: uid(), name: 'Landschaften', ids: S.photos.filter(p => /Bergsee|Kueste|Nebelwald/.test(p.name)).map(p => p.id), created: Date.now() }]; saveAlbums(); }
  S.source = store.get('source', { kind: 'all' }); if (S.source.kind === 'album' && !S.albums.find(a => a.id === S.source.id)) S.source = { kind: 'all' };
  S.showHisto = store.get('histo', true);
  renderRail(); renderMobileBars(); wire(); wireStage(); wireHisto();
  const last = store.get('cur', null), first = visible()[0];
  S.cur = S.byId.has(last) ? last : (first ? first.id : null); if (S.cur) S.sel = new Set([S.cur]);
  S.panel = store.get('panel', 'edit'); if (!PANEL_TITLES[S.panel]) S.panel = 'edit';
  if (isMobile()) { S.mSection = 'light'; if (S.panel !== 'edit') S.panel = 'edit'; }
  refreshAll();
  setView(S.cur ? store.get('view', 'detail') : 'grid');
  $('#boot').hidden = true;
  if (!DB.db) setTimeout(() => toast('Hinweis: Dieser Browser erlaubt keinen dauerhaften Speicher. Änderungen gelten nur für diese Sitzung.'), 900);
}
boot();
