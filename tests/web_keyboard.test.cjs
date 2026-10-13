// Run with: node --test tests/web_keyboard.test.cjs
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function harness() {
  const elements = new Map();
  let created = 0;
  let document;
  function element() {
    return {
      dataset: {}, listeners: {}, cells: [], attributes: {}, disabled: false,
      classList: {toggle() {}},
      setAttribute(name, value) { this.attributes[name] = value; },
      getAttribute(name) { return this.attributes[name]; },
      append(...children) { this.cells.push(...children); },
      replaceChildren(...children) { this.cells = children; },
      addEventListener(name, fn) { this.listeners[name] = fn; },
      querySelectorAll() { return this.cells; },
      querySelector() { return this.cells.find(cell => cell.getAttribute('aria-pressed') === 'true'); },
      contains(other) { return other === this || this.cells.some(cell => cell.contains(other)); },
      matches(selector) { return selector === 'button' && this.isButton; },
      focus() { document.activeElement = this; },
      showModal() { this.open = true; this.showCount = (this.showCount || 0) + 1; },
      close() { this.open = false; },
    };
  }
  document = {
    body: element(), activeElement: null, listeners: {},
    createElement() { created++; return element(); },
    addEventListener(name, fn) { this.listeners[name] = fn; },
    querySelector(selector) {
      if (!elements.has(selector)) elements.set(selector, element());
      return elements.get(selector);
    },
  };
  document.activeElement = document.body;
  const groups = ['X', 'O'].map(() => {
    const group = element();
    group.cells = ['human', 'computer', 'experimental'].map(controller => {
      const button = element(); button.dataset.controller = controller;
      button.setAttribute('aria-pressed', String(controller === 'human'));
      return button;
    });
    return group;
  });
  document.querySelector('#modes').cells = groups;
  const posted = [], cleared = [], scheduled = [];
  const context = vm.createContext({document, console, WinningLines: class {add() {} refresh() {} setLevels() {}}, window: {confirm() { return true; }},
    clearTimeout(value) { cleared.push(value); }, setTimeout(callback) { scheduled.push(callback); return scheduled.length; },
    Worker: class {postMessage(value) { posted.push(value); } terminate() {}},
  });
  // Boot requires Python/Worker; the interaction code is exercised independently.
  const source = fs.readFileSync('web.js', 'utf8').replace(/boot\(\);\s*$/, '');
  vm.runInContext(fs.readFileSync('toggle-selection.js', 'utf8'), context);
  vm.runInContext(source, context);
  const run = expression => vm.runInContext(expression, context);
  function cell(path, disabled = false) {
    const value = element(); value.isButton = true; value.disabled = disabled;
    const [row, column] = run(`visualPosition(${JSON.stringify(path)})`);
    Object.assign(value.dataset, {path: path.join('/'), row: String(row), column: String(column)});
    return value;
  }
  return {document, board: elements.get('#board'), run, cell, context, groups, posted, cleared, scheduled,
    created: () => created};
}

test('recursive positions follow displayed placement at levels 1–3', () => {
  const h = harness();
  assert.equal(h.cell([8]).dataset.row, '2');
  assert.equal(h.cell([0, 8]).dataset.row, '2');
  assert.equal(h.cell([1, 0]).dataset.column, '3');
  assert.equal(h.cell([8, 8, 8]).dataset.column, '26');
});

test('arrows cross subboard boundaries, skip unavailable cells, and leave one tab entry', () => {
  const h = harness();
  const current = h.cell([0, 2]), blocked = h.cell([1, 0], true), next = h.cell([1, 1]);
  h.board.cells = [current, blocked, next];
  let prevented = false;
  h.board.listeners.keydown({target: current, key: 'ArrowRight', preventDefault() { prevented = true; }});
  assert.equal(h.document.activeElement, next);
  assert.equal(prevented, true);
  assert.deepEqual(h.board.cells.map(c => c.tabIndex), [-1, -1, 0]);
  h.board.listeners.keydown({target: next, key: 'Home', preventDefault() {}});
  assert.equal(h.document.activeElement, current);
  h.board.listeners.keydown({target: current, key: 'End', preventDefault() {}});
  assert.equal(h.document.activeElement, next);
});

