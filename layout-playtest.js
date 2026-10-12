/* Seven navigation prototypes, ?variant=1..7. No rules or AI live in this file. */
(() => {
  const $ = id => document.getElementById(id);
  const mainViewport = $('board-viewport');
  const rail = $('workspace-rail');
  const settings = $('settings-dialog');
  const historyViews = [];
  let historyIndex = -1, historyTimer, restoring = false, currentState;
  let results = [], preview = null, previewSequence = 0, previewEnabled = false;
  let pointerTarget = null, lastAncestorKey = '', overviewSequence = 0;
  const pins = [];
  const frames = new Set();
  const lensFraction = .816 / 3;
  let selectionLens, secondSelectionLens, lensOverviewKey = '';
  let magnifierCount = 1;
  document.body.dataset.magnifiers = '1';
  const middleCanvas = $('middle-lens-board');
  const label = path => path.length ? pathText(path) : 'Whole board';
  const bounds = boardRegionBounds;
  const pathAt = boardPathAt;
  function currentPath() {
    const view = boardCamera.capture();
    return pathAt(view.u, view.v, Math.max(0, (currentState?.levels || 4) - 1));
  }
  function regionView(camera, path) {
    const b = bounds(path);
    const inset = document.body.dataset.layout === '6' ? 12 : 28;
    return {u: b.left + b.size / 2, v: b.top + b.size / 2,
      pixels: Math.max(document.body.dataset.layout === '6' ? 24 : 96, Math.min(camera.width, camera.height) - inset) / b.size};
  }
  function updateHistoryButtons() {
    $('camera-back').disabled = historyIndex <= 0;
    $('camera-forward').disabled = historyIndex >= historyViews.length - 1;
  }
  function remember() {
    if (restoring || !currentState) return;
    const next = boardCamera.capture(), old = historyViews[historyIndex];
    if (old && Math.abs(old.u - next.u) < .001 && Math.abs(old.v - next.v) < .001 && Math.abs(old.pixels - next.pixels) < 1) return;
    historyViews.splice(historyIndex + 1);
    historyViews.push(next);
    if (historyViews.length > 80) historyViews.shift();
    historyIndex = historyViews.length - 1;
    updateHistoryButtons();
  }
  function visit(view) {
    clearTimeout(historyTimer); remember();
    boardCamera.navigate(view); remember(); updateAncestors();
  }
  function restore(delta) {
    clearTimeout(historyTimer); remember();
    const index = historyIndex + delta;
    if (index < 0 || index >= historyViews.length) return;
    restoring = true; historyIndex = index;
    boardCamera.navigate(historyViews[index]); restoring = false;
    updateHistoryButtons(); updateAncestors();
  }
  // A sparse ink layer preserves actual occupied locations below the detail cutoff.
  // It is deliberately separate from native cell controls; no new wins are inferred.
  function paint(canvas,camera=null,permitted=currentState?.forced,fullBoard=false) {
    paintBoardInk(canvas,{state:currentState,results,camera,permitted,fullBoard,
      readOnly:canvas===middleCanvas,frames:document.body.dataset.layout==='7' && (canvas===mainInk || canvas===middleCanvas),
      overviewCamera:boardCamera,threshold:detailThreshold});
  }
  const mainInk = document.createElement('canvas'); mainInk.className = 'lab-ink'; mainInk.setAttribute('aria-hidden', 'true'); mainViewport.append(mainInk);
  function paintMiddle() {
    if (document.body.dataset.layout !== '7' || magnifierCount !== 2 || !selectionLens) return;
    const side = $('middle-lens-stage').clientWidth, center = selectionLens.center;
    if (!side) return;
    paint(middleCanvas, selectionLensCamera(center,side,lensFraction));
  }
  function redraw() {
    paint(mainInk, boardCamera); paint($('overview-map'));
    paintMiddle();
    if (document.body.dataset.layout === '7' && currentState) {
      const key = JSON.stringify([generation, currentState.history.length, results, $('lens-stage').clientWidth]);
      if (key !== lensOverviewKey) { lensOverviewKey = key; paint($('lens-overview'), null, currentState.forced, true); }
    }
    for (const frame of frames) if (frame.element.isConnected) paint(frame.ink, frame.camera, frame === previewFrame && preview ? preview.forced : currentState.forced);
    $('camera-address').textContent = `View: ${label(currentPath())}`;
    if (preview) board.querySelector(`[data-path="${preview.path.join('/')}"]`)?.classList.add('candidate');
  }
  function blockMainOverlay() {
    return document.body.dataset.layout === '7' || Boolean(pointerTarget?.closest('#workspace-rail,.lab-tools,.lab-header,.layout-switcher,dialog'));
  }
  document.addEventListener('pointermove', event => { pointerTarget = event.target; if (blockMainOverlay()) boardCamera.stopInput(); }, true);
  boardCamera.inputBlocked = blockMainOverlay;
  const originalChange = boardCamera.onChange;
  boardCamera.onChange = () => {
    originalChange?.();
    if (document.body.dataset.layout === '7') {
      // Moving the lens does not change overview state or hidden navigation UI.
      paint(mainInk, boardCamera);
      clearTimeout(historyTimer); historyTimer = setTimeout(() => { remember(); updateAncestors(); }, 250);
      return;
    }
    redraw();
    clearTimeout(historyTimer); historyTimer = setTimeout(() => { remember(); updateAncestors(); }, 250);
  };
  // The right camera follows the outline; it is not independently pannable or zoomable.
  function applyLens(center = selectionLens?.center) {
    if (document.body.dataset.layout !== '7' || !magnifierCount || !currentState || !center || !mainViewport.clientWidth) return;
    const view = selectionLensView(center, magnifierCount === 2 ? secondSelectionLens?.center || {x:.5,y:.5} : null, lensFraction);
    boardCamera.maxScaleFloor = 1/view.fraction;
    // Three panels are smaller. Allow finer detail in the new final view so
    // its Level-6 cells remain actual playable controls at desktop sizes.
    boardCamera.detailThreshold = magnifierCount === 2 ? 12 : 24;
    boardCamera.detailCellPixels = Math.max(44, mainViewport.clientWidth / view.fraction / 3 ** currentState.levels);
    boardCamera.navigate({u:view.u, v:view.v, pixels:mainViewport.clientWidth / view.fraction});
  }
  document.addEventListener('wheel', event => {
    if (document.body.dataset.layout === '7' && mainViewport.contains(event.target)) {
      event.preventDefault(); event.stopImmediatePropagation();
    }
  }, {capture:true, passive:false});
  selectionLens = createSelectionLens($('lens-stage'), $('selection-lens'), {
    enabled: () => document.body.dataset.layout === '7' && magnifierCount > 0 && !settings.open,
    onChange: center => { applyLens(center); paintMiddle(); }
  });
  secondSelectionLens = createSelectionLens($('middle-lens-stage'), $('second-selection-lens'), {
    enabled: () => document.body.dataset.layout === '7' && magnifierCount === 2 && !settings.open,
    onChange: () => applyLens()
  });
  $('magnifier-count').querySelectorAll('button').forEach(button => {
    button.onclick = () => {
      selectionLens.stop(); secondSelectionLens.stop();
      magnifierCount = Number(button.dataset.count);
      selectToggleOption($('magnifier-count').querySelectorAll('button'),button);
      document.body.dataset.magnifiers = String(magnifierCount);
      $('lens-mode-instructions').textContent = magnifierCount === 0 ? 'Whole board overview.' : magnifierCount === 1
        ? 'Move the outline on the left. Play on the right.'
        : 'Move the outlines on the left and middle boards. Play on the right.';
      lensOverviewKey = '';
      boardCamera.resize(); applyLens(); redraw();
    };
  });
  class RegionFrame {
    constructor(host, {path = [], readOnly = false, title = true} = {}) {
      this.path = path; this.readOnly = readOnly; this.serial = 0; this.pending = false;
      this.element = document.createElement('div'); this.element.className = 'region-frame';
      if (title) {
        this.heading = document.createElement('div'); this.heading.className = 'region-title';
        this.title = document.createElement('strong'); this.heading.append(this.title); this.element.append(this.heading);
      }
      this.viewport = document.createElement('div'); this.viewport.className = 'board-viewport';
      this.board = document.createElement('div'); this.board.className = 'board'; this.board.tabIndex = -1;
      this.viewport.append(this.board); this.element.append(this.viewport);
      this.toolbar = document.createElement('div'); this.toolbar.className = 'region-toolbar';
      const zoomIn = document.createElement('button'), zoomOut = document.createElement('button'), show = document.createElement('button');
      zoomIn.textContent = '+'; zoomIn.setAttribute('aria-label', 'Zoom in second view');
      zoomOut.textContent = '−'; zoomOut.setAttribute('aria-label', 'Zoom out second view');
      show.textContent = 'Show in main';
      this.note = document.createElement('span'); this.toolbar.append(zoomOut, zoomIn, show, this.note); this.element.append(this.toolbar);
      host.append(this.element);
      this.reset = document.createElement('button');
      this.camera = new BoardCamera(this.viewport, this.board, this.reset, $('scroll-zoom'), $('drag-move'), $('edge-move'));
      this.camera.baseSize = Math.max(1, this.camera.baseSize);
      this.camera.setLevels(state?.levels || 4);
      this.camera.preservePixelsOnResize = true;
      this.camera.inputBlocked = () => !this.element.isConnected || !this.element.getClientRects().length || !this.viewport.contains(pointerTarget);
      this.camera.onChange = () => {
        const view = this.camera.capture();
        if (this.title) this.title.textContent = document.body.dataset.layout === '6' ? `Board: ${label(this.path)}` : `View: ${label(pathAt(view.u, view.v, (currentState?.levels || 4) - 1))}`;
        paint(this.ink, this.camera, this === previewFrame && preview ? preview.forced : currentState.forced); this.schedule();
      };
      this.ink = document.createElement('canvas'); this.ink.className = 'lab-ink'; this.ink.setAttribute('aria-hidden', 'true'); this.viewport.append(this.ink);
      this.lines = new WinningLines(this.board);
      zoomIn.onclick = () => { const view = this.camera.capture(); view.pixels *= 1.5; this.camera.navigate(view); };
      zoomOut.onclick = () => { const view = this.camera.capture(); view.pixels /= 1.5; this.camera.navigate(view); };
      show.onclick = () => visit(this.camera.capture());
      this.board.addEventListener('click', event => candidateClick(event, this.readOnly || document.body.dataset.layout === '6'), true);
      // The combined layout fits named regions when panels resize instead of cropping them.
      this.resize = new ResizeObserver(() => {
        this.camera.detailCellPixels = document.body.dataset.layout === '6' ? Math.max(44, Math.min(this.viewport.clientWidth, this.viewport.clientHeight) / 3) : 44;
        this.camera.resize();
        if (document.body.dataset.layout === '6') this.camera.navigate(regionView(this.camera, this.path));
        this.schedule();
      }); this.resize.observe(this.viewport);
      frames.add(this); this.focus(path);
    }
    focus(path) {
      this.path = path;
      if (this.title) this.title.textContent = `Board: ${label(path)}`;
      this.camera.resize(); this.camera.navigate(regionView(this.camera, path)); this.schedule();
    }
    schedule() { clearTimeout(this.timer); this.timer = setTimeout(() => this.refresh(), 110); }
    async refresh() {
      if (!ready || busy || !this.element.isConnected || !this.element.getClientRects().length || !this.viewport.clientWidth) return;
      const view = this.camera.view(), key = JSON.stringify([view, generation, state.history.length]);
      if (this.pending || key === this.key) return;
      this.pending = true; const serial = ++this.serial;
      try {
        const response = await requestPresentation({action: 'view', view});
        if (serial !== this.serial || !this.element.isConnected) return;
        this.key = key; this.camera.commitDetail(); this.lines.setLevels(state.levels);
        renderNode(response.tree, true, null, this.board, this.lines);
        if (this.readOnly || document.body.dataset.layout === '6') this.board.querySelectorAll('button').forEach(button => button.disabled = true);
        this.lines.refresh(); this.note.textContent = `${this.readOnly ? 'Read-only · ' : ''}Move ${state.history.length}`;
        paint(this.ink, this.camera, this === previewFrame && preview ? preview.forced : currentState.forced);
      } catch (_) { this.key = ''; }
      finally { this.pending = false; if (JSON.stringify([this.camera.view(), generation, state.history.length]) !== key) this.schedule(); }
    }
    dispose() {
      clearTimeout(this.timer); this.serial++; this.camera.dispose();
      this.resize.disconnect(); this.lines.dispose(); frames.delete(this); this.element.remove();
    }
  }
  let comparison, previewFrame;
  function candidateClick(event, readOnly = false) {
    const cell = event.target.closest('button[data-path]');
    if (!cell || cell.disabled || readOnly || !previewEnabled) return;
    event.preventDefault(); event.stopImmediatePropagation();
    selectCandidate(cell.dataset.path.split('/').map(Number));
  }
  board.addEventListener('click', event => candidateClick(event), true);
  // Returning to a candidate can replace the visible cells asynchronously.
  // Restore its selection outline after the shared renderer commits that view.
  new MutationObserver(() => {
    if (preview) board.querySelector(`[data-path="${preview.path.join('/')}"]`)?.classList.add('candidate');
  }).observe(board, {childList: true, subtree: true});
  const actionLabel = document.createElement('span'); actionLabel.textContent = 'Square action';
  const actionToggle = document.createElement('div'); actionToggle.className = 'player-options'; actionToggle.style.width = '140px'; actionToggle.setAttribute('role', 'group'); actionToggle.setAttribute('aria-label', 'Square action');
  for (const [name, enabled] of [['Play', false], ['Preview', true]]) {
    const button = document.createElement('button'); button.textContent = name; button.type = 'button'; button.setAttribute('aria-pressed', String(!enabled));
    button.onclick = () => { previewEnabled = enabled; selectToggleOption(actionToggle.querySelectorAll('button'), button); if (!enabled) closePreview(); };
    actionToggle.append(button);
  }
  document.querySelector('.lab-tools').append(actionLabel, actionToggle);
  function setPreviewMode(enabled) {
    previewEnabled = enabled;
    selectToggleOption(actionToggle.querySelectorAll('button'), actionToggle.querySelectorAll('button')[enabled ? 1 : 0]);
    if (!enabled) closePreview();
  }
  function closePreview() {
    previewSequence++; preview = null; $('preview-panel').hidden = document.body.dataset.layout !== '6';
    $('preview-summary').textContent = 'Select an available square to inspect its destination before playing.';
    $('preview-host').hidden = true;
    $('preview-play').disabled = true; $('preview-go').disabled = true; $('preview-pin').disabled = true;
    document.querySelectorAll('.candidate').forEach(cell => cell.classList.remove('candidate'));
  }
  async function selectCandidate(path) {
    const serial = ++previewSequence, revision = interactionRevision;
    $('preview-panel').hidden = false; $('preview-summary').textContent = 'Checking destination…'; $('preview-play').disabled = true; $('preview-go').disabled = true;
    document.querySelectorAll('.candidate').forEach(cell => cell.classList.remove('candidate'));
    board.querySelector(`[data-path="${path.join('/')}"]`)?.classList.add('candidate');
    try {
      const response = await requestPresentation({action: 'preview', path});
      if (serial !== previewSequence || revision !== interactionRevision) return;
      preview = {path, ...response, revision};
      const closures = response.closures.map(item => `${label(item.path)} (${resultSymbol(item.result)})`);
      $('preview-summary').textContent = `Move ${label(path)}. ${response.outcome !== null ? `Game ends: ${resultSymbol(response.outcome) || 'Draw'}.` : `Next player: ${label(response.forced)}${!response.forced.length ? ' freedom' : ''}.`} ${closures.length ? `Closes: ${closures.join('; ')}.` : 'No board closes.'} Destination view shows the current position before this move.`;
      if (document.body.dataset.layout === '6') $('preview-summary').textContent = `Move ${label(path)} → ${response.outcome !== null ? `Game ends: ${resultSymbol(response.outcome) || 'Draw'}` : `Next player: ${label(response.forced)}`}. ${closures.length ? `Closes: ${closures.join('; ')}.` : 'No board closes.'} Current destination shown below.`;
      $('preview-play').disabled = false; $('preview-go').disabled = response.outcome !== null;
      $('preview-pin').disabled = response.outcome !== null || pins.length >= 3;
      $('preview-host').hidden = false;
      previewFrame ||= new RegionFrame($('preview-host'), {readOnly: true});
      previewFrame.focus(response.forced);
    } catch (error) { if (serial === previewSequence) $('preview-summary').textContent = error.message; }
    redraw();
  }
  $('preview-close').onclick = closePreview;
  $('preview-go').onclick = () => { if (preview) visit(regionView(boardCamera, preview.forced)); };
  $('preview-pin').onclick = () => { if (preview) addPin(preview.forced); };
  $('preview-play').onclick = () => {
    if (!preview || preview.revision !== interactionRevision || busy || state.computer_turn || state.over) return;
    const path = preview.path; closePreview(); send({action: 'play', square: state.levels === 1 ? path[0] : path});
  };
  async function updateAncestors() {
    if (document.body.dataset.layout !== '3' || !ready || busy || !currentState) return;
    const path = currentPath(), key = JSON.stringify([path, state.history.length, generation]);
    if (key === lastAncestorKey) return;
    lastAncestorKey = key;
    const host = $('ancestor-views'); host.replaceChildren();
    for (let depth = 0; depth < state.levels - 1; depth++) {
      const prefix = path.slice(0, depth), branch = path[depth];
      const box = document.createElement('div'); box.className = 'ancestor-view';
      const title = document.createElement('div'); title.className = 'region-title'; title.textContent = label(prefix);
      const grid = document.createElement('div'); grid.className = 'ancestor-board'; box.append(title, grid); host.append(box);
      try {
        const response = await requestPresentation({action: 'inspect', path: prefix});
        if (lastAncestorKey !== key || !box.isConnected) return;
        for (const [index, node] of response.picker.children.entries()) {
          const button = document.createElement('button'); button.type = 'button';
          button.textContent = node.mark || resultSymbol(node.result) || index + 1;
          button.classList.toggle('allowed', node.allowed); button.classList.toggle('branch', index === branch);
          button.setAttribute('aria-label', `Inspect board ${label(node.path)}${node.result !== null ? `, ${resultSymbol(node.result)}` : ''}`);
          button.onclick = () => visit(regionView(boardCamera, node.path)); grid.append(button);
        }
      } catch (_) { lastAncestorKey = ''; }
    }
  }
  function addPin(path, view = null) {
    if (!currentState || pins.length >= 3) return;
    const box = document.createElement('div'); box.className = 'pin-view';
    $('pinned-views').append(box);
    const frame = new RegionFrame(box, {path});
    if (view) frame.camera.navigate(view);
    const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = 'Remove';
    remove.onclick = () => {
      frame.dispose(); box.remove(); pins.splice(pins.indexOf(frame), 1);
      $('pinned-views').dataset.count = pins.length; $('pin-current').disabled = false;
      if (preview) $('preview-pin').disabled = preview.outcome !== null;
    };
    frame.heading.append(remove); pins.push(frame); $('pin-current').disabled = pins.length >= 3;
    $('pinned-views').dataset.count = pins.length;
    if (preview) $('preview-pin').disabled = pins.length >= 3 || preview.outcome !== null;
  }
  function parseAddress() {
    const value = $('focus-path').value.trim();
    const path = value ? value.split(/[\s/,]+/).map(n => Number(n) - 1) : currentPath();
    if (path.length > currentState.levels - 1 || path.some(n => !Number.isInteger(n) || n < 0 || n > 8)) {
      $('focus-path').setCustomValidity(`Enter up to ${currentState.levels - 1} board positions from 1 to 9.`); $('focus-path').reportValidity(); return null;
    }
    $('focus-path').setCustomValidity(''); return path;
  }
  $('focus-path').oninput = () => $('focus-path').setCustomValidity('');
  $('focus-path').onkeydown = event => { if (event.key === 'Enter') $('open-region').click(); };
  $('open-region').onclick = () => { if (currentState) { const path = parseAddress(); if (path) visit(regionView(boardCamera, path)); } };
  $('pin-region').onclick = () => { if (currentState) { const path = parseAddress(); if (path) { if (document.body.dataset.layout !== '6') switchLayout('4'); addPin(path); } } };
  $('pin-current').onclick = () => addPin(currentPath(), document.body.dataset.layout === '6' ? null : boardCamera.capture());
  $('camera-back').onclick = () => restore(-1); $('camera-forward').onclick = () => restore(1);
  $('show-legal').onclick = () => {
    if (!currentState) return;
    if (document.body.dataset.layout === '7') {
      const b = bounds(currentState.forced);
      const center = {x:b.left+b.size/2,y:b.top+b.size/2};
      selectionLens.moveTo(center);
      if (magnifierCount === 2) {
        const first = selectionLens.center;
        secondSelectionLens.moveTo({x:.5+(center.x-first.x)/lensFraction,y:.5+(center.y-first.y)/lensFraction});
      }
    } else visit(regionView(boardCamera, currentState.forced));
  };
  $('show-detail').onclick = () => { if (currentState) visit(regionView(boardCamera, currentState.forced.length === currentState.levels - 1 ? currentState.forced : currentPath())); };
  $('fit-board').onclick = () => { remember(); boardCamera.reset(); remember(); };
  $('copy-view').onclick = () => { comparison?.camera.navigate(boardCamera.capture()); };
  $('swap-views').onclick = () => {
    if (!comparison) return; const main = boardCamera.capture(), other = comparison.camera.capture(); visit(other); comparison.camera.navigate(main);
  };
  $('overview-map').onclick = event => {
    if (!currentState) return;
    const rect = event.currentTarget.getBoundingClientRect(), size = Math.min(rect.width, rect.height) - 8;
    const u = (event.clientX - rect.left - (rect.width - size) / 2) / size;
    const v = (event.clientY - rect.top - (rect.height - size) / 2) / size;
    visit({...boardCamera.capture(), u: Math.max(0, Math.min(1, u)), v: Math.max(0, Math.min(1, v))});
  };
  $('overview-map').onkeydown = event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); $('show-legal').click(); } };
  // Move existing controls into a dismissible drawer; preserve their listeners.
  $('lab-status').append(document.querySelector('.status-wrap'), document.querySelector('.game-top'));
  $('settings-content').append(document.querySelector('.sidebar'), document.querySelector('.navigation-controls'));
  $('settings-open').onclick = () => { boardCamera.stopInput(); settings.showModal(); };
  $('settings-close').onclick = () => settings.close();
  function switchLayout(value) {
    const variant = ['1','2','3','4','5','6','7'].includes(value) ? value : '1';
    const captured = boardCamera.capture(); clearTimeout(historyTimer);
    document.body.dataset.layout = variant; $('layout-choice').value = variant;
    selectionLens.stop();
    secondSelectionLens.stop();
    boardCamera.detailThreshold = variant === '7' ? 24 : null;
    if(variant !== '7') boardCamera.maxScaleFloor = 0;
    boardCamera.detailCellPixels = variant === '6' ? Math.max(44, Math.min(mainViewport.clientWidth, mainViewport.clientHeight) / 3) : 44;
    const url = new URL(location.href); url.searchParams.set('variant', variant); history.replaceState(null, '', url);
    setPreviewMode(variant === '3' || variant === '5' || variant === '6');
    $('preview-pin').hidden = variant !== '6';
    if (variant === '6') {
      $('preview-panel').hidden = false;
      if (!preview) closePreview();
    } else if (!preview) $('preview-panel').hidden = true;
    if (variant === '2' && !comparison) comparison = new RegionFrame($('comparison-host'), {path: currentState?.forced.length ? currentState.forced : [4,4,4]});
    if (variant === '4' && !pins.length && currentState) addPin(currentPath(), captured);
    // Layout changes preserve the examined board location and absolute scale.
    boardCamera.resize(); restoring = true; boardCamera.navigate(captured); restoring = false;
    if (variant === '7') applyLens();
    for (const frame of frames) if (frame.element.getClientRects().length) {
      frame.camera.detailCellPixels = variant === '6' ? Math.max(44, Math.min(frame.viewport.clientWidth, frame.viewport.clientHeight) / 3) : 44;
      frame.camera.resize();
      if (variant === '6') frame.focus(frame.path);
      frame.key = ''; frame.schedule();
    }
    lastAncestorKey = ''; updateAncestors(); redraw();
  }
  $('layout-choice').onchange = event => switchLayout(event.target.value);
  const cycle = delta => switchLayout(String((Number(document.body.dataset.layout) - 1 + delta + 7) % 7 + 1));
  $('layout-previous').onclick = () => cycle(-1); $('layout-next').onclick = () => cycle(1);
  document.querySelector('.layout-switcher').onkeydown = event => {
    if (event.target.tagName === 'SELECT') return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); cycle(event.key === 'ArrowLeft' ? -1 : 1); }
  };
  let lastGeneration = -1, lastPly = -1;
  presentationObserver = async next => {
    currentState = next;
    if (lastGeneration !== generation) {
      lastGeneration = generation; historyViews.length = 0; historyIndex = -1;
      results = []; lastAncestorKey = ''; closePreview();
      secondSelectionLens.moveTo({x:.5,y:.5});
      selectionLens.moveTo({x:.5,y:.5});
      for (const frame of frames) { frame.key = ''; frame.camera.setLevels(next.levels); frame.focus(frame.path.slice(0, next.levels - 1)); }
    }
    if (lastPly !== next.history.length) { closePreview(); lastPly = next.history.length; }
    remember(); redraw(); updateAncestors();
    if (document.body.dataset.layout === '4' && !pins.length) addPin(currentPath());
    const serial = ++overviewSequence;
    try { const response = await requestPresentation({action: 'overview'}); if (serial === overviewSequence) { results = response.results; redraw(); } } catch (_) {}
    $('overview-revision').textContent = `Move ${next.history.length}`;
    for (const frame of frames) { frame.key = ''; frame.schedule(); }
  };
  new ResizeObserver(() => {
    if (document.body.dataset.layout === '6') boardCamera.detailCellPixels = Math.max(44, Math.min(mainViewport.clientWidth, mainViewport.clientHeight) / 3);
    redraw();
    if (document.body.dataset.layout === '7') applyLens();
  }).observe(mainViewport);
  new ResizeObserver(() => { lensOverviewKey = ''; redraw(); }).observe($('lens-stage'));
  new ResizeObserver(redraw).observe($('overview-map'));
  switchLayout(new URL(location.href).searchParams.get('variant') || '1');
})();
