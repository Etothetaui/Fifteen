const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function harness(enabled = false) {
  const viewport = {clientWidth: 810, clientHeight: 500, clientLeft: 1, clientTop: 1,
    scrollLeft: 0, scrollTop: 0, listeners: {}, classList: {add() {}, remove() {}},
    setPointerCapture(id) { this.capture = id; },
    hasPointerCapture(id) { return this.capture === id; },
    releasePointerCapture() { this.capture = null; },
    addEventListener(type, listener) { this.listeners[type] = listener; },
    getBoundingClientRect() { return {left: 10, top: 20}; }};
  const board = {style: {}, addEventListener(type, listener) { this[type] = listener; }};
  const reset = {addEventListener(type, listener) { this[type] = listener; }};
  const options = ['off', 'on'].map(value => ({dataset: {zoom: value},
    pressed: String(enabled === (value === 'on')),
    getAttribute() { return this.pressed; },
    setAttribute(name, value) { this.pressed = value; },
    addEventListener(type, listener) { this[type] = listener; }}));
  const toggle = {querySelectorAll() { return options; },
    querySelector() { return options.find(option => option.pressed === 'true'); },
    click(value) { options.find(option => option.dataset.zoom === value).click(); }};
  const makeMovement = () => {
    const buttons = ['off', 'on'].map(value => ({dataset: {move: value}, pressed: String(value === 'off'),
      getAttribute() { return this.pressed; }, setAttribute(name, value) { this.pressed = value; },
      addEventListener(type, listener) { this[type] = listener; }}));
    return {querySelectorAll() { return buttons; }, querySelector() { return buttons.find(b => b.pressed === 'true'); },
      click(value) { buttons.find(b => b.dataset.move === value).click(); }};
  };
  const dragToggle = makeMovement(), edgeToggle = makeMovement();
  const window = {listeners: {}, addEventListener(type, listener) { this.listeners[type] = listener; }};
  const document = {hidden: false, modal: false, hasFocus() { return true; }, listeners: {},
    addEventListener(type, listener) { this.listeners[type] = listener; }, querySelector() { return this.modal; }};
  const frames = new Map();
  let frameId = 0, now = 0;
  const context = vm.createContext({window, document, performance: {now() { return now; }}, ResizeObserver: class {observe() {}},
    requestAnimationFrame(fn) { frames.set(++frameId, fn); return frameId; },
    cancelAnimationFrame(id) { frames.delete(id); }});
  vm.runInContext(fs.readFileSync('toggle-selection.js', 'utf8'), context);
  vm.runInContext(fs.readFileSync('board-camera.js', 'utf8').split('\nnew BoardCamera(')[0], context);
  const Camera = vm.runInContext('BoardCamera', context);
  const camera = new Camera(viewport, board, reset, toggle, dragToggle, edgeToggle);
  const wheel = (deltaY, x = 405, y = 250, extra = {}) => {
    const event = {deltaY, deltaMode: 0, clientX: x + 11, clientY: y + 21,
      preventDefault() { this.prevented = true; }, ...extra};
    viewport.listeners.wheel(event);
    return event;
  };
  const pointer = (type, x, y, extra = {}) => (type === 'pointermove' ? document : viewport).listeners[type]({clientX: x + 11, clientY: y + 21,
    pointerType: 'mouse', pointerId: 1, button: 0, preventDefault() {}, ...extra});
  const frame = time => { now = time; const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(time)); };
  return {viewport, board, reset, toggle, camera, wheel, dragToggle, edgeToggle, pointer, frame, frames, window, document};
}

test('initial view and reset show the whole board centered, without changing the toggle', () => {
  const h = harness();
  assert.equal(h.camera.scale, 1);
  assert.equal(h.board.style.width, '300px');
  assert.equal(h.board.style.left, '255px');
  assert.equal(h.board.style.top, '100px');
  assert.equal(h.reset.disabled, true);
  assert.equal(h.toggle.querySelector().dataset.zoom, 'off');
  assert.match(fs.readFileSync('index.html', 'utf8'), /data-zoom="off" aria-pressed="true"/);
  assert.equal(h.wheel(-100).prevented, undefined);
  assert.equal(h.camera.scale, 1);
  h.toggle.click('on');
  assert.equal(h.toggle.querySelector().dataset.zoom, 'on');
  h.toggle.click('on');
  assert.equal(h.toggle.querySelectorAll().filter(option => option.pressed === 'true').length, 1);
  h.wheel(-100);
  h.toggle.click('off');
  h.reset.click();
  assert.equal(h.camera.scale, 1);
  assert.equal(h.toggle.querySelector().dataset.zoom, 'off');
  assert.equal(h.board.style.left, '255px');
});

