/* ============================================================
   Bibliothek: Meine Fotos, Alben, Raster, Filmstreifen,
   Bottom-Bar, Suche & Filter, Import, Export, Kopieren/Einfügen
   ============================================================ */
const SOURCES = { all: 'Alle Fotos', recent: 'Zuletzt hinzugefügt', edited: 'Zuletzt bearbeitet', picked: 'Markiert' };
const _inSource = inSource;
inSource = function (p) { const s = S.source; if (s.kind === 'edited') return isEdited(p.settings); if (s.kind === 'picked') return p.flag === 1; return _inSource(p); };
function sourceTitle() { const s = S.source; if (s.kind === 'album') { const a = S.albums.find(a => a.id === s.id); return a ? a.name : 'Album'; } return SOURCES[s.kind] || 'Alle Fotos'; }
function setSource(src) { S.source = src; store.set('source', src); const v = visible(); if (!v.find(p => p.id === S.cur) && v[0]) { S.cur = v[0].id; S.sel = new Set([S.cur]); if (S.view === 'detail') { syncAll(); ensureLoaded(); } } if (S.view === 'detail' && !v.length) setView('grid'); refreshAll(); $('#app').classList.remove('show-left'); }

function renderLeft() {
  const L = $('#left'); L.replaceChildren();
  L.append(el('div', { class: 'ltabs' }, el('span', { class: 'on', html: icon('photos', 16) + 'Meine Fotos' })));
  const sec1 = el('div', { class: 'lsec' });
  sec1.append(el('label', { class: 'lrow', for: 'fileInput', role: 'button', html: icon('plus', 18) + '<span>Fotos hinzufügen</span>' }));
  const cnt = f => S.photos.filter(f).length;
  const rows = [['all', 'photos', S.photos.length], ['recent', 'recent', cnt(p => Date.now() - p.added < 2592e6)], ['edited', 'edit', cnt(p => isEdited(p.settings))], ['picked', 'flag', cnt(p => p.flag === 1)]];
  for (const [k, ic, n] of rows) sec1.append(el('button', { class: 'lrow' + (S.source.kind === k ? ' on' : ''), onclick: () => setSource({ kind: k }), html: icon(ic, 18) + `<span>${SOURCES[k]}</span><span class="cnt">${n}</span>` }));
  L.append(sec1);
  const addAlbum = el('button', { class: 'ib', title: 'Album erstellen', 'aria-label': 'Album erstellen', html: icon('plus', 16), onclick: () => createAlbum() });
  const sortA = el('button', { class: 'ib', title: 'Alben sortieren', 'aria-label': 'Alben sortieren', html: icon('sort', 15), onclick: () => menu(sortA, [['name', 'Albumname'], ['count', 'Anzahl der Fotos'], ['created', 'Erstellungsdatum']].map(([k, n]) => ({ label: n, checked: store.get('albumSort', 'name') === k, fn: () => { store.set('albumSort', k); renderLeft(); } }))) });
  L.append(el('div', { class: 'lhead' }, 'Alben', el('span', { class: 'grow' }), sortA, addAlbum));
  const sec2 = el('div', { class: 'lsec' }), as = store.get('albumSort', 'name');
  const albums = [...S.albums].sort((a, b) => as === 'count' ? b.ids.length - a.ids.length : as === 'created' ? b.created - a.created : a.name.localeCompare(b.name, 'de'));
  if (!albums.length) sec2.append(el('div', { class: 'lnote' }, 'Noch keine Alben. Mit + ein Album anlegen und Fotos aus dem Raster hineinziehen.'));
  for (const a of albums) {
    const r = el('button', { class: 'lrow' + (S.source.kind === 'album' && S.source.id === a.id ? ' on' : ''), onclick: () => setSource({ kind: 'album', id: a.id }), html: icon('album', 18) + `<span>${esc(a.name)}</span><span class="cnt">${a.ids.filter(id => S.byId.has(id)).length}</span>` });
    r.oncontextmenu = e => { e.preventDefault(); albumMenu(r, a); };
    r.ondragover = e => { e.preventDefault(); r.classList.add('on'); }; r.ondragleave = () => r.classList.remove('on');
    r.ondrop = e => { e.preventDefault(); r.classList.remove('on'); addToAlbum(a, selectedPhotos()); };
    sec2.append(r);
  }
  L.append(sec2);
  if (!S.photos.some(p => p.sample)) L.append(el('div', { class: 'lsec' }, el('button', { class: 'lrow', onclick: reloadSamples, html: icon('sparkle', 18) + '<span>Beispielfotos laden</span>' })));
  L.append(el('div', { class: 'grow' }), el('div', { class: 'lnote' }, `${S.photos.length} Fotos · ${DB.db ? 'gespeichert in diesem Browser' : 'nur für diese Sitzung (Browser-Speicher nicht verfügbar)'}`));
}
function albumMenu(anchor, a) { menu(anchor, [{ label: 'Ausgewählte Fotos hinzufügen', fn: () => addToAlbum(a, selectedPhotos()) }, { label: 'Ausgewählte Fotos aus Album entfernen', fn: () => { const ids = new Set(selectedPhotos().map(p => p.id)); a.ids = a.ids.filter(i => !ids.has(i)); saveAlbums(); refreshAll(); toast('Aus Album entfernt'); } }, '-', { label: 'Umbenennen …', fn: () => createAlbum(a) }, { label: 'Album löschen', fn: () => confirmDlg(`Album „${a.name}“ löschen?`, 'Die Fotos bleiben unter „Alle Fotos“ erhalten.', 'Löschen', () => { S.albums = S.albums.filter(x => x !== a); if (S.source.id === a.id) S.source = { kind: 'all' }; saveAlbums(); refreshAll(); }) }]); }
function addToAlbum(a, ps) { let n = 0; for (const p of ps) if (!a.ids.includes(p.id)) { a.ids.push(p.id); n++; } saveAlbums(); renderLeft(); toast(`${n} Foto${n === 1 ? '' : 's'} zu „${a.name}“ hinzugefügt`); }
function createAlbum(existing) {
  const inp = el('input', { class: 'field', value: existing ? existing.name : '', placeholder: 'Albumname' });
  const addSel = el('input', { type: 'checkbox', checked: !existing && S.sel.size > 0 });
  modal(existing ? 'Album umbenennen' : 'Album erstellen', [inp, existing ? null : el('label', { class: 'chk' }, addSel, `Ausgewählte Fotos hinzufügen (${selectedPhotos().length})`)], [{ label: 'Abbrechen' }, {
    label: existing ? 'Umbenennen' : 'Erstellen', primary: true, onClick: () => {
      const n = inp.value.trim(); if (!n) { inp.focus(); return false; }
      if (existing) existing.name = n; else { const a = { id: uid(), name: n, ids: addSel.checked ? selectedPhotos().map(p => p.id) : [], created: Date.now() }; S.albums.push(a); }
      saveAlbums(); refreshAll(); toast(existing ? 'Album umbenannt' : `Album „${n}“ erstellt`);
    }
  }]);
  setTimeout(() => inp.focus(), 30);
}