test('Enter and Space retain native activation', () => {
  const h = harness(), cell = h.cell([0]);
  for (const key of ['Enter', ' ']) {
    h.board.listeners.keydown({target: cell, key, preventDefault() { assert.fail('native key intercepted'); }});
  }
});

test('async turns preserve board focus but sidebar intent prevents focus theft', () => {
  const h = harness(), first = h.cell([0]), reply = h.cell([4]);
  h.board.cells = [first]; h.document.activeElement = first;
  h.context.replacement = [reply];
  h.run('worker = {postMessage() {}}; state = {levels: 1}; renderNode = () => {board.cells = replacement;};');
  h.run("send({action: 'play'})");
  assert.equal(h.document.activeElement, h.board);
  h.run('renderBoard()');
  assert.equal(h.document.activeElement, reply);
  // AI turn has no available moves, retaining a stable focus target on the group.
  reply.disabled = true; h.run('renderBoard()');
  assert.equal(h.document.activeElement, h.board);
  h.document.activeElement = h.document.querySelector('#new-game');
  h.document.listeners.focusin({target: h.document.activeElement});
  reply.disabled = false; h.run('renderBoard()');
  assert.equal(h.document.activeElement, h.document.querySelector('#new-game'));
  assert.equal(reply.tabIndex, 0);
});

test('the cell accessible label reflects Python last-move and winning flags', () => {
  const h = harness();
  h.run('state = {levels: 1, computer_turn: false}; busy = false;');
  const cell = h.run("renderNode({kind: 'cell', path: [4], mark: 'X', winning: true, last: true, allowed: false})");
  assert.equal(cell.getAttribute('aria-label'), 'Position 5, X, winning line, last move');
  assert.equal(cell.disabled, true);
});

for (const action of ['new', 'level', 'player']) {
  for (const accepted of [false, true]) {
    test(`${action} reset ${accepted ? 'confirms once' : 'cancel preserves match and selections'}`, () => {
      const h = harness();
      h.context.group = h.groups[0]; h.context.choice = h.groups[0].cells[1];
      h.run('worker = new Worker(); ready = true; selectedLevel = 2; state = {over: false, history: [1]}; timer = 123; generation = 7;');
      const original = h.run('state');
      if (action === 'new') h.document.querySelector('#new-game').listeners.click();
      if (action === 'level') h.run('changeLevel(3)');
      if (action === 'player') h.groups[0].cells[1].listeners.click();
      const dialog = h.document.querySelector('#reset-dialog');
      assert.equal(dialog.showCount, 1);
      assert.equal(h.posted.length, 0);
      assert.equal(h.run('selectedLevel'), 2);
      h.document.querySelector(accepted ? '#reset-confirm' : '#reset-cancel').listeners.click();
      assert.equal(dialog.open, false);
      assert.equal(h.run('state'), original);
      assert.equal(h.run('selectedLevel'), accepted && action === 'level' ? 3 : 2);
      assert.equal(h.groups[0].cells[1].getAttribute('aria-pressed'), String(accepted && action === 'player'));
      assert.equal(h.posted.length, accepted ? 1 : 0);
      assert.equal(h.run('generation'), accepted ? 8 : 7);
      assert.deepEqual(h.cleared, [123, 123]);
      if (accepted) assert.equal(h.posted[0].payload.action, 'new');
    });
  }
}

