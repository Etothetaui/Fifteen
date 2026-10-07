// Exercise the real worker startup sequence with controlled external failures.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

async function initialize(failure) {
  const messages = [], files = [];
  const rejectAt = stage => { if (failure === stage) throw Error('private diagnostic'); };
  const python = {
    FS: {writeFile(name) { files.push(name); }},
    globals: {get(name) { return name === 'DEFAULT_LEVELS' ? 1 : () => '{}'; }},
    runPython(code) { rejectAt('game-start'); return code.startsWith('import json') ? '[1,2,3]' : undefined; }
  };
  const context = vm.createContext({URL, console,
    self: {location: {href: 'https://example.test/python-worker.js'}, postMessage(message) { messages.push(message); }},
    importScripts() { rejectAt('runtime-download'); },
    async loadPyodide() { rejectAt('runtime-start'); return python; },
    async fetch() { rejectAt('game-download'); return {ok: true, async text() { return ''; }}; }
  });
  vm.runInContext(fs.readFileSync('python-worker.js', 'utf8'), context);
  await vm.runInContext('ready.catch(() => {})', context);
  return {messages, files};
}

test('successful initialization reports real stages and then ready once', async () => {
  const {messages, files} = await initialize();
  assert.deepEqual(messages.filter(m => m.stage).map(m => m.stage),
    ['runtime-download', 'runtime-start', 'game-download', 'game-start']);
  assert.equal(files.length, 6);
  assert.equal(messages.filter(m => m.ready).length, 1);
  assert.equal(messages.at(-1).ready, true);
  assert.equal(messages.some(m => m.fatal), false);
});

for (const stage of ['runtime-download', 'runtime-start', 'game-download', 'game-start']) {
  test(`startup failure identifies ${stage} without reporting readiness`, async () => {
    const {messages} = await initialize(stage);
    assert.equal(messages.at(-1).fatal, true);
    assert.equal(messages.at(-1).stage, stage);
    assert.equal(messages.some(m => m.ready), false);
  });
}

test('retry discards old worker stage/error messages and shows safe current failure text', () => {
  const workers = [];
  const statusText = {}, substatus = {}, retry = {};
  const source = fs.readFileSync('web.js', 'utf8');
  // Exercise the actual lifecycle functions without a browser or network.
  const lifecycle = source.slice(source.indexOf('function fail('), source.indexOf('playerOptions.forEach('));
  const context = vm.createContext({console: {error() {}}, statusText, substatus, retry,
    worker: undefined, ready: false, busy: false, timer: undefined, generation: 0,
    modes: {}, levels: {}, newGame: {}, board: {querySelectorAll() { return []; }},
    picker: {querySelectorAll() { return []; }},
    clearTimeout() {}, Worker: class {
      constructor() { this.terminated = false; workers.push(this); }
      terminate() { this.terminated = true; }
    }
  });
  vm.runInContext(lifecycle, context);
  vm.runInContext('boot()', context);
  const old = workers[0];
  vm.runInContext('boot()', context);
  assert.equal(workers.length, 2);
  assert.equal(old.terminated, true);
  old.onmessage({data: {stage: 'game-download'}});
  old.onmessage({data: {fatal: true, stage: 'game-start', error: 'old private error'}});
  old.onerror({message: 'obsolete error'});
  assert.equal(statusText.textContent, 'Loading…');
  assert.equal(substatus.textContent, 'Starting…');
  assert.equal(retry.hidden, true);
  workers[1].onmessage({data: {stage: 'game-start'}});
  assert.equal(substatus.textContent, 'Preparing the game…');
  workers[1].onmessage({data: {fatal: true, stage: 'game-start', error: 'private traceback'}});
  assert.equal(retry.hidden, false);
  assert.equal(substatus.textContent.includes('private'), false);
  assert.equal(substatus.textContent.includes('connection'), false);
  assert.equal(substatus.textContent.includes('could not start'), true);
});
