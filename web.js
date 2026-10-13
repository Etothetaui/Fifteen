// Rendering and transport only; Python supplies legal moves and board results.
const board = document.querySelector('#board');
const winningLines = new WinningLines(board);
const modes = document.querySelector('#modes');
const levels = document.querySelector('#levels');
const statusText = document.querySelector('#status');
const substatus = document.querySelector('#substatus');
const newGame = document.querySelector('#new-game');
const retry = document.querySelector('#retry');
const picker = document.querySelector('#position-picker');
const pickerGrid = document.querySelector('#picker-grid');
const pickerBack = document.querySelector('#picker-back');
let pickerPath = [], restorePickerFocus = false;
const resetDialog = document.querySelector('#reset-dialog');
const resetCancel = document.querySelector('#reset-cancel');
let pendingReset = null;
let selectedLevel = Number(document.documentElement?.dataset?.defaultLevels) || undefined;
// Optional playtest consumers share this worker and renderer, never another match.
const presentationRequests = new Map();
let presentationObserver = null;
function requestPresentation(payload) {
  if (!ready || busy) return Promise.reject(new Error('The game is updating.'));
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    presentationRequests.set(id, {resolve, reject, generation, revision: interactionRevision});
    worker.postMessage({id, generation, channel: 'presentation', payload});
  });
}
function cancelPresentationRequests() {
  for (const request of presentationRequests.values()) request.reject(new Error('The position changed.'));
  presentationRequests.clear();
}
const playerOptions = [...modes.querySelectorAll('.player-options')];
let worker, state, ready = false, busy = true, generation = 0, sequence = 0, timer;
let boardFocusPath = '', restoreBoardFocus = false;
let showMoveSelector = false;
let viewTimer = null, viewRequest = 0, inspectRequest = 0, viewKey = '';
let interactionRevision = 0;
let loadedView = null, requestedView = null, actionView = null;
// The subdivision threshold comes from Python, via the worker.
let detailThreshold;
function detailDepth(view) { return Math.floor(Math.log(view.pixels / (view.detailThreshold || detailThreshold)) / Math.log(3)); }
function hasLoadedDetail(view) {
  return detailThreshold && loadedView && detailDepth(view) === detailDepth(loadedView) &&
    view.left >= loadedView.left && view.top >= loadedView.top &&
    view.right <= loadedView.right && view.bottom <= loadedView.bottom;
}
board.tabIndex = -1;
// Coordinates describe visual placement only. Python remains the authority on legality.
function visualPosition(path) {
  return path.reduce(([row, column], square) => [row * 3 + Math.floor(square / 3), column * 3 + square % 3], [0, 0]);
}
function availableCells() { return [...board.querySelectorAll('button')].filter(cell => !cell.disabled); }
function setBoardEntry(cell,preserveSelection=false) {
  board.querySelectorAll('button').forEach(button => button.tabIndex = button === cell ? 0 : -1);
  if (cell && !preserveSelection) boardFocusPath = cell.dataset.path;
}
function keyboardTarget(cells, current, key) {
  const ordered = [...cells].sort((a, b) => Number(a.dataset.row) - Number(b.dataset.row) || Number(a.dataset.column) - Number(b.dataset.column));
  if (key === 'Home') return ordered[0];
  if (key === 'End') return ordered.at(-1);
  const direction = {ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0]}[key];
  if (!direction) return;
  const [dr, dc] = direction;
  const distance = cell => {
    const row = Number(cell.dataset.row) - Number(current.dataset.row);
    const column = Number(cell.dataset.column) - Number(current.dataset.column);
    return [row * dr + column * dc, Math.abs(row * dc + column * dr)];
  };
  return cells.filter(cell => distance(cell)[0] > 0).sort((a, b) => {
    const [forwardA, acrossA] = distance(a), [forwardB, acrossB] = distance(b);
    return acrossA - acrossB || forwardA - forwardB;
  })[0];
}
board.addEventListener('focusin', event => {
  restoreBoardFocus = true;
  if (event.target.matches('button')) setBoardEntry(event.target);
});
document.addEventListener('focusin', event => {
  if (!board.contains(event.target)) restoreBoardFocus = false;
  if (!picker.contains(event.target)) restorePickerFocus = false;
});
document.addEventListener('pointerdown', event => {
  if (!board.contains(event.target)) restoreBoardFocus = false;
  if (!picker.contains(event.target)) restorePickerFocus = false;
});
board.addEventListener('keydown', event => {
  if (!event.target.matches('button') || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const target = keyboardTarget(availableCells(), event.target, event.key);
  if (target) { setBoardEntry(target); target.focus({preventScroll: true}); }
});
// Translate the two presentation controls into the existing Python mode names.
function selectedMode() {
  const [x, o] = Object.values(selectedPlayers()).map(value => value !== 'human');
  return x ? (o ? 'computer-computer' : 'human-o') : (o ? 'human-x' : 'human-human');
}
function selectedPlayers() {
  return Object.fromEntries(playerOptions.map((group, index) => [index ? 'O' : 'X', group.querySelector('[aria-pressed="true"]').dataset.controller]));
}
function renderLevelSelection() {
  levels.querySelectorAll('button').forEach(button => {
    button.setAttribute('aria-pressed', String(Number(button.value) === selectedLevel));
  });
}
function send(payload) {
  cancelPresentationRequests();
  // Presentation replies from before a move cannot restore stale permissions.
  viewRequest = inspectRequest = 0;
  viewKey = '';
  interactionRevision++;
  loadedView = null;
  actionView = null;
  if (state?.levels > 3 && typeof boardCamera !== 'undefined' && payload.action !== 'new') payload.view = boardCamera.view();
  if (payload.view) actionView = payload.view;
  busy = true;
  if (board.contains(document.activeElement)) {
    restoreBoardFocus = true;
    board.focus({preventScroll: true});
  }
  if (picker.contains(document.activeElement)) {
    restorePickerFocus = true;
    pickerGrid.focus({preventScroll: true});
  }
  board.querySelectorAll('button').forEach(cell => cell.disabled = true);
  picker.querySelectorAll('button').forEach(button => button.disabled = true);
  worker.postMessage({id: ++sequence, generation, payload});
}
function restart() {
  if (!ready) return;
  const count = selectedLevel;
  if (!Number.isSafeInteger(count)) return;
  clearTimeout(timer); generation++;
  if(showMoveSelector) boardFocusPath=Array(count).fill(4).join('/');
  pickerPath = [];
  if (typeof boardCamera !== 'undefined') boardCamera.setLevels(count);
  // Old replies cannot redraw a board or schedule moves after a restart.
  statusText.textContent = 'Starting a new game…';
  const payload = {action: 'new', mode: selectedMode(), levels: count, players: selectedPlayers()};
  if (count > 3 && typeof boardCamera !== 'undefined') payload.view = boardCamera.view();
  send(payload);
}

function queueView() {
  if (!state || state.levels <= 3 || typeof boardCamera === 'undefined' || viewTimer !== null) return;
  // Throttle continuously moving cameras, allowing one read-only request in flight.
  viewTimer = setTimeout(() => {
    viewTimer = null;
    if (!ready || busy || pendingReset || viewRequest || state.levels <= 3) return;
    // Reuse the loaded overscan region until it is exhausted or detail changes.
    if (hasLoadedDetail(boardCamera.view(0))) return;
    const view = boardCamera.view(), key = JSON.stringify(view);
    if (key === viewKey) return;
    viewKey = key;
    viewRequest = ++sequence;
    requestedView = view;
    worker.postMessage({id: viewRequest, generation, channel: 'view', payload: {action: 'view', view}});
  }, 100);
}

function inspectPicker(path) {
  if (!ready || busy || inspectRequest) return;
  pickerGrid.querySelectorAll('button').forEach(button => button.disabled = true);
  inspectRequest = ++sequence;
  worker.postMessage({id: inspectRequest, generation, channel: 'inspect', payload: {action: 'inspect', path}});
}
function requestRestart(applySelection = () => {}) {
  if (!ready || pendingReset) return;
  // Keep the requested selection separate until the player confirms. A worker
  // already searching may finish, but no further AI turns start behind the dialog.
  if (state && !state.over && state.history.length) {
    pendingReset = {applySelection, trigger: document.activeElement};
    clearTimeout(timer);
    resetDialog.showModal();
    resetCancel.focus();
    return;
  }
  applySelection();
  restart();
}
function finishReset(accepted) {
  if (!pendingReset) return;
  const request = pendingReset;
  pendingReset = null;
  resetDialog.close();
  request.trigger?.focus({preventScroll: true});
  if (accepted && ready) { request.applySelection(); restart(); }
  else if (ready && state) scheduleComputerTurn();
}
resetCancel.addEventListener('click', () => finishReset(false));
document.querySelector('#reset-confirm').addEventListener('click', () => finishReset(true));
resetDialog.addEventListener('cancel', event => { event.preventDefault(); finishReset(false); });
function changeLevel(value) {
  if (selectedLevel === value) return;
  requestRestart(() => { selectedLevel = value; renderLevelSelection(); });
}
function changePlayer(group, button) {
  if (button.getAttribute('aria-pressed') === 'true') return;
  requestRestart(() => selectToggleOption(group.querySelectorAll('button'), button));
}
function pathText(path) { return path.map(i => i + 1).join(' / '); }
function resultSymbol(result) { return result === 1 ? 'X' : result === -1 ? 'O' : result === 0 ? '◆' : ''; }
function canPlay(node) { return !busy && !state.computer_turn && !state.over && node.allowed; }
function playNode(node) {
  if (!canPlay(node)) return;
  send({action:'play', square: state.levels === 1 ? node.path[0] : node.path});
}
function renderPicker(focus = false) {
  if (!state) return;
  let node = state.picker || state.tree;
  if (!state.picker) for (const index of pickerPath) node = node.children[index];
  const keepFocus = focus || (restorePickerFocus && picker.open && (picker.contains(document.activeElement) || document.activeElement === document.body));
  const selectingBoard = node.children[0].kind === 'board';
  document.querySelector('#picker-label').textContent = `${selectingBoard ? 'Choose a board' : 'Play a square'}${pickerPath.length ? ` in board ${pathText(pickerPath)}` : ''}.`;
  pickerGrid.replaceChildren(...node.children.map(child => {
    const button = document.createElement('button'); button.type = 'button';
    button.textContent = child.mark || resultSymbol(child.result) || child.path.at(-1) + 1;
    button.setAttribute('aria-label', `${child.kind === 'board' ? 'Board' : 'Position'} ${pathText(child.path)}${child.mark ? `, ${child.mark}` : ''}${child.result === 0 ? ', drawn' : ''}`);
    button.disabled = !canPlay(child);
    button.addEventListener('click', () => {
      if (!canPlay(child)) return;
      if (child.kind === 'cell') playNode(child);
      else if (state.picker) inspectPicker(child.path);
      else { pickerPath = child.path; renderPicker(true); }
    });
    return button;
  }));
  pickerBack.hidden = !pickerPath.length;
  pickerBack.disabled = busy || state.computer_turn || state.over;
  if (keepFocus) {
    const entry = [...pickerGrid.querySelectorAll('button')].find(button => !button.disabled);
    (entry || pickerGrid).focus({preventScroll: true});
    restorePickerFocus = true;
  }
}
pickerBack.addEventListener('click', () => {
  const path = pickerPath.slice(0, -1);
  if (state?.picker) inspectPicker(path);
  else { pickerPath = path; renderPicker(true); }
});
picker.addEventListener('toggle', () => { if (!picker.open) restorePickerFocus = false; });
function renderNode(node, root = false, previous = null, targetBoard = board, lines = winningLines) {
  const element = root ? targetBoard : previous?._viewKind === node.kind ? previous
    : document.createElement(node.kind === 'board' ? 'div' : 'button');
  // Viewport replies often contain identical detail. Keep those DOM subtrees,
  // including focus and listeners, rather than rebuilding them during motion.
  const key = JSON.stringify([node, interactionRevision, busy, state.computer_turn, state.over, document.body.dataset.layout]);
  if (element._viewKey === key) return element;
  element._viewKey = key;
  element._viewKind = node.kind;
  element._viewNode = node;
  if (node.kind === 'cell') {
    element.className = `cell ${node.mark.toLowerCase()}${node.winning ? ' winning' : ''}${node.last ? ' last' : ''}${showMoveSelector && !state.computer_turn && node.path.join('/')===boardFocusPath ? ' move-selected' : ''}`;
    // The lens hides numbers; avoid thousands of invisible spans in deep games.
    // Keep the actual buttons and Python-derived permissions unchanged.
    const lensOnly = document.body.dataset.layout === '7';
    if (!lensOnly || element._number) {
      const number = element._number || document.createElement('span'); number.className = 'number';
      number.textContent = node.path.at(-1) + 1; number.setAttribute('aria-hidden', 'true');
      if (!element._number) element.append(number);
      element._number = number;
    }
    if (node.mark || !lensOnly || element._mark) {
      const mark = element._mark || document.createElement('span'); mark.className = 'mark';
      mark.textContent = node.mark; mark.setAttribute('aria-hidden', 'true');
      if (!element._mark) element.append(mark);
      element._mark = mark;
    }
    if (!element._cellBound) {
      element.addEventListener('click', () => playNode(element._viewNode));
      element._cellBound = true;
    }
    element.disabled = !canPlay(node);
    element.tabIndex = -1;
    element.dataset.path = node.path.join('/');
    [element.dataset.row, element.dataset.column] = visualPosition(node.path);
    element.setAttribute('aria-label', `Position ${pathText(node.path)}, ${node.mark || 'empty'}${node.winning ? ', winning line' : ''}${node.last ? ', last move' : ''}`);
  } else {
    element.className = root ? 'board' : `subboard${node.allowed ? ' available' : ''}${node.winning ? ' winning' : ''}`;
    element.classList.toggle('nested', node.levels > 1);
    element.classList.toggle('collapsed', Boolean(node.collapsed));
    // Expose remaining hierarchy depth for presentation at any game level.
    element.dataset.levels = node.levels;
    element.setAttribute('role', 'group');
    element.setAttribute('aria-label', node.path.length ? `Board ${pathText(node.path)}` : 'Tic-tac-toe board');
    const old = element._viewChildren || [];
    const children = node.children.map((child, index) => renderNode(child, false, old[index], targetBoard, lines));
    const decoration = JSON.stringify([node.result, node.children.map(child => child.winning)]);
    if (children.length !== old.length || children.some((child, index) => child !== old[index]) ||
        decoration !== element._decoration) {
      element.replaceChildren(...children);
      lines.add(element, node);
      if (node.result !== null && !root) {
        const result = document.createElement('span'); result.className = 'board-result';
        result.textContent = resultSymbol(node.result);
        result.setAttribute('aria-label', node.result ? `${result.textContent} wins board ${pathText(node.path)}` : `Board ${pathText(node.path)} drawn`);
        element.append(result);
      }
    }
    element._viewChildren = children; element._decoration = decoration;
  }
  return element;
}
function renderBoard() {
  // All exposed levels use the same recursive renderer and Python permissions.
  winningLines.setLevels(state.levels);
  const keepFocus = restoreBoardFocus && (board.contains(document.activeElement) || document.activeElement === document.body);
  renderNode(state.tree, true);
  winningLines.refresh();
  const cells = availableCells();
  const entry = cells.find(cell => cell.dataset.path === boardFocusPath) || keyboardTarget(cells, null, 'Home');
  setBoardEntry(entry,showMoveSelector);
  const selected=showMoveSelector?[...board.querySelectorAll('button')].find(cell=>cell.dataset.path===boardFocusPath):entry;
  if (keepFocus) (selected && !selected.disabled ? selected : board).focus({preventScroll: true});
  document.querySelector('.play-area').dataset.levels = state.levels;
  document.querySelector('#board-title').textContent = `Level ${state.levels}`;
}
function render() {
  statusText.textContent = state.status;
  substatus.textContent = state.over ? 'Game over.' : state.instruction;
  document.querySelector('#version').textContent = `v${state.version}`;
  document.querySelector('#move-count').textContent = `MOVE ${String(state.history.length).padStart(2,'0')} / ${state.capacity.padStart(2,'0')}`;
  renderBoard();
  pickerPath = [];
  renderPicker();
  document.querySelector('#history').textContent = state.history.length ? state.history.map(m => `${m.mark} → ${Array.isArray(m.square) ? m.square.join(' / ') : m.square}`).join('  ·  ') : 'No moves yet.';
  scheduleComputerTurn();
  queueView();
  if (typeof presentationObserver === 'function') presentationObserver(state);
}
function scheduleComputerTurn() {
  clearTimeout(timer);
  if (state.computer_turn && !pendingReset) {
    const current = generation;
    timer = setTimeout(() => { if (current === generation && !busy && !pendingReset) send({action:'computer'}); }, 650);
  }
}
function fail(error, stage) {
  console.error(error); ready = false; busy = true; clearTimeout(timer);
  modes.disabled = true; levels.disabled = true; newGame.disabled = true;
  board.querySelectorAll('button').forEach(c => c.disabled = true);
  picker.querySelectorAll('button').forEach(button => button.disabled = true);
  statusText.textContent = 'The game couldn’t load.';
  const failure = {
    'runtime-download': 'The game runtime could not be downloaded. Retry loading; if this continues, check your connection.',
    'runtime-start': 'The game runtime could not start. Retry loading or reload the page.',
    'game-download': 'The game files could not be downloaded. Retry loading or reload the page.',
    'game-start': 'The game could not start. Retry loading or reload the page.'
  };
  substatus.textContent = failure[stage] || 'Retry loading or reload the page.';
  retry.hidden = false;
}
function boot() {
  cancelPresentationRequests();
  if (worker) worker.terminate();
  clearTimeout(timer); generation++; ready = false; busy = true;
  modes.disabled = true; levels.disabled = true; newGame.disabled = true;
  retry.hidden = true; statusText.textContent = 'Loading…';
  substatus.textContent = 'Starting…';
  const currentWorker = new Worker('python-worker.js?ui=deep-performance');
  worker = currentWorker;
  currentWorker.onerror = event => { if (worker === currentWorker) fail(event.message); };
  currentWorker.onmessage = ({data}) => {
    // A terminated worker may already have queued a reply before Retry.
    if (worker !== currentWorker) return;
    if (data.fatal) return fail(data.error, data.stage);
    if (data.stage) {
      const loading = {
        'runtime-download': 'Downloading the game runtime…',
        'runtime-start': 'Preparing the game runtime…',
        'game-download': 'Downloading the game files…',
        'game-start': 'Preparing the game…'
      };
      if (loading[data.stage]) substatus.textContent = loading[data.stage];
      return;
    }
    if (data.ready) {
      // Python owns both the default depth and the available UI choices.
      if (!data.levels.includes(selectedLevel)) selectedLevel = data.defaultLevels;
      detailThreshold = data.detailThreshold;
      levels.querySelectorAll('button').forEach(button => button.remove());
      levels.querySelector('.level-options').append(...data.levels.map(value => {
        const button = document.createElement('button'); button.type = 'button';
        button.value = value; button.textContent = value;
        button.setAttribute('aria-label', `Level ${value}`);
        button.addEventListener('click', () => changeLevel(value));
        return button;
      }));
      renderLevelSelection();
      ready = true; modes.disabled = false; levels.disabled = false; newGame.disabled = false; restart(); return;
    }
    if (data.generation !== generation) return;
    if (data.channel === 'presentation') {
      const request = presentationRequests.get(data.id);
      presentationRequests.delete(data.id);
      if (!request) return;
      if (request.generation !== generation || request.revision !== interactionRevision || data.error)
        request.reject(new Error(data.error || 'The position changed.'));
      else request.resolve(data.state);
      return;
    }
    if (data.channel === 'view' || data.channel === 'inspect') {
      const inspection = data.channel === 'inspect';
      if (data.id !== (inspection ? inspectRequest : viewRequest)) return;
      if (inspection) inspectRequest = 0; else viewRequest = 0;
      if (data.error) {
        console.error(data.error);
        if (inspection) renderPicker();
        return;
      }
      if (inspection) {
        state.picker = data.state.picker;
        pickerPath = state.picker.path;
        renderPicker(true);
      } else {
        loadedView = requestedView;
        state.tree = data.state.tree;
        if (typeof boardCamera !== 'undefined') boardCamera.commitDetail();
        renderBoard();
        queueView();
      }
      return;
    }
    if (data.error) {
      busy = false;
      if (state) { render(); substatus.textContent = data.error; }
      else fail(data.error);
      return;
    }
    state = data.state; loadedView = actionView; busy = false;
    if (typeof boardCamera !== 'undefined') boardCamera.commitDetail();
    render();
  };
}
playerOptions.forEach(group => group.querySelectorAll('button').forEach(button => button.addEventListener('click', () => changePlayer(group, button))));
newGame.addEventListener('click', () => requestRestart());
retry.addEventListener('click', boot);
if (typeof boardCamera !== 'undefined') boardCamera.onChange = queueView;
boot();