test('wheel zoom preserves the board point under the cursor unless a boundary intervenes', () => {
  const h = harness(true);
  for (let i = 0; i < 6; i++) h.wheel(-100);
  const point = [(300 - h.camera.x) / h.camera.size, (180 - h.camera.y) / h.camera.size];
  assert.equal(h.wheel(-40, 300, 180).prevented, true);
  assert.ok(Math.abs((300 - h.camera.x) / h.camera.size - point[0]) < 1e-10);
  assert.ok(Math.abs((180 - h.camera.y) / h.camera.size - point[1]) < 1e-10);
});

test('zoom bounds consume wheel input, while disabled zoom and Ctrl-wheel leave it alone', () => {
  const h = harness(true);
  for (let i = 0; i < 50; i++) h.wheel(-100, 0, 0);
  assert.equal(h.camera.scale, 9);
  assert.ok(h.camera.x <= 0 && h.camera.x >= h.camera.width - h.camera.size);
  assert.equal(h.wheel(-100).prevented, true);
  for (let i = 0; i < 50; i++) h.wheel(100);
  assert.equal(h.camera.scale, 1);
  assert.equal(h.wheel(100).prevented, true);
  h.toggle.click('off');
  assert.equal(h.wheel(-100).prevented, undefined);
  h.toggle.click('on');
  assert.equal(h.wheel(-100, 405, 250, {ctrlKey: true}).prevented, undefined);
  assert.equal(h.camera.scale, 1);
});

test('line and pixel deltas agree, and resize retains the viewed center', () => {
  const a = harness(true), b = harness(true);
  a.wheel(-3, 405, 250, {deltaMode: 1});
  b.wheel(-48);
  assert.equal(a.camera.scale, b.camera.scale);
  for (let i = 0; i < 8; i++) a.wheel(-100);
  const center = (a.camera.width / 2 - a.camera.x) / a.camera.size;
  a.viewport.clientWidth = 1000;
  a.viewport.clientHeight = 600;
  a.camera.resize();
  assert.ok(Math.abs((500 - a.camera.x) / a.camera.size - center) < 1e-10);
});

test('focus changes leave the camera position and zoom unchanged', () => {
  const h = harness(true);
  for (let i = 0; i < 8; i++) h.wheel(-100);
  const before = [h.camera.x, h.camera.y, h.camera.scale];
  h.board.focusin?.({target: {getBoundingClientRect() {
    return {left: -100, right: -50, top: 100, bottom: 150};
  }}});
  assert.deepEqual([h.camera.x, h.camera.y, h.camera.scale], before);
  assert.match(fs.readFileSync('web.css', 'utf8'), /\.board-viewport\{[^}]*overflow:clip/);
});

test('movement switches are independent, start Off, and cannot move a fully fitted board', () => {
  const h = harness(true);
  assert.equal(h.camera.enabled(h.dragToggle), false);
  assert.equal(h.camera.enabled(h.edgeToggle), false);
  const html = fs.readFileSync('index.html', 'utf8');
  for (const id of ['drag-move', 'edge-move']) {
    assert.match(html, new RegExp(`id="${id}"[^<]+<button[^>]+data-move="off" aria-pressed="true"`));
  }
  h.dragToggle.click('on');
  assert.equal(h.camera.enabled(h.edgeToggle), false);
  h.edgeToggle.click('on');
  h.pointer('pointermove', 2, 2);
  assert.equal(h.frames.size, 0);
  h.pointer('pointerdown', 200, 200);
  h.pointer('pointermove', 250, 250);
  h.pointer('pointerup', 250, 250);
  assert.equal(h.camera.x, 255);
  assert.equal(h.camera.y, 100);
  h.dragToggle.click('off');
  assert.equal(h.camera.enabled(h.edgeToggle), true);
});