test('empty and finished games reset without prompting; unchanged controls do nothing', () => {
  const h = harness();
  h.context.window.confirm = () => assert.fail('unexpected prompt');
  h.run('worker = new Worker(); ready = true; selectedLevel = 1; state = {over: false, history: []}; requestRestart();');
  h.run('state = {over: true, history: [1]}; requestRestart(); changeLevel(1);');
  h.groups[0].cells[0].listeners.click();
  assert.equal(h.posted.length, 2);
  assert.equal(h.document.querySelector('#reset-dialog').showCount, undefined);
});

test('confirmed reset ignores an AI response from the previous generation', () => {
  const h = harness();
  h.run('boot(); ready = true; selectedLevel = 1; state = {over: false, history: [1]};');
  const oldGeneration = h.run('generation'), original = h.run('state');
  h.run('requestRestart();');
  h.document.querySelector('#reset-confirm').listeners.click();
  h.context.oldGeneration = oldGeneration;
  h.run('worker.onmessage({data: {generation: oldGeneration, state: {stale: true}}});');
  assert.equal(h.run('state'), original);
  assert.equal(h.posted.length, 1);
});

test('reset dialog pauses AI scheduling and Escape resumes once with unchanged generation', () => {
  const h = harness();
  const trigger = h.document.querySelector('#new-game');
  h.document.activeElement = trigger;
  h.run('worker = new Worker(); ready = true; busy = false; selectedLevel = 1; state = {over: false, history: [1], computer_turn: true}; generation = 6; requestRestart();');
  h.run('scheduleComputerTurn(); requestRestart();');
  assert.equal(h.scheduled.length, 0);
  assert.equal(h.document.querySelector('#reset-dialog').showCount, 1);
  let prevented = false;
  h.document.querySelector('#reset-dialog').listeners.cancel({preventDefault() { prevented = true; }});
  assert.equal(prevented, true);
  assert.equal(h.document.activeElement, trigger);
  assert.equal(h.run('generation'), 6);
  assert.equal(h.scheduled.length, 1);
  h.scheduled[0]();
  assert.equal(h.posted.length, 1);
  assert.equal(h.posted[0].payload.action, 'computer');
});

// Snapshot fixtures contain presentation data only, not a second rules implementation.
function pickerTree(levels, path = []) {
  return {kind: 'board', path, allowed: true, result: null,
    children: Array.from({length: 9}, (_, index) => levels > 1
      ? pickerTree(levels - 1, [...path, index])
      : {kind: 'cell', path: [...path, index], allowed: index !== 0, mark: index === 0 ? 'X' : ''}),
  };
}

for (const levels of [1, 2, 3]) {
  test(`precise picker submits the shared path format at level ${levels}`, () => {
    const h = harness();
    h.context.snapshot = {levels, tree: pickerTree(levels), over: false, computer_turn: false};
    h.run('state = snapshot; busy = false; worker = new Worker(); renderPicker();');
    const grid = h.document.querySelector('#picker-grid');
    for (let depth = 1; depth < levels; depth++) grid.cells[4].listeners.click();
    assert.equal(h.posted.length, 0);
    assert.equal(grid.cells[0].disabled, true);
    grid.cells[0].listeners.click();
    assert.equal(h.posted.length, 0);
    grid.cells[4].listeners.click();
    assert.equal(h.posted.length, 1);
    assert.deepEqual(JSON.parse(JSON.stringify(h.posted[0].payload)), {action: 'play', square: levels === 1 ? 4 : Array(levels).fill(4)});
  });
}

test('picker Back submits nothing; unavailable branches and AI/terminal turns cannot submit', () => {
  const h = harness();
  const snapshot = {levels: 3, tree: pickerTree(3), over: false, computer_turn: false};
  snapshot.tree.children[0].allowed = false;
  h.context.snapshot = snapshot;
  h.run('state = snapshot; busy = false; worker = new Worker(); renderPicker();');
  const grid = h.document.querySelector('#picker-grid');
  grid.cells[0].listeners.click();
  assert.equal(h.run('pickerPath.length'), 0);
  grid.cells[4].listeners.click();
  h.document.querySelector('#picker-back').listeners.click();
  assert.equal(h.run('pickerPath.length'), 0);
  for (const condition of ['state.computer_turn = true', 'state.computer_turn = false; state.over = true']) {
    h.run(`${condition}; renderPicker();`);
    assert.equal(grid.cells.every(cell => cell.disabled), true);
    grid.cells[4].listeners.click();
    assert.equal(h.run('pickerPath.length'), 0);
  }
  assert.equal(h.posted.length, 0);
});

