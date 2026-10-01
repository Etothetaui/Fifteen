// Run Python away from the rendering thread; there is no JavaScript AI.
const runtimeURL = 'https://cdn.jsdelivr.net/pyodide/v0.28.1/full/';
let dispatch;
async function initialize() {
  importScripts(runtimeURL + 'pyodide.js');
  const py = await loadPyodide({indexURL: runtimeURL});
  for (const name of ['version.py', 'alpha_beta_engine.py', 'ui.py']) {
    const response = await fetch(new URL(name, self.location.href));
    if (!response.ok) throw new Error(`Could not load ${name}`);
    py.FS.writeFile(name, await response.text());
  }
  py.runPython('from ui import dispatch');
  dispatch = py.globals.get('dispatch');
  self.postMessage({ready: true});
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
