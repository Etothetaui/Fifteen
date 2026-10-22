// Run Python away from the rendering thread; there is no JavaScript AI.
const runtimeURL = 'https://cdn.jsdelivr.net/pyodide/v0.28.1/full/';
let dispatch;
let stage;
const relayGame = new URL(self.location.href).searchParams.get('game') === 'relay';
function loading(next) {
  stage = next;
  self.postMessage({stage});
}
async function initialize() {
  loading('runtime-download');
  importScripts(runtimeURL + 'pyodide.js');
  loading('runtime-start');
  const py = await loadPyodide({indexURL: runtimeURL});
  loading('game-download');
  const modules = ['version.py', 'fifteen.py', 'ai_evaluation.py', 'alpha_beta_engine.py', 'experimental_ai.py', 'ui.py'];
  if (relayGame) {
    modules.push('campaign.py', 'relay_api.py', 'relay_browser.py', 'relay_example.py',
      'tests/fixtures/relay-countercapture.json', 'tests/fixtures/relay-opening.json');
    py.FS.mkdirTree('tests/fixtures');
  }
  for (const name of modules) {
    // Keep Python modules from different releases out of the same runtime.
    const response = await fetch(new URL(name, self.location.href), {cache: 'no-store'});
    if (!response.ok) throw new Error(`Could not load ${name}`);
    py.FS.writeFile(name, await response.text());
  }
  loading('game-start');
  py.runPython(relayGame ? 'from relay_browser import dispatch' : 'from ui import dispatch, UI_LEVELS, DETAIL_THRESHOLD\nfrom fifteen import DEFAULT_LEVELS');
  dispatch = py.globals.get('dispatch');
  if (relayGame) { self.postMessage({ready: true}); return; }
  self.postMessage({ready: true, defaultLevels: py.globals.get('DEFAULT_LEVELS'), detailThreshold: py.globals.get('DETAIL_THRESHOLD'), levels: JSON.parse(py.runPython('import json; json.dumps(UI_LEVELS)'))});
}
const ready = initialize();
ready.catch(error => self.postMessage({fatal: true, stage, error: String(error)}));
// Serialize UI actions even while Python is loading.
let queue = ready;
self.onmessage = ({data}) => {
  queue = queue.then(() => {
    try {
      const state = JSON.parse(dispatch(JSON.stringify(data.payload)));
      self.postMessage({id: data.id, generation: data.generation, channel: data.channel, state});
    } catch (error) {
      self.postMessage({id: data.id, generation: data.generation, channel: data.channel, error: String(error)});
    }
  });
};
