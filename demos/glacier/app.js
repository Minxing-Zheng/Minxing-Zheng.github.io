/* Glacier Observatory. Displayed research results, preserved without new inference. */
(() => {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const svgIcon = (name, cls = '') => `<svg class="icon ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const pct = (n) => `${(n * 100).toFixed(1)}%`;
  const pad = (n) => String(n).padStart(3, '0');
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const state = {patches: [], filtered: [], selected: 88, max: 1, reviewOnly: false, search: '', sort: 'accuracy-asc', viewport: false, mode: 'side', palette: 'modern', zoom: 1, pan: {x: 0, y: 0}, reviews: {}, locations: new Map(), markers: new Map(), request: 0};
  let map, clusters, selectedHalo, glacierLayer, glacierPromise, toastTimer, renderMapTimer, currentBase, storageAvailable = true;
  const imageCache = new Map();
  const STORE_KEY = 'glacier-observatory-review-v1';
  try { state.reviews = JSON.parse(localStorage.getItem(STORE_KEY) || '{}') || {}; }
  catch { state.reviews = {}; storageAvailable = false; }

  function accuracyColor(value) {
    const stops = [[.5, [199, 106, 89]], [.7, [211, 154, 91]], [.82, [127, 161, 139]], [1, [27, 115, 120]]];
    let high = stops.findIndex(([at]) => value <= at);
    if (high <= 0) return `rgb(${stops[high === -1 ? stops.length - 1 : 0][1].join(',')})`;
    const [a, c1] = stops[high - 1], [b, c2] = stops[high];
    const t = clamp((value - a) / (b - a), 0, 1);
    return `rgb(${c1.map((c, i) => Math.round(c + (c2[i] - c) * t)).join(',')})`;
  }
  function toast(message) {
    $('#toast').textContent = message;
    $('#toast').hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 3200);
  }
  function persistReviews() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state.reviews)); }
    catch { storageAvailable = false; }
    $('#note-status').textContent = storageAvailable ? 'Notes and review marks are saved in this browser.' : 'Browser storage is unavailable. Export your selection to keep these notes.';
  }
  function selectedPatch() { return state.patches.find((p) => p.id === state.selected); }
  function displayPath(p, kind) { return kind !== 'raw' && state.palette === 'modern' ? p[kind + 'Modern'] || p[kind] : p[kind]; }
  function setPalette(value) {
    state.palette = value;
    document.documentElement.style.setProperty('--clean-color', value === 'modern' ? '#58c8d6' : '#0000ff');
    document.documentElement.style.setProperty('--debris-color', value === 'modern' ? '#d8a96d' : '#55aa00');
    document.documentElement.style.setProperty('--background-color', value === 'modern' ? '#263945' : '#e9e9e9');
    selectPatch(state.selected);
  }
  function isReviewed(id) { return Boolean(state.reviews[id]?.marked); }
  function coordsText(p, short = false) {
    if (!p?.location) return 'Location not available';
    const {latitude: lat, longitude: lon} = p.location;
    return `${Math.abs(lat).toFixed(short ? 2 : 3)}°${lat >= 0 ? 'N' : 'S'} ${short ? ' / ' : ' · '}${Math.abs(lon).toFixed(short ? 2 : 3)}°${lon >= 0 ? 'E' : 'W'}`;
  }
  async function fetchJSON(path) {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Could not load ${path} (${response.status})`);
    return response.json();
  }
  function loadImage(path) {
    if (!imageCache.has(path)) {
      imageCache.set(path, new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => { imageCache.delete(path); reject(new Error('Image unavailable: ' + path)); };
        image.src = path;
      }));
    }
    return imageCache.get(path);
  }
  function download(blob, name) {
    const url = URL.createObjectURL(blob), anchor = document.createElement('a');
    anchor.href = url; anchor.download = name; anchor.hidden = true;
    document.body.append(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  function initMap() {
    map = L.map('map', {zoomControl: true, preferCanvas: true, minZoom: 3, maxZoom: 17, scrollWheelZoom: false, zoomSnap: .5, attributionControl: true}).setView([32.5, 81.5], 5);
    map.on('focus', () => map.scrollWheelZoom.enable());
    map.on('blur', () => map.scrollWheelZoom.disable());
    map.on('mousedown', () => map.scrollWheelZoom.enable());
    const basemaps = {
      satellite: () => L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {attribution: 'Imagery © Esri, Maxar, Earthstar Geographics', maxNativeZoom: 17, maxZoom: 17}),
      terrain: () => L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}', {attribution: 'Terrain © Esri, USGS, NOAA', maxNativeZoom: 13, maxZoom: 17}),
      light: () => L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors · © <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>', subdomains: 'abcd', maxZoom: 17})
    };
    function changeBasemap(name) {
      if (currentBase) map.removeLayer(currentBase);
      currentBase = basemaps[name]().addTo(map);
      $$('.basemap-control button').forEach((b) => b.classList.toggle('active', b.dataset.basemap === name));
      let failures = 0;
      currentBase.on('tileerror', () => { if (++failures === 6) toast('Some map tiles could not load. Try another map style.'); });
    }
    $$('.basemap-control button').forEach((b) => b.addEventListener('click', () => changeBasemap(b.dataset.basemap)));
    changeBasemap('satellite');
    L.control.scale({imperial: false, position: 'bottomright', maxWidth: 100}).addTo(map);
    clusters = L.markerClusterGroup({showCoverageOnHover: false, maxClusterRadius: 35, spiderfyOnMaxZoom: true, zoomToBoundsOnClick: true, disableClusteringAtZoom: 11,
      iconCreateFunction: (cluster) => {
        const children = cluster.getAllChildMarkers();
        const avg = children.reduce((sum, marker) => sum + marker.options.patchAccuracy, 0) / children.length;
        return L.divIcon({className: 'patch-cluster', html: `<span style="--marker-color:${accuracyColor(avg)}">${children.length}</span>`, iconSize: [43, 43], iconAnchor: [21, 21]});
      }
    }).addTo(map);
    map.on('moveend', () => {
      updateMapCount();
      if (state.viewport) { clearTimeout(renderMapTimer); renderMapTimer = setTimeout(() => applyFilters(false), 80); }
    });
    $('#fit-map').addEventListener('click', fitMap);
    $('#viewport-filter').addEventListener('change', (event) => { state.viewport = event.target.checked; applyFilters(); });
    $('#expand-map').addEventListener('click', () => toggleExpanded('#map-card', '#expand-map', 'map'));
    $('#show-glaciers').addEventListener('change', async (event) => {
      if (!event.target.checked) { if (glacierLayer) map.removeLayer(glacierLayer); return; }
      try {
        if (!glacierPromise) {
          toast('Loading glacier outlines…');
          glacierPromise = fetchJSON('assets/glaciers.geojson').then((data) => L.geoJSON(data, {renderer: L.canvas({padding: .35}), interactive: false, smoothFactor: 1.3, style: (feature) => ({color: feature.properties.class === 0 ? '#8ce2ec' : '#edc48b', fillColor: feature.properties.class === 0 ? '#58c8d6' : '#d8a96d', weight: .6, opacity: .7, fillOpacity: .32})}));
        }
        glacierLayer = await glacierPromise;
        if (event.target.checked) glacierLayer.addTo(map);
      } catch (error) { glacierPromise = null; event.target.checked = false; toast('Glacier outlines could not load. The patch map remains available.'); console.error(error); }
    });
  }
  function markerIcon(p, selected = false) {
    return L.divIcon({className: `patch-marker${selected ? ' selected' : ''}`, html: `<span style="--marker-color:${accuracyColor(p.accuracy)}"></span>`, iconSize: [30, 30], iconAnchor: [15, 15]});
  }
  function renderMarkers() {
    if (!map) return;
    clusters.clearLayers(); state.markers.clear();
    for (const p of state.filtered) {
      if (!p.location) continue;
      const marker = L.marker([p.location.latitude, p.location.longitude], {icon: markerIcon(p, p.id === state.selected), title: `Patch ${pad(p.id)} · ${pct(p.accuracy)} accuracy`, alt: `Patch ${pad(p.id)}`, keyboard: true, patchAccuracy: p.accuracy});
      marker.bindTooltip(`Patch ${pad(p.id)} · ${pct(p.accuracy)}`, {direction: 'top', offset: [0, -6]});
      marker.on('click', () => { selectPatch(p.id, false); });
      state.markers.set(p.id, marker); clusters.addLayer(marker);
    }
    updateSelectedMap(); updateMapCount();
  }
  function updateMapCount() {
    if (!map) return;
    const inView = state.filtered.filter((p) => p.location && map.getBounds().contains([p.location.latitude, p.location.longitude])).length;
    $('#map-count').textContent = inView;
  }
  function fitMap(animate = true) {
    const places = state.filtered.filter((p) => p.location).map((p) => [p.location.latitude, p.location.longitude]);
    if (!places.length) { toast('No mapped patches match the current filters.'); return; }
    map.fitBounds(L.latLngBounds(places), {padding: [25, 25], maxZoom: 10, animate: animate !== false && !matchMedia('(prefers-reduced-motion: reduce)').matches});
  }
  function updateSelectedMap() {
    const p = selectedPatch();
    for (const [id, marker] of state.markers) marker.setIcon(markerIcon(state.patches.find((entry) => entry.id === id), id === state.selected));
    const card = $('#map-selection');
    card.hidden = !p?.location;
    if (!p?.location) return;
    card.innerHTML = `<small>SELECTED PATCH</small><strong>Patch ${pad(p.id)}</strong><span class="selection-score" style="color:${accuracyColor(p.accuracy)}">${pct(p.accuracy)}</span><span class="selection-coords">${coordsText(p, true)}</span>`;
  }
  function focusSelectedMap() {
    const p = selectedPatch(), marker = state.markers.get(state.selected);
    if (!p?.location || !marker) return;
    clusters.zoomToShowLayer(marker, () => {
      marker.setIcon(markerIcon(p, true));
      marker.openTooltip();
    });
  }

  function applyFilters(rebuildMarkers = true) {
    const reviewedCount = Object.values(state.reviews).filter((entry) => entry.marked).length;
    $('#review-count').textContent = reviewedCount;
    state.filtered = state.patches.filter((p) => {
      if (p.accuracy > state.max + .0000001) return false;
      if (state.reviewOnly && !isReviewed(p.id)) return false;
      if (state.search && !String(p.id).includes(state.search.replace(/^0+/, '') || '0') && !pad(p.id).includes(state.search)) return false;
      if (state.viewport && p.location && map && !map.getBounds().contains([p.location.latitude, p.location.longitude])) return false;
      if (state.viewport && !p.location) return false;
      return true;
    });
    state.filtered.sort(state.sort === 'id' ? (a, b) => a.id - b.id : state.sort === 'accuracy-desc' ? (a, b) => b.accuracy - a.accuracy || a.id - b.id : (a, b) => a.accuracy - b.accuracy || a.id - b.id);
    $('#accuracy-max').value = state.max * 100;
    $('#accuracy-output').textContent = state.max === 1 ? '100%' : pct(state.max);
    $$('.filter-presets button').forEach((button) => button.classList.toggle('active', button.dataset.preset === 'review' ? state.reviewOnly : !state.reviewOnly && (button.dataset.preset === 'all' ? state.max === 1 : Math.abs(state.max - Number(button.dataset.preset) / 100) < .001)));
    renderChart(); renderList(); updateRank();
    if (rebuildMarkers) renderMarkers(); else updateMapCount();
  }
  function resetFilters() {
    Object.assign(state, {max: 1, reviewOnly: false, search: '', viewport: false});
    $('#patch-search').value = ''; $('#viewport-filter').checked = false;
    applyFilters();
  }
  function renderList() {
    $('#results-count').textContent = `${state.filtered.length} ${state.filtered.length === 1 ? 'patch' : 'patches'}`;
    $('#empty-state').hidden = state.filtered.length > 0;
    $('#patch-list').innerHTML = state.filtered.map((p) => `<button class="patch-row${p.id === state.selected ? ' selected' : ''}" role="option" aria-selected="${p.id === state.selected}" data-patch="${p.id}" style="--row-color:${accuracyColor(p.accuracy)}"><img loading="lazy" src="${p.raw}" alt="" width="35" height="35"><span class="patch-row-info"><strong>Patch ${pad(p.id)} ${isReviewed(p.id) ? svgIcon('bookmark', 'row-bookmark') : ''}</strong><small>${coordsText(p, true)}</small></span><span class="row-accuracy"><i></i>${pct(p.accuracy)}</span></button>`).join('');
  }
  function updateRank() {
    const index = state.filtered.findIndex((p) => p.id === state.selected);
    $('#selected-rank').textContent = index < 0 ? 'Outside current filters' : `${index + 1} / ${state.filtered.length}`;
    $('#previous-patch').disabled = state.filtered.length < 2;
    $('#next-patch').disabled = state.filtered.length < 2;
  }
  function navigatePatch(step) {
    if (!state.filtered.length) return;
    const index = state.filtered.findIndex((p) => p.id === state.selected);
    selectPatch(state.filtered[(Math.max(0, index) + step + state.filtered.length) % state.filtered.length].id, true);
  }

  function renderChart() {
    const rows = [...state.patches].sort((a, b) => a.accuracy - b.accuracy || a.id - b.id);
    const visible = new Set(state.filtered.map((p) => p.id));
    const x = (i) => 42 + i / Math.max(1, rows.length - 1) * 363;
    const y = (a) => 135 - (a - .5) / .5 * 112;
    let html = '<svg viewBox="0 0 420 164" role="group" aria-label="Patch accuracy, ordered from lowest to highest">';
    for (const at of [.5, .75, 1]) html += `<line class="chart-grid" x1="40" x2="408" y1="${y(at)}" y2="${y(at)}"/><text class="chart-axis-label" x="30" y="${y(at) + 3}" text-anchor="end">${Math.round(at * 100)}%</text>`;
    const selectedIndex = rows.findIndex((p) => p.id === state.selected);
    if (selectedIndex >= 0) html += `<line class="chart-selection-line" x1="${x(selectedIndex)}" x2="${x(selectedIndex)}" y1="${y(rows[selectedIndex].accuracy)}" y2="137"/>`;
    rows.forEach((p, i) => {
      html += `<circle cx="${x(i)}" cy="${y(p.accuracy)}" r="2.6" fill="${accuracyColor(p.accuracy)}" class="chart-dot${visible.has(p.id) ? '' : ' dim'}${p.id === state.selected ? ' selected' : ''}" data-patch="${p.id}" role="button" tabindex="${p.id === state.selected ? 0 : -1}" aria-label="Select patch ${pad(p.id)}, accuracy ${pct(p.accuracy)}"/>`;
    });
    html += '<text class="chart-caption" x="42" y="158">LOWER ACCURACY</text><text class="chart-caption" x="405" y="158" text-anchor="end">HIGHER ACCURACY</text></svg>';
    const prior = $('#accuracy-chart svg');
    if (prior) prior.remove();
    $('#accuracy-chart').insertAdjacentHTML('afterbegin', html);
  }
  function initChartEvents() {
    const chart = $('#accuracy-chart'), tooltip = $('#chart-tooltip');
    chart.addEventListener('click', (event) => {
      const target = event.target.closest('[data-patch]');
      if (!target) return;
      const id = Number(target.dataset.patch), p = state.patches.find((row) => row.id === id);
      if (!state.filtered.some((row) => row.id === id)) { resetFilters(); state.max = Math.max(state.max, p.accuracy); }
      selectPatch(id, true);
    });
    chart.addEventListener('pointerover', (event) => {
      const target = event.target.closest('[data-patch]');
      if (!target) return;
      const p = state.patches.find((row) => row.id === Number(target.dataset.patch));
      tooltip.innerHTML = `<strong>Patch ${pad(p.id)}</strong>${pct(p.accuracy)} accuracy`;
      tooltip.hidden = false;
      const bounds = chart.getBoundingClientRect();
      tooltip.style.left = `${clamp(event.clientX - bounds.left - 45, 2, bounds.width - 115)}px`;
      tooltip.style.top = `${Math.max(0, event.clientY - bounds.top - 58)}px`;
    });
    chart.addEventListener('pointerout', () => { tooltip.hidden = true; });
    chart.addEventListener('keydown', (event) => {
      const target = event.target.closest('[data-patch]');
      if (!target) return;
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectPatch(Number(target.dataset.patch), true); }
    });
  }

  async function selectPatch(id, focusMap = false) {
    if (!state.patches.some((p) => p.id === id)) return;
    state.selected = id;
    const p = selectedPatch(), token = ++state.request;
    if (token > 1 && matchMedia('(max-width: 1000px)').matches && !$('#inspection-card').classList.contains('expanded')) $('#inspection-card').scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'nearest'});
    $('#note-patch-id').textContent = `patch ${pad(id)}`;
    updateBookmarkButton(); updateRank(); renderChart(); updateSelectedMap();
    $$('#patch-list .patch-row').forEach((row) => { const yes = Number(row.dataset.patch) === id; row.classList.toggle('selected', yes); row.setAttribute('aria-selected', String(yes)); });
    const selectedRow = $(`#patch-list [data-patch="${id}"]`);
    if (selectedRow) {
      const list = $('#patch-list');
      if (selectedRow.offsetTop < list.scrollTop || selectedRow.offsetTop + selectedRow.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = selectedRow.offsetTop - list.offsetTop - list.clientHeight / 2 + selectedRow.offsetHeight / 2;
    }
    const url = new URL(window.location.href); url.hash = `patch=${id}`; history.replaceState(null, '', url);
    if (focusMap) focusSelectedMap();
    for (const kind of ['raw', 'label', 'prediction']) { const img = $(`#${kind}-image`); img.style.opacity = '.45'; img.src = displayPath(p, kind); img.alt = `${kind === 'raw' ? 'Satellite input' : kind === 'label' ? 'Reference glacier labels' : 'U-Net prediction'} for patch ${pad(id)}`; }
    try {
      await Promise.all(['raw', 'label', 'prediction'].map((kind) => loadImage(displayPath(p, kind))));
      if (token !== state.request) return;
      for (const kind of ['raw', 'label', 'prediction']) $(`#${kind}-image`).style.opacity = '1';
      if (state.mode !== 'side') await renderSingleView(token);
      const index = state.filtered.findIndex((row) => row.id === id);
      for (const next of [state.filtered[index + 1], state.filtered[index - 1]]) if (next) loadImage(next.raw).catch(() => {});
    } catch (error) { if (token === state.request) toast('This image could not load. Try selecting the patch again.'); console.error(error); }
  }
  function updateBookmarkButton() {
    const marked = isReviewed(state.selected), button = $('#bookmark-patch');
    button.classList.toggle('active', marked);
    button.setAttribute('aria-pressed', String(marked));
    button.querySelector('span').textContent = marked ? 'In review' : 'Add to review';
    $('#notes-dot').hidden = !(state.reviews[state.selected]?.note || '').trim();
  }
  function toggleBookmark() {
    const id = state.selected;
    state.reviews[id] = {...state.reviews[id], marked: !isReviewed(id)};
    persistReviews(); updateBookmarkButton(); applyFilters();
    toast(isReviewed(id) ? `Patch ${pad(id)} added to your review queue` : `Patch ${pad(id)} removed from review`);
  }

  function setZoom(value) {
    state.zoom = clamp(value, 1, 8);
    if (state.zoom === 1) state.pan = {x: 0, y: 0};
    const max = (state.zoom - 1) / 2;
    state.pan.x = clamp(state.pan.x, -max, max); state.pan.y = clamp(state.pan.y, -max, max);
    const transform = `translate(${state.pan.x * 100}%,${state.pan.y * 100}%) scale(${state.zoom})`;
    $$('.transform-content').forEach((content) => { content.style.transform = transform; });
    $$('.image-viewport').forEach((viewport) => { viewport.classList.toggle('zoomed', state.zoom > 1); });
    $('#zoom-value').textContent = `${Number(state.zoom.toFixed(1))}×`;
    $('#zoom-in').disabled = state.zoom >= 8; $('#zoom-out').disabled = state.zoom <= 1;
    applySwipe();
  }
  function applySwipe() {
    const value = Number($('#swipe-range').value) / 100;
    const imageCut = clamp((value - .5 - state.pan.x) / state.zoom + .5, 0, 1);
    $('#swipe-clip').style.clipPath = `inset(0 ${(1 - imageCut) * 100}% 0 0)`;
    $('#swipe-divider').style.left = `${value * 100}%`;
  }
  function initImageInteractions() {
    let dragging = null;
    for (const viewport of $$('.image-viewport')) {
      viewport.addEventListener('pointerdown', (event) => {
        if (state.zoom <= 1 || event.target.closest('#swipe-divider') || event.button !== 0) return;
        const bounds = viewport.getBoundingClientRect();
        dragging = {pointer: event.pointerId, x: event.clientX, y: event.clientY, startX: state.pan.x, startY: state.pan.y, width: bounds.width, height: bounds.height, viewport};
        viewport.setPointerCapture(event.pointerId); viewport.classList.add('dragging'); event.preventDefault();
      });
      viewport.addEventListener('pointermove', (event) => {
        if (!dragging || dragging.viewport !== viewport || event.pointerId !== dragging.pointer) return;
        state.pan.x = dragging.startX + (event.clientX - dragging.x) / dragging.width;
        state.pan.y = dragging.startY + (event.clientY - dragging.y) / dragging.height;
        setZoom(state.zoom);
      });
      const finish = () => { if (dragging?.viewport === viewport) { viewport.classList.remove('dragging'); dragging = null; } };
      viewport.addEventListener('pointerup', finish); viewport.addEventListener('pointercancel', finish);
      viewport.addEventListener('dblclick', (event) => { if (event.target.closest('#swipe-divider')) return; setZoom(state.zoom > 1 ? 1 : 2); });
      viewport.addEventListener('wheel', (event) => {
        if (event.ctrlKey || event.metaKey || state.zoom > 1) { event.preventDefault(); setZoom(state.zoom * (event.deltaY > 0 ? .9 : 1.1)); }
      }, {passive: false});
    }
    const divider = $('#swipe-divider');
    divider.style.pointerEvents = 'auto'; divider.style.cursor = 'ew-resize'; divider.style.touchAction = 'none';
    let swipePointer = null;
    divider.addEventListener('pointerdown', (event) => { event.stopPropagation(); swipePointer = event.pointerId; divider.setPointerCapture(event.pointerId); });
    divider.addEventListener('pointermove', (event) => {
      if (event.pointerId !== swipePointer) return;
      const bounds = $('#single-stage').getBoundingClientRect();
      $('#swipe-range').value = clamp((event.clientX - bounds.left) / bounds.width * 100, 0, 100); applySwipe();
    });
    divider.addEventListener('pointerup', () => { swipePointer = null; }); divider.addEventListener('pointercancel', () => { swipePointer = null; });
    $('#zoom-in').addEventListener('click', () => setZoom(state.zoom + .5));
    $('#zoom-out').addEventListener('click', () => setZoom(state.zoom - .5));
    $('#reset-zoom').addEventListener('click', () => { state.pan = {x: 0, y: 0}; setZoom(1); });
  }
  function maskClass(red, green, blue) {
    const background = (red - 233) ** 2 + (green - 233) ** 2 + (blue - 233) ** 2;
    const cleanIce = red ** 2 + green ** 2 + (blue - 255) ** 2;
    const debris = (red - 85) ** 2 + (green - 170) ** 2 + blue ** 2;
    if (cleanIce < background && cleanIce <= debris) return 1;
    return debris < background ? 2 : 0;
  }
  function imagePixels(image) {
    const canvas = document.createElement('canvas'); canvas.width = 606; canvas.height = 606;
    const context = canvas.getContext('2d', {willReadFrequently: true}); context.drawImage(image, 0, 0, 606, 606);
    return context.getImageData(0, 0, 606, 606);
  }
  async function renderSingleView(token = state.request) {
    const p = selectedPatch(); if (!p) return;
    $('#single-loading').hidden = false;
    const names = {raw: 'Satellite image', label: 'Reference label', prediction: 'Model prediction'};
    const isSwipe = state.mode === 'swipe', isOverlay = state.mode === 'overlay';
    $('#swipe-clip').hidden = !isSwipe; $('#swipe-divider').hidden = !isSwipe;
    $('#single-canvas').hidden = isSwipe;
    $('#swipe-controls').hidden = !isSwipe; $('#overlay-controls').hidden = !isOverlay; $('#difference-controls').hidden = state.mode !== 'difference';
    if (isSwipe) {
      const left = $('#swipe-left').value, right = $('#swipe-right').value;
      $('#single-base').src = displayPath(p, right); $('#swipe-image').src = displayPath(p, left);
      $('#single-left-label').textContent = names[left]; $('#single-right-label').textContent = names[right];
      $('#single-right-label').hidden = false;
      await Promise.all([loadImage(displayPath(p, left)), loadImage(displayPath(p, right))]);
      if (token !== state.request || state.mode !== 'swipe') return;
      applySwipe(); $('#single-loading').hidden = true; return;
    }
    $('#single-base').src = p.raw;
    $('#single-left-label').textContent = isOverlay ? `${names[$('#overlay-source').value]} over imagery` : 'Label / prediction differences';
    $('#single-right-label').hidden = true;
    const canvas = $('#single-canvas'), context = canvas.getContext('2d');
    const currentMode = state.mode;
    try {
      const images = await Promise.all([p.raw, p.label, p.prediction].map(loadImage));
      if (token !== state.request || currentMode !== state.mode) return;
      const reference = imagePixels(images[1]), prediction = imagePixels(images[2]);
      const output = context.createImageData(606, 606);
      if (isOverlay) {
        const source = $('#overlay-source').value === 'label' ? reference.data : prediction.data;
        for (let i = 0; i < source.length; i += 4) {
          const classID = maskClass(source[i], source[i + 1], source[i + 2]);
          if (classID) { const color = state.palette === 'modern' ? (classID === 1 ? [88,200,214] : [216,169,109]) : [source[i], source[i + 1], source[i + 2]]; output.data[i] = color[0]; output.data[i + 1] = color[1]; output.data[i + 2] = color[2]; output.data[i + 3] = 255; }
        }
        canvas.style.opacity = Number($('#overlay-opacity').value) / 100;
      } else {
        for (let i = 0; i < reference.data.length; i += 4) {
          const a = reference.data, b = prediction.data;
          if (maskClass(a[i], a[i + 1], a[i + 2]) !== maskClass(b[i], b[i + 1], b[i + 2])) { output.data[i] = 255; output.data[i + 1] = 136; output.data[i + 2] = 97; output.data[i + 3] = 205; }
        }
        canvas.style.opacity = '1';
      }
      context.putImageData(output, 0, 0); $('#single-loading').hidden = true;
    } catch (error) { $('#single-loading').hidden = true; toast('The comparison layer could not load.'); console.error(error); }
  }
  function setMode(mode) {
    state.mode = mode;
    $$('.comparison-tabs button').forEach((b) => { b.classList.toggle('active', b.dataset.mode === mode); b.setAttribute('aria-selected', String(b.dataset.mode === mode)); });
    $('#side-view').hidden = mode !== 'side'; $('#single-view').hidden = mode === 'side';
    if (mode !== 'side') renderSingleView();
    setZoom(state.zoom);
  }
  function toggleExpanded(cardSelector, buttonSelector, kind) {
    const card = $(cardSelector), expanded = !card.classList.contains('expanded');
    $$('.expanded').forEach((item) => item.classList.remove('expanded'));
    card.classList.toggle('expanded', expanded);
    $(buttonSelector).innerHTML = svgIcon(expanded ? 'close' : 'expand');
    $(buttonSelector).setAttribute('aria-label', expanded ? `Close expanded ${kind}` : `Expand ${kind}`);
    if (map) setTimeout(() => map.invalidateSize(), 50);
  }

  async function exportComparison() {
    const p = selectedPatch(); if (!p) return;
    try {
      const images = await Promise.all(['raw', 'label', 'prediction'].map((kind) => loadImage(displayPath(p, kind))));
      const canvas = document.createElement('canvas'); canvas.width = 1920; canvas.height = 770;
      const ctx = canvas.getContext('2d'); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 1920, 770);
      ctx.fillStyle = '#193640'; ctx.font = '600 26px -apple-system, sans-serif'; ctx.fillText(`Glacier Observatory · Patch ${pad(p.id)}`, 30, 38);
      ctx.font = '18px -apple-system, sans-serif'; ctx.fillStyle = '#6b858e'; ctx.fillText(`Reported pixel accuracy ${pct(p.accuracy)}  |  ${coordsText(p)}`, 30, 70);
      const titles = ['Satellite input', 'Reference label', 'U-Net prediction'];
      images.forEach((image, i) => { const x = 30 + i * 630; ctx.fillStyle = '#193640'; ctx.font = '600 18px -apple-system, sans-serif'; ctx.fillText(titles[i], x, 110); ctx.drawImage(image, x, 125, 606, 606); });
      ctx.font = '13px -apple-system, sans-serif'; ctx.fillStyle = '#889aa1'; ctx.fillText(`Zheng, Miao & Sankaran (2022) · Public app display · ${state.palette === 'modern' ? 'Glacier palette: clean ice cyan, debris sand, background slate' : 'Original palette: clean ice blue, debris green, background gray'}`, 30, 756);
      canvas.toBlob((blob) => { if (blob) download(blob, `glacier-patch-${pad(p.id)}.png`); }, 'image/png');
    } catch { toast('The comparison could not be exported. Try again once the images load.'); }
  }
  function exportCSV() {
    const escape = (value) => {
      let text = String(value ?? '');
      if (/^[=+@\-\t\r]/.test(text)) text = "'" + text;
      return '"' + text.replaceAll('"', '""') + '"';
    };
    const rows = [['patch_id', 'reported_pixel_accuracy', 'longitude', 'latitude', 'in_review', 'research_note', 'image_source']];
    state.filtered.forEach((p) => rows.push([p.id, p.accuracy, p.location?.longitude ?? '', p.location?.latitude ?? '', isReviewed(p.id), state.reviews[p.id]?.note || '', 'Public original Shiny app display']));
    download(new Blob(['\ufeff' + rows.map((row) => row.map(escape).join(',')).join('\r\n')], {type: 'text/csv;charset=utf-8'}), `glacier-selection-${state.filtered.length}-patches.csv`);
    toast(`Exported ${state.filtered.length} patches with your review notes`);
  }
  function bindControls() {
    $('#accuracy-max').addEventListener('input', (event) => { state.max = Number(event.target.value) / 100; state.reviewOnly = false; applyFilters(); });
    $$('.filter-presets button').forEach((button) => button.addEventListener('click', () => {
      state.reviewOnly = button.dataset.preset === 'review';
      state.max = state.reviewOnly || button.dataset.preset === 'all' ? 1 : Number(button.dataset.preset) / 100 - .000001;
      state.search = ''; $('#patch-search').value = ''; applyFilters();
    }));
    $('#patch-search').addEventListener('input', (event) => { state.search = event.target.value.trim().replace(/[^0-9]/g, ''); applyFilters(); });
    $('#patch-sort').addEventListener('change', (event) => { state.sort = event.target.value; applyFilters(false); });
    $('#reset-filters').addEventListener('click', resetFilters); $('#clear-empty').addEventListener('click', resetFilters);
    $('#patch-list').addEventListener('click', (event) => { const row = event.target.closest('[data-patch]'); if (row) selectPatch(Number(row.dataset.patch), true); });
    $('#previous-patch').addEventListener('click', () => navigatePatch(-1)); $('#next-patch').addEventListener('click', () => navigatePatch(1));
    $('#bookmark-patch').addEventListener('click', toggleBookmark);
    $('#show-notes').addEventListener('click', () => { $('#notes-panel').hidden = !$('#notes-panel').hidden; if (!$('#notes-panel').hidden) $('#patch-note').focus({preventScroll: true}); });
    $('#patch-note').addEventListener('input', (event) => { state.reviews[state.selected] = {...state.reviews[state.selected], note: event.target.value}; persistReviews(); updateBookmarkButton(); });
    $$('.comparison-tabs button').forEach((button) => button.addEventListener('click', () => setMode(button.dataset.mode)));
    $('#swipe-range').addEventListener('input', applySwipe); $('#swipe-left').addEventListener('change', () => renderSingleView()); $('#swipe-right').addEventListener('change', () => renderSingleView());
    $('#overlay-source').addEventListener('change', () => renderSingleView());
    $('#overlay-opacity').addEventListener('input', (event) => { $('#overlay-opacity-value').textContent = `${event.target.value}%`; $('#single-canvas').style.opacity = Number(event.target.value) / 100; });
    $('#download-patch').addEventListener('click', exportComparison); $('#export-csv').addEventListener('click', exportCSV);
    $('#display-palette').addEventListener('change', (event) => setPalette(event.target.value));
    $('#expand-inspection').addEventListener('click', () => toggleExpanded('#inspection-card', '#expand-inspection', 'comparison'));
    const dialog = $('#source-dialog');
    for (const id of ['#source-button', '#footer-source']) $(id).addEventListener('click', () => dialog.showModal());
    $('#close-source').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (event) => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') { $$('.expanded').forEach((card) => card.classList.remove('expanded')); $('#expand-map').innerHTML = svgIcon('expand'); $('#expand-inspection').innerHTML = svgIcon('expand'); if (map) setTimeout(() => map.invalidateSize(), 50); return; }
      if (event.target.closest('input,textarea,select,[contenteditable=true]') || dialog.open || event.target.closest('.leaflet-container')) return;
      if (event.key === 'ArrowRight') { event.preventDefault(); navigatePatch(1); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); navigatePatch(-1); }
      if (event.key.toLowerCase() === 'r' && !event.ctrlKey && !event.metaKey && !event.altKey) { event.preventDefault(); toggleBookmark(); }
    });
    initChartEvents(); initImageInteractions();
  }
  async function init() {
    document.body.classList.add('app-loading');
    bindControls(); initMap();
    const [patches, locations] = await Promise.all([fetchJSON('assets/patches.json'), fetchJSON('assets/locations.json').catch(() => [])]);
    state.patches = patches;
    const places = Array.isArray(locations) ? locations : locations.locations || [];
    places.forEach((location) => { if (Number.isFinite(location.latitude) && Number.isFinite(location.longitude)) state.locations.set(Number(location.id), location); });
    for (const p of patches) p.location = state.locations.get(p.id) || null;
    const fromHash = Number(new URLSearchParams(location.hash.replace(/^#/, '')).get('patch'));
    if (patches.some((p) => p.id === fromHash)) state.selected = fromHash;
    applyFilters();
    if (state.locations.size) { map.invalidateSize(); fitMap(false); $('#map-loading').hidden = true; }
    else { $('#map-loading').textContent = 'Geographic locations are being restored'; $('#map-loading').hidden = false; }
    $('#geo-provenance').textContent = `${state.locations.size} patch coordinates were read from the original map’s public popups, at the displayed precision. Glacier class footprints come from 30,096 archived source features; empty geometries were omitted and outlines simplified for display. The satellite basemap is contextual and may have a different acquisition date from the model inputs.`;
    await selectPatch(state.selected);
    setZoom(1); document.body.classList.remove('app-loading');
    persistReviews();
  }
  init().catch((error) => { console.error(error); document.body.classList.remove('app-loading'); $('#error-banner').textContent = 'The research collection could not load. Refresh the page to try again.'; $('#error-banner').hidden = false; $('#map-loading').hidden = true; });
})();
