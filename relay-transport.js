'use strict';
// Only the transport changes between the local server and GitHub Pages.
// The worker imports the same Campaign, API, rules, and AI as the server.
window.RelayTransport = (() => {
  const browser = document.documentElement.dataset.transport !== 'http';
  let worker, ready, serial = 0, unavailable = false, storageDisabled = false;
  const pending = new Map();
  const key = 'fifteen-relay-save:' + new URL('.', document.baseURI).pathname;
  const mutating = new Set(['play', 'ai', 'undo', 'new', 'import']);
  function initialize() {
    if (ready) return ready;
    ready = new Promise((resolve, reject) => {
      worker = new Worker(new URL('python-worker.js?game=relay&ui=collection', document.baseURI));
      const fail = message => {
        unavailable = true;
        const error = Error(message);
        reject(error);
        for (const request of pending.values()) request.reject(error);
        pending.clear();
      };
      worker.onerror = () => fail('The Python game could not start. Reload this page to retry.');
      worker.onmessage = ({data}) => {
        if (data.stage) {
          const labels = {'runtime-download':'Downloading Python…', 'runtime-start':'Starting Python…',
            'game-download':'Loading game files…', 'game-start':'Preparing game…'};
          document.getElementById('turnTitle').textContent = labels[data.stage] || 'Loading game…';
        }
        if (data.fatal) return fail('The Python game could not start. Check your connection and reload this page to retry.');
        if (data.ready) return resolve();
        const request = pending.get(data.id);
        if (!request) return;
        pending.delete(data.id);
        if (data.error) request.reject(Error(data.error));
        else request.resolve(data.state);
      };
    });
    return ready;
  }
  async function local(url, data) {
    await initialize();
    if (unavailable) throw Error('Reload this page to restart the game.');
    // Web Locks make a stored-save read, Python operation and save write one
    // cross-tab transaction. Without them, keep a clearly unsaved session.
    const synchronized = !!navigator.locks;
    const run = async () => {
      let save = null, persistent = synchronized && !storageDisabled;
      if (persistent) {
        try { const stored = localStorage.getItem(key); save = stored ? JSON.parse(stored) : null; }
        catch (error) {
          if (error instanceof SyntaxError) throw Error('The browser save could not be opened. Back it up before replacing it.');
          persistent = false;
          storageDisabled = true;
        }
      }
      const id = ++serial;
      const response = await new Promise((resolve, reject) => {
        pending.set(id, {resolve, reject});
        worker.postMessage({id, payload: {url, data, save, persistent}});
      });
      if (response.failed) throw Error(response.result.error);
      if (persistent && response.save && mutating.has(data?.action)) {
        try { localStorage.setItem(key, JSON.stringify(response.save)); }
        catch (_) {
          storageDisabled = true;
          response.result.save_enabled = false;
          response.result.warning = 'Automatic save failed. Use Export save before closing this page.';
        }
      }
      if (storageDisabled && 'save_enabled' in response.result) {
        response.result.save_enabled = false;
        response.result.warning = 'Automatic save is unavailable. Use Export save before closing this page.';
      }
      return response.result;
    };
    return synchronized ? navigator.locks.request(key, run) : run();
  }
  return {
    async request(url, data) {
      if (browser) return local(url, data);
      const response = await fetch(url, data ? {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data)} : {});
      const result = await response.json();
      if (!response.ok) throw Error(result.error || 'The request failed.');
      return result;
    }
  };
})();