/* ---------- Raster ---------- */
S.thumb = store.get('thumbSize', 200);
function cellMeta(p) {
  const ov = el('span', { class: 'stars' }); for (let i = 1; i <= 5; i++) ov.append(i <= p.rating ? el('b', {}, '★') : '★');
  const fl = p.flag === 1 ? el('span', { class: 'flagi pick', html: icon('flag', 13), title: 'Markiert' }) : p.flag === -1 ? el('span', { class: 'flagi rej', html: icon('reject', 13), title: 'Abgelehnt' }) : el('span');
  const ed = el('span', { class: 'badge-edit', html: icon('edit', 14), title: 'Bearbeitet' }); ed.hidden = !isEdited(p.settings);
  return [fl, ov, ed];
}
function photoEvents(node, p) {
  node.dataset.id = p.id; node.draggable = true;
  node.addEventListener('click', e => clickPhoto(p.id, e));
  node.addEventListener('dblclick', () => { setCurrent(p.id); setView('detail'); });
  node.addEventListener('dragstart', e => { if (!S.sel.has(p.id)) { S.sel = new Set([p.id]); setCurrent(p.id); } e.dataTransfer.setData('text/plain', 'dk-photos'); e.dataTransfer.effectAllowed = 'copy'; });
  node.addEventListener('contextmenu', e => { e.preventDefault(); if (!S.sel.has(p.id)) { S.sel = new Set([p.id]); setCurrent(p.id); } photoMenu(node); });
}
function photoMenu(anchor) {
  const ps = selectedPhotos();
  menu(anchor, [{ label: 'In Detailansicht öffnen', fn: () => setView('detail') }, { label: 'Bearbeitungseinstellungen kopieren', key: 'Strg+C', fn: copySettings }, { label: 'Bearbeitungseinstellungen einfügen', key: 'Strg+V', fn: pasteSettings },
  { label: 'Auf Original zurücksetzen', fn: () => { for (const p of ps) { p.settings = DEFAULTS(); pushHist(p, 'Auf Original zurückgesetzt'); photoChanged(p); } syncAll(); toast('Zurückgesetzt'); } }, '-',
  ...S.albums.map(a => ({ label: `Zu „${a.name}“ hinzufügen`, fn: () => addToAlbum(a, ps) })), { label: 'Neues Album mit Auswahl …', fn: () => createAlbum() }, '-',
  { label: 'Exportieren …', key: 'Umschalt+E', fn: openExport }, { label: ps.length > 1 ? `${ps.length} Fotos entfernen` : 'Foto entfernen', key: 'Entf', fn: deleteSelected }]);
}
function monthKey(t) { const d = new Date(t); return d.getFullYear() * 12 + d.getMonth(); }
function monthName(t) { return new Date(t).toLocaleDateString('de-CH', { month: 'long', year: 'numeric' }); }
function renderGrid() {
  const G = $('#grid'); if (G.hidden) return; const keep = G.scrollTop; G.replaceChildren();
  const vis = visible();
  $('#gridHead').replaceChildren(el('span', { html: icon(S.source.kind === 'album' ? 'album' : 'photos', 18) }), el('span', { class: 't' }, sourceTitle()), el('span', { class: 'c' }, `${S.sel.size > 1 ? S.sel.size + ' ausgewählt · ' : ''}${vis.length} von ${S.photos.filter(inSource).length} Fotos${vis.length !== S.photos.filter(inSource).length ? ' (gefiltert)' : ''}`));
  if (!vis.length) {
    G.append(el('div', { class: 'empty' }, el('b', {}, S.photos.length ? 'Keine Fotos gefunden' : 'Noch keine Fotos'), el('div', {}, S.photos.length ? 'Passe Suche oder Filter an.' : 'Füge Fotos hinzu oder ziehe sie in dieses Fenster.'),
      el('div', { style: 'display:flex;gap:8px;justify-content:center' }, S.photos.length ? el('button', { class: 'gbtn', onclick: resetFilters }, 'Filter zurücksetzen') : el('label', { class: 'gbtn blue', for: 'fileInput', role: 'button' }, 'Fotos hinzufügen'), !S.photos.some(p => p.sample) ? el('button', { class: 'gbtn', onclick: reloadSamples }, 'Beispielfotos laden') : null)));
    return;
  }
  const W = G.clientWidth - 4;
  const groups = []; let cur = null;
  for (const p of vis) { const k = S.sort === 'captured' ? monthKey(p.captured) : S.sort === 'added' ? monthKey(p.added) : 0; if (!cur || cur.k !== k) { cur = { k, t: S.sort === 'captured' ? p.captured : p.added, items: [] }; groups.push(cur); } cur.items.push(p); }
  for (const g of groups) {
    if (S.sort === 'captured' || S.sort === 'added') G.append(el('div', { class: 'mhead' }, monthName(g.t)));
    if (S.view === 'square') {
      const sg = el('div', { class: 'sgrid', style: `--cell-size:${S.thumb}px` });
      for (const p of g.items) {
        const typ = (p.type.split('/')[1] || 'IMG').toUpperCase().replace('JPEG', 'JPG');
        const c = el('div', { class: 'scell' + (S.sel.has(p.id) ? ' sel' : '') + (p.flag === -1 ? ' rej' : ''), role: 'option', 'aria-selected': String(S.sel.has(p.id)), title: p.name },
          el('div', { class: 'sh' }, el('span', { class: 'n' }, p.name), el('span', { class: 'badge' }, typ)),
          el('div', { class: 'si' }, el('img', { src: p.thumb, alt: p.name, 'data-tid': p.id, draggable: 'false', loading: 'lazy' })),
          el('div', { class: 'sf' }, ...cellMeta(p)));
        photoEvents(c, p); sg.append(c);
      }
      G.append(sg);
    } else {
      const H0 = S.thumb * .85; let row = [], rw = 0;
      const flushRow = last => { if (!row.length) return; const gaps = (row.length - 1) * 4, h = last && rw * H0 + gaps < W * .7 ? H0 : (W - gaps) / rw; const r = el('div', { class: 'jrow' }); for (const p of row) { const c = el('div', { class: 'jcell' + (S.sel.has(p.id) ? ' sel' : '') + (p.flag ? ' flagged' : '') + (p.flag === -1 ? ' rej' : ''), style: `width:${(p.ratio || p.w / p.h) * h}px;height:${h}px`, role: 'option', 'aria-selected': String(S.sel.has(p.id)), title: p.name }, el('img', { src: p.thumb, alt: p.name, 'data-tid': p.id, draggable: 'false', loading: 'lazy' }), el('div', { class: 'ov' }, ...cellMeta(p))); photoEvents(c, p); r.append(c); } G.append(r); row = []; rw = 0; };
      for (const p of g.items) { row.push(p); rw += (p.ratio || p.w / p.h); if (rw * H0 + (row.length - 1) * 4 >= W) flushRow(false); }
      flushRow(true);
    }
  }
  G.scrollTop = keep;
}
function renderFilm() {
  const f = $('#film'); f.hidden = S.view !== 'detail' || !S.film; if (f.hidden) return; f.replaceChildren();
  for (const p of visible()) { const t = el('div', { class: 'fthumb' + (S.sel.has(p.id) ? ' sel' : '') + (p.id === S.cur ? ' cur' : '') + (p.flag === -1 ? ' rej' : ''), role: 'option', 'aria-selected': String(p.id === S.cur), title: p.name }, el('img', { src: p.thumb, alt: p.name, 'data-tid': p.id, draggable: 'false' })); photoEvents(t, p); f.append(t); }
  const c = f.querySelector('.cur'); if (c) c.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}