test('drag threshold preserves clicks, moves the board, clamps bounds and suppresses a drag click', () => {
  const h = harness(true);
  for (let i = 0; i < 8; i++) h.wheel(-100);
  h.dragToggle.click('on');
  const x = h.camera.x;
  h.pointer('pointerdown', 300, 200);
  h.pointer('pointermove', 302, 202);
  assert.equal(h.camera.x, x);
  assert.equal(h.viewport.capture, undefined);
  h.pointer('pointerup', 302, 202);
  assert.equal(h.camera.suppressClick, false);
  h.pointer('pointerdown', 300, 200);
  h.pointer('pointermove', 330, 200);
  assert.equal(h.camera.x, x + 30);
  assert.equal(h.viewport.capture, 1);
  h.pointer('pointermove', 10000, 10000);
  assert.equal(h.camera.x, 0);
  assert.equal(h.camera.y, 0);
  h.pointer('pointerup', 10000, 10000);
  assert.equal(h.viewport.capture, null);
  let blocked = false;
  const click = {detail: 1, preventDefault() {}, stopImmediatePropagation() { blocked = true; }};
  h.viewport.listeners.click({...click, detail: 0});
  assert.equal(blocked, false);
  h.viewport.listeners.click(click);
  assert.equal(blocked, true);
  assert.equal(h.camera.suppressClick, false);
});

test('edge movement uses a seventy-five-pixel strip and normalized diagonal speed', () => {
  const h = harness(true);
  for (let i = 0; i < 8; i++) h.wheel(-100);
  h.edgeToggle.click('on');
  h.pointer('pointermove', 76, 200);
  assert.equal(h.frames.size, 0);
  h.pointer('pointermove', 75, 250);
  const x = h.camera.x;
  h.frame(0); h.frame(50); h.frame(100);
  assert.ok(Math.abs(h.camera.x - x - .05 * (h.camera.edgeSpeed(50) + h.camera.edgeSpeed(100))) < 1e-10);
  h.pointer('pointermove', 75, 75);
  const before = [h.camera.x, h.camera.y];
  h.frame(150);
  assert.ok(Math.abs(Math.hypot(h.camera.x - before[0], h.camera.y - before[1]) - h.camera.edgeSpeed(150) * .05) < 1e-10);
  h.pointer('pointermove', 100, 100);
  h.frame(200);
  assert.equal(h.frames.size, 0);
  h.pointer('pointermove', -26, 100);
  assert.equal(h.frames.size, 0);
});

test('edge and drag stop for cancellation, focus loss, reset, and independent Off settings', () => {
  for (const stop of [h => h.document.listeners.pointerleave(), h => h.window.listeners.blur(),
    h => { h.document.hidden = true; h.document.listeners.visibilitychange(); },
    h => h.reset.click(), h => h.edgeToggle.click('off'), h => h.pointer('pointercancel', 0, 0)]) {
    const h = harness(true);
    for (let i = 0; i < 8; i++) h.wheel(-100);
    h.edgeToggle.click('on');
    h.pointer('pointermove', 2, 200);
    assert.equal(h.frames.size, 1);
    stop(h);
    assert.equal(h.frames.size, 0);
  }
  const h = harness(true);
  for (let i = 0; i < 8; i++) h.wheel(-100);
  h.dragToggle.click('on'); h.edgeToggle.click('on');
  h.pointer('pointerdown', 200, 200);
  h.pointer('pointermove', 2, 200);
  assert.equal(h.frames.size, 0);
  h.dragToggle.click('off');
  assert.equal(h.camera.drag, null);
  assert.equal(h.viewport.capture, null);
  assert.equal(h.camera.enabled(h.edgeToggle), true);
  h.document.modal = true;
  const x = h.camera.x;
  h.frame(0); h.frame(50);
  assert.equal(h.camera.x, x);
});

test('edge movement extends exactly 25 pixels outside all four sides and corners', () => {
  const h = harness(true);
  for (let i = 0; i < 8; i++) h.wheel(-100);
  h.edgeToggle.click('on');
  const {width, height} = h.camera;
  for (const [x, y, dx, dy] of [[-25, 250, 1, 0], [width + 25, 250, -1, 0],
    [405, -25, 0, 1], [405, height + 25, 0, -1], [-25, -25, 1, 1]]) {
    h.pointer('pointermove', x, y);
    const before = [h.camera.x, h.camera.y];
    h.frame(0); h.frame(50);
    assert.equal(Math.sign(h.camera.x - before[0]), dx);
    assert.equal(Math.sign(h.camera.y - before[1]), dy);
    assert.ok(Math.abs(Math.hypot(h.camera.x - before[0], h.camera.y - before[1]) - h.camera.edgeSpeed(50) * .05) < 1e-10);
    h.camera.stopEdge();
  }
  h.pointer('pointermove', -25, 200);
  h.pointer('pointerleave', -25, 200);
  assert.equal(h.frames.size, 1, 'leaving the viewer does not end scrolling in the outer strip');
  for (const [x, y] of [[-26, 200], [width + 26, 200], [405, -26], [405, height + 26], [-26, -25]]) {
    h.pointer('pointermove', x, y);
    assert.equal(h.frames.size, 0);
  }
});

