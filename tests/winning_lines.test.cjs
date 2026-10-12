const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = vm.createContext({document: {createElement() {
  return {dataset: {}, setAttribute(name, value) { this[name] = value; }};
}}});
vm.runInContext(fs.readFileSync('winning-lines.js', 'utf8'), context);
const WinningLines = vm.runInContext('WinningLines', context);

test('horizontal, vertical and diagonal endpoints extend by 1.618 times the X reach without cap overhang', () => {
  for (const last of [{x: 250, y: 50}, {x: 50, y: 250}, {x: 250, y: 250}, {x: 250, y: -150}]) {
    const first = {x: 50, y: 50}, metrics = {reach: 23, stroke: 7};
    const line = WinningLines.geometry(first, last, metrics);
    const start = {x: line.x, y: line.y + metrics.stroke / 2};
    const end = {x: start.x + Math.cos(line.angle) * line.length,
      y: start.y + Math.sin(line.angle) * line.length};
    assert.ok(Math.abs(Math.hypot(first.x - start.x, first.y - start.y) - 23 * 1.618) < 1e-8);
    assert.ok(Math.abs(Math.hypot(last.x - end.x, last.y - end.y) - 23 * 1.618) < 1e-8);
    assert.equal(line.length, Math.hypot(last.x - first.x, last.y - first.y) + 2 * (23 * 1.618));
  }
});

test('lines consume Python winning flags at every depth and ignore draws/unfinished boards', () => {
  const layer = Object.create(WinningLines.prototype);
  for (const levels of [1, 2, 3, 5]) {
    for (const result of [null, 0, 1, -1]) {
      const element = {children: [], append(child) { this.children.push(child); }};
      const node = {levels, result, children: Array.from({length: 9}, (_, i) => ({winning: [2, 4, 6].includes(i)}))};
      layer.add(element, node);
      assert.equal(element.children.length, result ? 1 : 0);
      if (result) {
        assert.equal(element.children[0].dataset.first, 2);
        assert.equal(element.children[0].dataset.last, 6);
        assert.equal(element.children[0]['aria-hidden'], 'true');
      }
    }
  }
});

test('boards at the same scale reuse measurements and geometry until their layout changes', () => {
  let reads = 0, measurements = 0, calculations = 0, cellSize = 100;
  context.getComputedStyle = symbol => ({color: symbol.color});
  const owner = offset => ({clientLeft: 2, clientTop: 2,
    getBoundingClientRect() { reads++; return {left: offset, top: offset}; },
    children: Array.from({length: 9}, (_, index) => ({
      querySelector() { return {color: 'green'}; },
      getBoundingClientRect() { reads++; return {left: offset + 2 + index % 3 * cellSize,
        top: offset + 2 + Math.floor(index / 3) * cellSize, width: cellSize, height: cellSize}; },
    })),
  });
  const lines = [owner(0), owner(400)].map(parentElement => ({parentElement, style: {},
    dataset: {levels: '1', first: '0', last: '2', winner: '1'}}));
  const layer = Object.create(WinningLines.prototype);
  Object.assign(layer, {layouts: new Map(), levels: 3,
    board: {querySelectorAll() { return lines; }}, refresh() {},
    measure() { measurements++; return {reach: cellSize * .2, stroke: cellSize * .05}; },
  });
  const geometry = WinningLines.geometry;
  WinningLines.geometry = (...args) => { calculations++; return geometry(...args); };
  try {
    layer.draw();
    assert.deepEqual(lines[0].style, lines[1].style);
    const firstWidth = lines[0].style.width;
    layer.setLevels(3);
    layer.draw();
    assert.equal(reads, 10);
    assert.equal(measurements, 1);
    assert.equal(calculations, 1);
    // Resize/font-load invalidation refreshes saved dimensions, not every draw.
    cellSize = 80;
    layer.invalidateLayout();
    layer.draw();
    assert.notEqual(lines[0].style.width, firstWidth);
    assert.equal(measurements, 2);
    assert.equal(calculations, 2);
    layer.setLevels(2);
    layer.draw();
    assert.equal(measurements, 3);
    assert.equal(calculations, 3);
  } finally { WinningLines.geometry = geometry; }
});