function clickPhoto(id, e) {
  const vis = visible().map(p => p.id);
  if (e.shiftKey && S.cur) { const a = vis.indexOf(S.cur), b = vis.indexOf(id); const [lo, hi] = a < b ? [a, b] : [b, a]; S.sel = new Set(vis.slice(lo, hi + 1)); }
  else if (e.metaKey || e.ctrlKey) { if (S.sel.has(id)) S.sel.delete(id); else S.sel.add(id); if (!S.sel.size) S.sel.add(id); }
  else S.sel = new Set([id]);
  setCurrent(id);
}
function setCurrent(id) {
  if (S.pick) endPick();
  const changed = S.cur !== id; S.cur = id; store.set('cur', id); S.preview = null; S.presetAmount = null; S.heal.sel = null; S.cropEntry = null;
  if (changed) { S.pan = { x: 0, y: 0 }; S.mask.active = null; S.mask.creating = null; const p = curPhoto(); if (p && p.settings.masks.length) S.mask.active = p.settings.masks[p.settings.masks.length - 1].id; }
  $$('.jcell,.scell,.fthumb').forEach(c => { const sel = S.sel.has(c.dataset.id); c.classList.toggle('sel', sel); c.classList.toggle('cur', c.dataset.id === S.cur); c.setAttribute('aria-selected', String(sel)); });
  const fc = $('#film .cur'); if (fc) fc.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  if (S.view !== 'detail') { const c = $(`#grid [data-id="${id}"]`); if (c) c.scrollIntoView({ block: 'nearest' }); renderGridHeadOnly(); }
  renderBottom(); renderPanel(); renderMaskList();
  if (S.view === 'detail') ensureLoaded();
}
function renderGridHeadOnly() { const c = $('#gridHead .c'); if (c) { const vis = visible(); c.textContent = `${S.sel.size > 1 ? S.sel.size + ' ausgewählt · ' : ''}${vis.length} von ${S.photos.filter(inSource).length} Fotos`; } }
function stepPhoto(d) { const vis = visible(); if (!vis.length) return; let i = vis.findIndex(p => p.id === S.cur); i = clamp(i + d, 0, vis.length - 1); S.sel = new Set([vis[i].id]); setCurrent(vis[i].id); }
function gridCols() { const cells = $$('#grid .scell, #grid .jcell'); const i = cells.findIndex(c => c.dataset.id === S.cur); if (i < 0) return 1; const top = cells[i].offsetTop; let below = cells.findIndex((c, j) => j > i && c.offsetTop > top + 4); return below < 0 ? 1 : Math.max(1, below - cells.slice(0, below).filter(c => c.offsetTop === cells[below].offsetTop).length - i + cells.slice(0, below).filter(c => c.offsetTop === cells[below].offsetTop).length) || 1; }