test('edge motion clamps at map limits and drag ignores touch and other mouse buttons', () => {
  const h = harness(true);
  for (let i = 0; i < 8; i++) h.wheel(-100);
  h.camera.x = -2;
  h.edgeToggle.click('on'); h.dragToggle.click('on');
  h.pointer('pointermove', 2, 250);
  h.frame(0); h.frame(50); h.frame(100);
  assert.equal(h.camera.x, 0);
  assert.equal(h.frames.size, 0);
  h.pointer('pointerdown', 200, 200, {pointerType: 'touch'});
  assert.equal(h.camera.drag, null);
  h.pointer('pointerdown', 200, 200, {button: 2});
  assert.equal(h.camera.drag, null);
  h.viewport.clientHeight = 600;
  h.camera.reset();
  assert.equal(h.camera.y, 100);
  assert.equal(h.camera.height - h.camera.y - h.camera.size, 100);
});

test('edge movement follows the center-to-mouse angle without snapping and keeps total speed', () => {
  const h = harness(true);
  for (let i = 0; i < 8; i++) h.wheel(-100);
  h.edgeToggle.click('on');
  // Include positions along one side, a corner, and the outside strip.
  for (const [x, y] of [[75, 200], [75, 100], [735, 330], [300, 75], [-20, 390]]) {
    h.pointer('pointermove', x, y);
    const before = [h.camera.x, h.camera.y];
    h.frame(0); h.frame(50);
    const dx = h.camera.x - before[0], dy = h.camera.y - before[1];
    const vx = 405 - x, vy = 250 - y;
    assert.ok(Math.abs(dx * vy - dy * vx) < 1e-8, 'movement is parallel to the center-to-mouse vector');
    assert.ok(dx * vx + dy * vy > 0, 'board moves opposite to the viewing direction');
    assert.ok(Math.abs(Math.hypot(dx, dy) - h.camera.edgeSpeed(50) * .05) < 1e-10);
    h.camera.stopEdge();
  }
});

test('edge acceleration depends on elapsed zone time, reaches 1.618 times base speed, and resets on exit', () => {
  const h = harness(true);
  for (let i = 0; i < 12; i++) h.wheel(-100);
  h.edgeToggle.click('on');
  h.pointer('pointermove', 75, 250);
  assert.equal(h.camera.edgeSpeed(0), 300);
  assert.ok(Math.abs(h.camera.edgeSpeed(500) - 392.7) < 1e-10);
  assert.ok(Math.abs(h.camera.edgeSpeed(1000) - 485.4) < 1e-10);
  assert.ok(Math.abs(h.camera.edgeSpeed(1500) - 485.4) < 1e-10);
  let previous = 300;
  for (let time = 0; time <= 1000; time += 50) {
    h.frame(time);
    const speed = h.camera.edgeSpeed(time);
    assert.ok(speed >= previous && speed <= 485.4 + 1e-10);
    previous = speed;
  }
  const entered = h.camera.edgeEntered;
  h.pointer('pointermove', -25, 250);
  assert.equal(h.camera.edgeEntered, entered, 'distance from the edge does not reset acceleration');
  h.pointer('pointermove', 735, 350);
  assert.equal(h.camera.edgeEntered, entered, 'changing direction within the zone retains acceleration');
  const before = [h.camera.x, h.camera.y];
  h.frame(1050);
  assert.ok(Math.abs(Math.hypot(h.camera.x - before[0], h.camera.y - before[1]) - 24.27) < 1e-10);
  h.pointer('pointermove', 405, 250);
  assert.equal(h.camera.edgeEntered, null);
  h.pointer('pointermove', 75, 250);
  assert.equal(h.camera.edgeSpeed(1050), 300);
  h.window.listeners.blur();
  assert.equal(h.camera.edgeEntered, null);
});

test('elapsed zone time is retained at board bounds and long frames cannot produce a large jump', () => {
  const h = harness(true);
  for (let i = 0; i < 12; i++) h.wheel(-100);
  h.camera.x = 0;
  h.edgeToggle.click('on');
  h.pointer('pointermove', 75, 250);
  assert.equal(h.frames.size, 0);
  h.frame(1000);
  h.pointer('pointermove', 735, 250);
  assert.ok(Math.abs(h.camera.edgeSpeed(1000) - 485.4) < 1e-10);
  h.frame(1000);
  const x = h.camera.x;
  h.frame(5000);
  assert.ok(Math.abs(h.camera.x - x + 24.27) < 1e-10);
  h.edgeToggle.click('off');
  assert.equal(h.camera.edgeEntered, null);
});