test('deep picker requests one layer and submits the original full move path', () => {
  const h = harness();
  h.run('boot(); ready = true; busy = false;');
  const layer = path => ({kind: 'board', path, levels: 6 - path.length,
    children: Array.from({length: 9}, (_, index) => ({kind: path.length === 5 ? 'cell' : 'board',
      path: [...path, index], allowed: index !== 0, mark: '', result: null, children: []}))});
  h.context.snapshot = {levels: 6, picker: layer([]), over: false, computer_turn: false};
  h.run('state = snapshot; renderPicker();');
  const grid = h.document.querySelector('#picker-grid');
  for (let depth = 1; depth < 6; depth++) {
    grid.cells[4].listeners.click();
    const request = h.posted.at(-1);
    assert.equal(request.channel, 'inspect');
    assert.deepEqual(Array.from(request.payload.path), Array(depth).fill(4));
    h.context.reply = {id: request.id, generation: request.generation, channel: 'inspect', state: {picker: layer(Array(depth).fill(4))}};
    h.run('worker.onmessage({data: reply});');
  }
  grid.cells[4].listeners.click();
  const play = h.posted.at(-1);
  assert.equal(play.channel, undefined);
  assert.equal(play.payload.action, 'play');
  assert.deepEqual(Array.from(play.payload.square), Array(6).fill(4));
});

test('viewport replies cannot replace permissions after a game action', () => {
  const h = harness();
  h.context.boardCamera = {view() { return {left: 0, top: 0, right: 1, bottom: 1, pixels: 500}; }};
  h.run('boot(); ready = true; busy = false; state = {levels: 6, tree: {current: true}}; queueView();');
  h.scheduled.at(-1)();
  const view = h.posted.at(-1);
  assert.equal(view.channel, 'view');
  assert.equal(h.run('busy'), false);
  h.run("send({action: 'play', square: [4,4,4,4,4,4]});");
  h.context.reply = {id: view.id, generation: view.generation, channel: 'view', state: {tree: {stale: true}}};
  h.run('worker.onmessage({data: reply});');
  assert.equal(h.run('state.tree.current'), true);
  assert.equal(h.run('busy'), true);
});

test('unchanged viewport detail retains DOM nodes instead of rebuilding them while panning', () => {
  const h = harness();
  h.context.snapshot = {levels: 4, tree: pickerTree(2), over: false, computer_turn: false};
  h.run('state = snapshot; busy = false; renderNode(state.tree, true);');
  const created = h.created(), first = h.board.cells[0];
  for (let i = 0; i < 20; i++) h.run('renderNode(JSON.parse(JSON.stringify(state.tree)), true);');
  assert.equal(h.created(), created, 'camera updates must not allocate the entire board repeatedly');
  assert.equal(h.board.cells[0], first);
});

test('main move selector survives detail redraws and disappears during unavailable turns',()=>{
  const h=harness();h.context.snapshot={levels:1,tree:pickerTree(1),over:false,computer_turn:false};
  h.run("state=snapshot;busy=false;showMoveSelector=true;boardFocusPath='4';renderNode(state.tree,true);");
  assert.ok(h.board.cells[4].className.includes('move-selected'));
  h.run('renderNode(JSON.parse(JSON.stringify(state.tree)),true);');
  assert.ok(h.board.cells[4].className.includes('move-selected'));
  h.run('state.computer_turn=true;renderNode(state.tree,true);');
  assert.equal(h.board.cells[4].className.includes('move-selected'),false);
});