/* ---------- Bottom-Bar ---------- */
S.film = store.get('film', true);
function renderBottom() {
  const B = $('#bottom'); B.replaceChildren(); const p = curPhoto();
  const vb = (v, ic, t) => el('button', { class: 'ib' + (S.view === v ? ' on' : ''), title: t, 'aria-label': t, html: icon(ic, 18), onclick: () => setView(v) });
  B.append(vb('grid', 'grid', 'Fotoraster (G)'), vb('square', 'square', 'Quadratisches Raster'), vb('detail', 'detail', 'Detailansicht (D)'), el('span', { class: 'vsep' }));
  const sortB = el('button', { class: 'ib', style: 'width:auto;padding:0 6px;gap:2px;display:flex', title: 'Sortieren', 'aria-label': 'Sortieren', html: icon('sort', 17) + icon('chevDown', 12) });
  sortB.onclick = () => menu(sortB, [['captured', 'Aufnahmedatum'], ['added', 'Importdatum'], ['name', 'Dateiname'], ['rating', 'Bewertung']].map(([k, n]) => ({ label: n, checked: S.sort === k, fn: () => { S.sort = k; store.set('sort', k); refreshAll(); } })).concat(['-', { label: S.sortDir < 0 ? 'Älteste/kleinste zuerst' : 'Neueste/größte zuerst', fn: () => { S.sortDir *= -1; store.set('sortDir', S.sortDir); refreshAll(); } }]));
  B.append(sortB, el('span', { class: 'grow' }));
  const rate = el('div', { class: 'rate' }); const rv = p ? p.rating : 0;
  for (let i = 1; i <= 5; i++) rate.append(el('button', { class: i <= rv ? 'on' : '', title: `${i} Stern${i > 1 ? 'e' : ''} (${i})`, 'aria-label': `${i} Sterne`, html: icon('star', 15), onclick: () => setRating(rv === i ? 0 : i) }));
  const fp = el('button', { class: 'ib' + (p && p.flag === 1 ? ' on' : ''), title: 'Als markiert kennzeichnen (P)', 'aria-label': 'Markieren', html: icon('flag', 16), onclick: () => setFlag(p && p.flag === 1 ? 0 : 1) });
  const fr = el('button', { class: 'ib' + (p && p.flag === -1 ? ' on' : ''), title: 'Als abgelehnt kennzeichnen (X)', 'aria-label': 'Ablehnen', html: icon('reject', 16), onclick: () => setFlag(p && p.flag === -1 ? 0 : -1) });
  B.append(el('div', { class: 'pillbar' }, rate, el('span', { class: 'vsep', style: 'height:16px' }), fp, fr));
  const gear = el('button', { class: 'ib', title: 'Optionen zum Kopieren', 'aria-label': 'Optionen zum Kopieren', html: icon('more', 16) });
  gear.onclick = () => menu(gear, [{ label: 'Einstellungen einfügen', key: 'Strg+V', fn: pasteSettings }, { label: 'Einstellungen zum Kopieren auswählen …', key: 'Strg+Umschalt+C', fn: copyDialog }, { label: 'Auf Original zurücksetzen', key: 'Umschalt+R', fn: resetToOriginal }]);
  B.append(el('button', { class: 'pilltxt', onclick: copySettings, title: 'Bearbeitungseinstellungen kopieren (Strg+C)', html: S.clipboard ? 'Kopiert ✓' : '<span class="lng">Bearbeitungseinstellungen </span>kopieren' }), gear, el('span', { class: 'grow' }));
  if (S.view === 'detail') {
    const z = el('div', { class: 'zoomsel' });
    for (const [k, n] of [['fit', 'Einpassen'], [1, '100 %']]) z.append(el('button', { class: S.zoom === k ? 'on' : '', onclick: () => setZoom(k) }, n));
    const zm = el('button', { class: 'ib', style: 'width:22px', 'aria-label': 'Weitere Zoomstufen', html: icon('chevDown', 12) });
    zm.onclick = () => menu(zm, [{ label: 'Einpassen', checked: S.zoom === 'fit', fn: () => setZoom('fit') }, { label: 'Ausfüllen', checked: S.zoom === 'fill', fn: () => setZoom('fill') }, '-', ...[.25, .5, 1, 2, 4].map(v => ({ label: Math.round(v * 100) + ' %', checked: S.zoom === v, fn: () => setZoom(v) }))]);
    z.append(zm); B.append(z);
    B.append(el('button', { class: 'ib' + (S.film ? ' on' : ''), title: 'Filmstreifen (/)', 'aria-label': 'Filmstreifen', html: icon('film', 18), onclick: () => { S.film = !S.film; store.set('film', S.film); renderFilm(); renderBottom(); } }));
    const cmp = el('button', { class: 'ib' + (S.cmp !== 'off' ? ' on' : ''), title: 'Vorher/Nachher (\\, Y)', 'aria-label': 'Vorher/Nachher', html: icon('compare', 18) });
    cmp.onclick = () => menu(cmp, [['off', 'Aus'], ['before', 'Original anzeigen', '\\'], ['split-lr', 'Links/rechts geteilt', 'Y'], ['split-tb', 'Oben/unten geteilt', 'Alt+Y'], ['side-lr', 'Nebeneinander'], ['side-tb', 'Übereinander']].map(([k, n, key]) => ({ label: n, key, checked: S.cmp === k, fn: () => setCmp(k) })));
    B.append(cmp);
  } else {
    const r = el('input', { type: 'range', class: 'rg mini', min: 110, max: 380, value: S.thumb, 'aria-label': 'Miniaturgröße', style: '--a:0%;--b:' + ((S.thumb - 110) / 270 * 100) + '%' });
    r.oninput = () => { S.thumb = +r.value; store.set('thumbSize', S.thumb); r.style.setProperty('--b', ((S.thumb - 110) / 270 * 100) + '%'); renderGrid(); };
    B.append(r);
  }
}
function setRating(n) { const ps = S.view === 'detail' ? [curPhoto()].filter(Boolean) : selectedPhotos(); for (const p of ps) { p.rating = n; persist(p); } toast(n ? 'Bewertung: ' + '★'.repeat(n) + '☆'.repeat(5 - n) : 'Bewertung entfernt'); refreshAll(); }
function setFlag(f) { const ps = S.view === 'detail' ? [curPhoto()].filter(Boolean) : selectedPhotos(); for (const p of ps) { p.flag = f; persist(p); } toast(f === 1 ? 'Als markiert gekennzeichnet' : f === -1 ? 'Als abgelehnt gekennzeichnet' : 'Markierung entfernt'); refreshAll(); }

