const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function transport({failWrite = false, locks = true, stored = null} = {}) {
  const sent = [], writes = [], lockNames = [];
  let instance;
  const window = {};
  const context = vm.createContext({window, URL, Map, Set, Error,
    document: {baseURI:'https://example.test/Fifteen/', documentElement:{dataset:{transport:'browser'}}, getElementById(){return {}; }},
    navigator: {locks: locks ? {async request(key, run) { lockNames.push(key); return run(); }} : undefined},
    localStorage: {getItem(){return stored;}, setItem(key, value){if (failWrite) throw Error('quota'); stored=value; writes.push({key,value});}},
    Worker: class {
      constructor(url){this.url=String(url); instance=this; queueMicrotask(()=>this.onmessage({data:{ready:true}}));}
      postMessage(message){
        sent.push(message);
        const result = message.payload.data ? {save_enabled:message.payload.persistent, ply:1} : {save_enabled:message.payload.persistent, ply:0};
        const save = message.payload.data ? {revision:1,game:{moves:[[5]]}} : null;
        queueMicrotask(()=>this.onmessage({data:{id:message.id,state:{result,save}}}));
      }
    }
  });
  vm.runInContext(fs.readFileSync('relay-transport.js','utf8'),context);
  return {api:window.RelayTransport,sent,writes,lockNames,get worker(){return instance;}};
}

test('static transport resolves worker under the project prefix and serializes storage', async () => {
  const h=transport();
  await h.api.request('/api/action',{action:'play'});
  assert.equal(h.worker.url,'https://example.test/Fifteen/python-worker.js?game=relay&ui=collection');
  assert.equal(h.lockNames[0],'fifteen-relay-save:/Fifteen/');
  assert.equal(h.writes.length,1);
  await h.api.request('/api/view');
  assert.equal(h.writes.length,1);
  assert.equal(h.sent[1].payload.save.revision,1);
});

test('storage failure keeps an exportable session without replaying an older save', async () => {
  const h=transport({failWrite:true,stored:'{"revision":0,"game":{}}'});
  const result=await h.api.request('/api/action',{action:'play'});
  assert.equal(result.save_enabled,false);
  assert.match(result.warning,/Export save/);
  await h.api.request('/api/export');
  assert.equal(h.sent[1].payload.save,null);
  assert.equal(h.sent[1].payload.persistent,false);
});

test('without cross-tab locks browser play is an explicit unsaved session', async () => {
  const h=transport({locks:false});
  const result=await h.api.request('/api/action',{action:'play'});
  assert.equal(result.save_enabled,false);
  assert.equal(h.writes.length,0);
});

test('corrupt browser storage is preserved and never submitted or overwritten', async () => {
  const h=transport({stored:'not json'});
  await assert.rejects(h.api.request('/api/view'),/Back it up/);
  assert.equal(h.sent.length,0);
  assert.equal(h.writes.length,0);
});

test('both game entry pages resolve assets at the collection root', () => {
  for(const path of ['tic-tac-toe/index.html','relay/index.html']){
    const page=fs.readFileSync(path,'utf8');
    assert.match(page,/<base href="\.\.\/">/);
    assert.doesNotMatch(page,/(?:src|href)="\/(?!\/)/);
  }
  const index=fs.readFileSync('index.html','utf8');
  assert.match(index,/href="tic-tac-toe\/"/);
  assert.match(index,/href="relay\/"/);
  const version=fs.readFileSync('version.py','utf8').match(/__version__ = "([^"]+)"/)[1];
  assert.ok(index.includes(`v${version}`));
});