test('main-game restart starts the selector at the central square at each depth',()=>{
  for(const level of [1,3,6]) {
    const h=harness();h.context.level=level;
    h.run('ready=true;selectedLevel=level;showMoveSelector=true;worker=new Worker();restart();');
    assert.equal(h.run('boardFocusPath'),Array(level).fill(4).join('/'));
  }
});

test('retained cells update marks, permissions and click data after a move or failed request', () => {
  const h = harness();
  h.context.snapshot = {levels: 4, tree: pickerTree(2), over: false, computer_turn: false};
  h.run('state = snapshot; busy = false; worker = new Worker(); renderNode(state.tree, true);');
  const branch = h.board.cells[4], cell = branch.cells[4], created = h.created();
  h.run("state.tree.children[4].children[4].mark = 'O'; state.tree.children[4].children[4].allowed = false; interactionRevision++; renderNode(state.tree, true);");
  assert.equal(h.board.cells[4], branch);
  assert.equal(branch.cells[4], cell);
  assert.equal(cell._mark.textContent, 'O');
  assert.equal(cell.disabled, true);
  cell.listeners.click();
  assert.equal(h.posted.length, 0);
  h.run("state.tree.children[4].children[4].mark = ''; state.tree.children[4].children[4].allowed = true; interactionRevision++; renderNode(state.tree, true);");
  assert.equal(cell.disabled, false);
  cell.listeners.click();
  assert.equal(h.posted.at(-1).payload.action, 'play');
  assert.equal(h.created(), created);
});

test('lens cells omit hidden spans but create marks and retain permissions after updates', () => {
  const h = harness();
  h.document.body.dataset.layout = '7';
  h.context.snapshot = {levels: 5, tree: pickerTree(2), over: false, computer_turn: false};
  h.run('state = snapshot; busy = false; worker = new Worker(); renderNode(state.tree, true);');
  const cell = h.board.cells[4].cells[4], listener = cell.listeners.click;
  assert.equal(cell.cells.length, 0, 'empty lens cells need no invisible number or mark spans');
  h.run("state.tree.children[4].children[4].mark = 'O'; state.tree.children[4].children[4].allowed = false; interactionRevision++; renderNode(state.tree, true);");
  assert.equal(cell._mark.textContent, 'O');
  assert.equal(cell.cells.length, 1);
  assert.equal(cell.disabled, true);
  assert.equal(cell.listeners.click, listener, 'adding a mark must not register another listener');
  cell.listeners.click();
  assert.equal(h.posted.length, 0, 'a marked/unavailable cell cannot submit a move');
  h.document.body.dataset.layout = '1';
  h.run('renderNode(state.tree, true);');
  assert.equal(cell._number.textContent, 5, 'other layouts recover their existing number display');
  assert.equal(cell.listeners.click, listener);
});

test('viewport cache reuses overscan but requests newly exposed regions and new detail depths', () => {
  const h = harness();
  let pixels = 500, left = .25;
  h.context.boardCamera = {view(buffer = 80) { return {left: buffer ? left - .1 : left,
    top: .3, right: .7, bottom: .7, pixels}; }, commitDetail() {}};
  h.run('boot(); ready = true; busy = false; detailThreshold = 54; state = {levels: 6}; loadedView = {left:.2, top:.2, right:.8, bottom:.8, pixels:500}; queueView();');
  h.scheduled.at(-1)();
  assert.equal(h.posted.length, 0);
  pixels = 520;
  h.run('queueView();'); h.scheduled.at(-1)();
  assert.equal(h.posted.length, 0, 'zoom within a detail band needs no round trip');
  left = .1;
  h.run('queueView();'); h.scheduled.at(-1)();
  assert.equal(h.posted.length, 1);
  left = .25; pixels = 1500;
  h.run('viewRequest = 0; queueView();'); h.scheduled.at(-1)();
  assert.equal(h.posted.length, 2);
});