/* ---------- Suche & Filter ---------- */
function resetFilters() { S.filter = { rating: 0, ratingOp: '>=', flag: 'all', edited: 'all', text: '' }; $('#search').value = ''; refreshAll(); }
function renderSearch() {
  const chips = $('#searchChips'); chips.replaceChildren(); const f = S.filter;
  const chip = (t, clear) => chips.append(el('span', { class: 'chip' }, t, el('button', { 'aria-label': t + ' entfernen', html: icon('close', 11), onclick: e => { e.preventDefault(); clear(); refreshAll(); } })));
  if (f.rating) chip(`Bewertung ${f.ratingOp === '>=' ? '≥' : f.ratingOp === '<=' ? '≤' : '='} ${f.rating}★`, () => f.rating = 0);
  if (f.flag !== 'all') chip({ picked: 'Markiert', unflagged: 'Ohne Markierung', rejected: 'Abgelehnt' }[f.flag], () => f.flag = 'all');
  if (f.edited !== 'all') chip(f.edited === 'edited' ? 'Bearbeitet' : 'Unbearbeitet', () => f.edited = 'all');
  $('#search').placeholder = S.source.kind === 'album' ? `„${sourceTitle()}“ durchsuchen` : S.source.kind === 'all' ? 'Alle Fotos durchsuchen' : `${sourceTitle()} durchsuchen`;
  $('#searchClear').hidden = !f.text && !f.rating && f.flag === 'all' && f.edited === 'all';
  $('#tFilter').classList.toggle('on', !!(f.rating || f.flag !== 'all' || f.edited !== 'all'));
}
function filterMenu(anchor) {
  const f = S.filter, set = fn => () => { fn(); refreshAll(); };
  menu(anchor, [{ head: 'Bewertung' }, ...[1, 2, 3, 4, 5].map(n => ({ label: '≥ ' + '★'.repeat(n), checked: f.rating === n && f.ratingOp === '>=', fn: set(() => { f.rating = n; f.ratingOp = '>='; }) })), { label: 'Genau 0 Sterne', checked: f.rating === 0 && f.ratingOp === '=', fn: set(() => { f.rating = 0; f.ratingOp = '>='; }) },
  '-', { head: 'Markierung' }, ...[['all', 'Alle'], ['picked', 'Markiert'], ['unflagged', 'Ohne Markierung'], ['rejected', 'Abgelehnt']].map(([k, n]) => ({ label: n, checked: f.flag === k, fn: set(() => f.flag = k) })),
  '-', { head: 'Bearbeitung' }, ...[['all', 'Alle'], ['edited', 'Bearbeitet'], ['unedited', 'Unbearbeitet']].map(([k, n]) => ({ label: n, checked: f.edited === k, fn: set(() => f.edited = k) })), '-', { label: 'Filter zurücksetzen', fn: resetFilters }]);
}

