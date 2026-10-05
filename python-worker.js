// Run Python away from the rendering thread; there is no JavaScript AI.
const runtimeURL = 'https://cdn.jsdelivr.net/pyodide/v0.28.1/full/';
let dispatch;
async function initialize() {
  importScripts(runtimeURL + 'pyodide.js');
  const py = await loadPyodide({indexURL: runtimeURL});
  for (const name of ['version.py', 'fifteen.py', 'ai_evaluation.py', 'alpha_beta_engine.py', 'ui.py']) {
    const response = await fetch(new URL(name, self.location.href));
    if (!response.ok) throw new Error(`Could not load ${name}`);
    py.FS.writeFile(name, await response.text());
  }
  py.runPython('from ui import dispatch, UI_LEVELS\nfrom fifteen import DEFAULT_LEVELS');
  dispatch = py.globals.get('dispatch');
  self.postMessage({ready: true, defaultLevels: py.globals.get('DEFAULT_LEVELS'), levels: JSON.parse(py.runPython('import json; json.dumps(UI_LEVELS)'))});
}
const ready = initialize();
ready.catch(error => self.postMessage({fatal: true, error: String(error)}));
// Serialize UI actions even while Python is loading.
let queue = ready;
self.onmessage = ({data}) => {
  queue = queue.then(() => {
    try {
      const state = JSON.parse(dispatch(JSON.stringify(data.payload)));
      self.postMessage({id: data.id, generation: data.generation, state});
    } catch (error) {
      self.postMessage({id: data.id, generation: data.generation, error: String(error)});
    }
  });
};
