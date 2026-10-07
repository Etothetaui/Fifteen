const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function harness(enabled = false) {
  const viewport = {clientWidth: 810, clientHeight: 500, clientLeft: 1, clientTop: 1,
    scrollLeft: 0, scrollTop: 0, listeners: {},
    addEventListener(type, listener) { this.listeners[type] = listener; },
    getBoundingClientRect() { return {left: 10, top: 20}; }};
  const board = {style: {}, addEventListener(type, listener) { this[type] = listener; }};
  const reset = {addEventListener(type, listener) { this[type] = listener; }};
  const toggle = {checked: enabled};
  const context = vm.createContext({ResizeObserver: class {observe() {}}});
  vm.runInContext(fs.readFileSync('board-camera.js', 'utf8').split('\nnew BoardCamera(')[0], context);
  const Camera = vm.runInContext('BoardCamera', context);
  const camera = new Camera(viewport, board, reset, toggle);
  const wheel = (deltaY, x = 405, y = 250, extra = {}) => {
    const event = {deltaY, deltaMode: 0, clientX: x + 11, clientY: y + 21,
      preventDefault() { this.prevented = true; }, ...extra};
    viewport.listeners.wheel(event);
    return event;
  };
  return {viewport, board, reset, toggle, camera, wheel};
}

test('initial view and reset show the whole board centered, without changing the toggle', () => {
  const h = harness();
  assert.equal(h.camera.scale, 1);
  assert.equal(h.board.style.width, '500px');
  assert.equal(h.board.style.left, '155px');
  assert.equal(h.board.style.top, '0px');
  assert.equal(h.reset.disabled, true);
  assert.equal(h.toggle.checked, false);
  assert.doesNotMatch(fs.readFileSync('index.html', 'utf8').match(/<input\b[^>]*id="scroll-zoom"[^>]*>/)[0], /\bchecked\b/);
  assert.equal(h.wheel(-100).prevented, undefined);
  assert.equal(h.camera.scale, 1);
  h.toggle.checked = true;
  h.wheel(-100);
  h.toggle.checked = false;
  h.reset.click();
  assert.equal(h.camera.scale, 1);
  assert.equal(h.toggle.checked, false);
  assert.equal(h.board.style.left, '155px');
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
  h.toggle.checked = false;
  assert.equal(h.wheel(-100).prevented, undefined);
  h.toggle.checked = true;
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

test('keyboard focus reveals cropped cells and clears native overflow scrolling', () => {
  const h = harness(true);
  for (let i = 0; i < 8; i++) h.wheel(-100);
  h.viewport.scrollLeft = 25;
  const before = h.camera.x;
  h.board.focusin({target: {getBoundingClientRect() {
    return {left: -100, right: -50, top: 100, bottom: 150};
  }}});
  assert.equal(h.camera.x, before + 111);
  assert.equal(h.viewport.scrollLeft, 0);
});