/* ---------- Kopieren & Einfügen ---------- */
const COPY_GROUPS = { profile: ['Profil & Behandlung', ['profile', 'profileAmount', 'bw']], light: ['Licht', SECTION_KEYS.light], color: ['Farbe', SECTION_KEYS.color], effects: ['Effekte', SECTION_KEYS.effects], detail: ['Detail', SECTION_KEYS.detail], optics: ['Optik', SECTION_KEYS.optics], geometry: ['Geometrie & Zuschneiden', GEOMETRY_KEYS], masks: ['Masken', ['masks']], heal: ['Entfernen & Rote Augen', ['spots', 'redeye']] };
function copySettings(groups) {
  const p = curPhoto(); if (!p) return;
  const g = Array.isArray(groups) ? groups : store.get('copyGroups', ['profile', 'light', 'color', 'effects', 'detail', 'optics']);
  const out = {}; for (const k of g) for (const key of COPY_GROUPS[k][1]) out[key] = clone(p.settings[key]);
  S.clipboard = out; renderBottom(); toast('Bearbeitungseinstellungen kopiert');
}
function copyDialog() {
  const sel = new Set(store.get('copyGroups', ['profile', 'light', 'color', 'effects', 'detail', 'optics'])), boxes = [];
  const list = el('div'); for (const [k, [n]] of Object.entries(COPY_GROUPS)) { const i = el('input', { type: 'checkbox', checked: sel.has(k) }); i.dataset.k = k; boxes.push(i); list.append(el('label', { class: 'chk' }, i, n)); }
  const all = v => () => boxes.forEach(b => b.checked = v);
  modal('Einstellungen kopieren', [el('div', { style: 'display:flex;gap:8px' }, el('button', { class: 'gbtn', onclick: all(true) }, 'Alle'), el('button', { class: 'gbtn', onclick: all(false) }, 'Keine')), list], [{ label: 'Abbrechen' }, { label: 'Kopieren', primary: true, onClick: () => { const g = boxes.filter(b => b.checked).map(b => b.dataset.k); store.set('copyGroups', g); copySettings(g); } }]);
}
function pasteSettings() {
  if (!S.clipboard) { toast('Noch nichts kopiert. Zuerst mit Strg+C die Einstellungen eines Fotos kopieren.'); return; }
  const ps = selectedPhotos();
  for (const p of ps) { p.settings = normalizeSettings(Object.assign(clone(p.settings), clone(S.clipboard))); if (p.id === S.cur) { pushHist(p, 'Einstellungen eingefügt'); photoChanged(p); } else { pushHist(p, 'Einstellungen eingefügt'); photoChanged(p); } }
  syncAll(); renderPanel(); refreshAll(); toast(`Einstellungen auf ${ps.length} Foto${ps.length > 1 ? 's' : ''} übertragen`);
}
function resetToOriginal() { const p = curPhoto(); if (!p) return; p.settings = DEFAULTS(); syncAll(); renderPanel(); commit('Auf Original zurückgesetzt'); toast('Auf Original zurückgesetzt'); }

/* ---------- Löschen ---------- */
function deleteSelected() {
  const ps = selectedPhotos(); if (!ps.length) return;
  confirmDlg(ps.length > 1 ? `${ps.length} Fotos entfernen?` : `„${ps[0].name}“ entfernen?`, 'Die Fotos und ihre Bearbeitungen werden aus diesem Browser gelöscht. Deine Originaldateien auf dem Gerät bleiben unberührt.', 'Entfernen', async () => {
    const vis = visible(); const idx = Math.max(0, vis.findIndex(p => p.id === ps[0].id));
    for (const p of ps) { await DB.del(p.id); S.byId.delete(p.id); S.hist.delete(p.id); imgCache.delete(p.id); if (S.loadedId === p.id) S.loadedId = null; for (const a of S.albums) a.ids = a.ids.filter(i => i !== p.id); }
    S.photos = S.photos.filter(p => S.byId.has(p.id)); saveAlbums();
    const rest = visible(), next = rest[Math.min(idx, rest.length - 1)];
    S.sel = new Set(next ? [next.id] : []); S.cur = next ? next.id : null;
    toast(`${ps.length} Foto${ps.length > 1 ? 's' : ''} entfernt`); refreshAll(); if (S.view === 'detail') { if (!next) setView('grid'); else setCurrent(next.id); }
  });
}
async function reloadSamples() { $('#boot').hidden = false; await loadSamples(i => bootStep(i)); $('#boot').hidden = true; store.set('samples', true); if (!S.cur && S.photos.length) { S.cur = S.photos[0].id; S.sel = new Set([S.cur]); } refreshAll(); toast('Beispielfotos geladen'); }

/* ---------- Export ---------- */
let downloadsP = null;
function getDownloads() { if (!downloadsP) downloadsP = (window.claude && window.claude.use) ? window.claude.use('downloads').catch(() => null) : Promise.resolve(null); return downloadsP; }
async function saveFile(blob, filename) {
  const d = await getDownloads();
  if (d) { try { await d.save({ filename, data: blob }); return 'saved'; } catch (e) { if (e && e.code === 'declined') return 'declined'; if (e && e.code === 'rate_limited') { await sleep(1500); return saveFile(blob, filename); } if (e && !['unavailable', 'not_granted', 'capability_disabled', 'capability_removed'].includes(e.code)) throw e; } }
  const url = URL.createObjectURL(blob), a = el('a', { href: url, download: filename }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 15000); return 'saved';
}
function downscale(src, w, h) { let c = src; while (c.width / 2 > w && c.height / 2 > h) { const n = mkCanvas(Math.round(c.width / 2), Math.round(c.height / 2)); n.getContext('2d').drawImage(c, 0, 0, n.width, n.height); c = n; } const o = mkCanvas(w, h), x = o.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(c, 0, 0, w, h); return o; }
function openExport() {
  const ps = S.view === 'detail' ? [curPhoto()].filter(Boolean) : selectedPhotos();
  if (!ps.length) { toast('Kein Foto zum Exportieren ausgewählt.'); return; }
  const fmt = el('select', { class: 'sel', id: 'exFmt' }, el('option', { value: 'jpeg' }, 'JPG'), el('option', { value: 'png' }, 'PNG'), el('option', { value: 'webp' }, 'WebP')); fmt.value = store.get('exFmt', 'jpeg');
  const q = el('input', { type: 'range', class: 'rg', id: 'exQ', min: 40, max: 100, value: store.get('exQ', 90) }), qv = el('span', { class: 'num', style: 'width:40px;text-align:right' });
  const sizeSel = el('select', { class: 'sel', id: 'exSize' }, el('option', { value: 'full' }, 'Volle Größe'), el('option', { value: 'long' }, 'Lange Kante'), el('option', { value: '2048' }, 'Klein (2048 px)')); sizeSel.value = store.get('exSize', 'full');
  const longIn = el('input', { class: 'field', id: 'exLong', inputmode: 'numeric', value: store.get('exLong', 3000), style: 'max-width:90px', 'aria-label': 'Lange Kante in Pixel' }), pxL = el('span', { class: 'dim' }, 'px');
  const base = ps[0].name.replace(/\.[^.]+$/, ''), nameIn = el('input', { class: 'field', id: 'exName', value: ps.length === 1 ? base : '-bearbeitet' });
  const info = el('div', { class: 'dim', style: 'font-size:12px' }), qRow = el('div', { class: 'frow' }, el('label', { for: 'exQ' }, 'Qualität'), el('div', { style: 'display:flex;align-items:center;gap:8px' }, q, qv));
  const longEdge = () => sizeSel.value === 'long' ? clamp(parseInt(longIn.value) || 3000, 64, 20000) : sizeSel.value === '2048' ? 2048 : 0;
  const upd = () => {
    qv.textContent = q.value + ' %'; q.style.setProperty('--a', '0%'); q.style.setProperty('--b', ((q.value - 40) / 60 * 100) + '%'); qRow.hidden = fmt.value === 'png'; longIn.hidden = pxL.hidden = sizeSel.value !== 'long';
    const p = ps[0], wr = Math.min(R.maxTex, Math.max(p.w, p.h)) / Math.max(p.w, p.h), o = outputSize(p.settings, Math.round(p.w * wr), Math.round(p.h * wr)); let w = o.w, h = o.h; const L = longEdge(); if (L && Math.max(w, h) > L) { const k = L / Math.max(w, h); w = Math.round(w * k); h = Math.round(h * k); }
    info.textContent = ps.length === 1 ? `Ausgabe: ${w} × ${h} px` + (wr < 1 ? ` · Bearbeitungsauflösung dieses Geräts: max. ${R.maxTex} px` : '') : `${ps.length} Fotos · Dateiname = Originalname + Zusatz`;
  };
  [fmt, q, sizeSel, longIn].forEach(e => e.addEventListener('input', upd));
  modal(ps.length === 1 ? 'Foto exportieren' : `${ps.length} Fotos exportieren`, [el('div', { class: 'frow' }, el('label', { for: 'exFmt' }, 'Dateityp'), fmt), qRow, el('div', { class: 'frow' }, el('label', { for: 'exSize' }, 'Größe'), el('div', { style: 'display:flex;align-items:center;gap:6px' }, sizeSel, longIn, pxL)), el('div', { class: 'frow' }, el('label', { for: 'exName' }, ps.length === 1 ? 'Dateiname' : 'Namenszusatz'), nameIn), info], [{ label: 'Abbrechen' }, {
    label: ps.length === 1 ? 'Exportieren' : `${ps.length} Fotos exportieren`, primary: true, onClick: async () => {
      store.set('exFmt', fmt.value); store.set('exQ', +q.value); store.set('exSize', sizeSel.value); store.set('exLong', parseInt(longIn.value) || 3000);
      const mime = 'image/' + fmt.value, ext = fmt.value === 'jpeg' ? 'jpg' : fmt.value; let n = 0;
      for (const [i, p] of ps.entries()) {
        progress(`Exportiere ${p.name} (${i + 1}/${ps.length}) …`, (i + .3) / ps.length); await sleep(30);
        try {
          const run = r => { const s = effective(p.settings), o = outputSize(s, r.w, r.h); return r.toCanvas(s, o.w, o.h); };
          let c = S.loadedId === p.id ? run(R) : await withBG(p, run);
          const L = longEdge(); if (L && Math.max(c.width, c.height) > L) { const k = L / Math.max(c.width, c.height); c = downscale(c, Math.round(c.width * k), Math.round(c.height * k)); }
          const blob = await new Promise(r => c.toBlob(r, mime, +q.value / 100));
          const fname = (ps.length === 1 ? (nameIn.value.trim() || base) : p.name.replace(/\.[^.]+$/, '') + nameIn.value.trim()).replace(/[\\/:*?"<>|]/g, '_') + '.' + ext;
          if ((await saveFile(blob, fname)) === 'saved') { n++; toast(`Exportiert: ${fname} (${fmtBytes(blob.size)})`); } else toast('Speichern abgebrochen');
        } catch (e) { toast(`Export von ${p.name} fehlgeschlagen: ${e.message || e.code || e}`); }
      }
      progress(null); if (ps.length > 1) toast(`${n} von ${ps.length} Fotos exportiert`); requestRender();
    }
  }]);
  upd();
}
