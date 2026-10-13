const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function harness() {
  const played=[],requests=[];
  const runtime=vm.createContext({previewSerial:0,candidate:null,interactionRevision:1,redraw(){},
    state:{computer_turn:false,over:false,levels:4},busy:false,current:{forced:[],levels:4},
    send:payload=>played.push(payload),ink(){},selectionLensCamera:()=>({}),boardRegionBounds:()=>({left:0,top:0,size:1}),
    requestPresentation(payload){return new Promise((resolve,reject)=>requests.push({payload,resolve,reject}));}});
  const web=fs.readFileSync('web.js','utf8');
  vm.runInContext(web.slice(web.indexOf('function pathText('),web.indexOf('function renderPicker(')),runtime);
  const main=fs.readFileSync('magnifier-game.js','utf8');
  vm.runInContext(main.slice(main.indexOf('  function closePreview('),main.indexOf("  $('move-input').querySelectorAll")),runtime);
  const node={kind:'cell',path:[1,2,3,4],allowed:true};
  return {runtime,requests,played,node};
}
const result={forced:[2,3,4],closures:[],outcome:null};
test('destination inspection never plays until explicitly committed, and commits once',async()=>{
  const h=harness(),pending=h.runtime.previewNode(h.node);
  assert.equal(h.played.length,0);assert.equal(h.runtime.candidate,null);
  assert.deepEqual(Array.from(h.requests[0].payload.path),h.node.path);
  h.requests[0].resolve(result);await pending;
  assert.deepEqual(Array.from(h.runtime.candidate.destination),result.forced);
  h.runtime.commitCandidate();h.runtime.commitCandidate();
  assert.equal(h.played.length,1);assert.equal(h.runtime.candidate,null);
});
test('obsolete preview replies cannot replace a newer selection',async()=>{
  const h=harness(),first=h.runtime.previewNode(h.node),second=h.runtime.previewNode({...h.node,path:[1,2,3,5]});
  h.requests[1].resolve(result);await second;
  h.requests[0].resolve(result);await first;
  h.runtime.commitCandidate();assert.deepEqual(Array.from(h.played[0].square),[1,2,3,5]);
});
test('move/reset revisions, close, and busy turns prevent stale candidate commitment',async()=>{
  for(const change of ['revision','close','busy']) {
    const h=harness(),pending=h.runtime.previewNode(h.node);
    h.requests[0].resolve(result);await pending;
    if(change==='revision') h.runtime.interactionRevision++;
    if(change==='close') h.runtime.closePreview();
    if(change==='busy') h.runtime.busy=true;
    h.runtime.commitCandidate();assert.equal(h.played.length,0);
  }
  const h=harness(),pending=h.runtime.previewNode(h.node);h.runtime.interactionRevision++;
  h.requests[0].resolve(result);await pending;h.runtime.commitCandidate();assert.equal(h.played.length,0);
});
test('last-move inspection follows the opponent seat, including while a reply is pending',()=>{
  const source=fs.readFileSync('magnifier-game.js','utf8');
  const code=source.slice(source.indexOf('  function lastInspectableMove('),source.indexOf("  $('last-move-view').onclick"));
  const runtime=vm.createContext({current:{players:{X:'Human',O:'Computer'},history:[{mark:'X',square:1},{mark:'O',square:2},{mark:'X',square:3}]}});
  vm.runInContext(code,runtime);
  assert.equal(runtime.lastInspectableMove().square,2);
  runtime.current.players={X:'Computer',O:'Human'};assert.equal(runtime.lastInspectableMove().square,3);
  runtime.current.players={X:'Human',O:'Human'};assert.equal(runtime.lastInspectableMove().square,3);
  runtime.current.players={X:'Human',O:'Computer'};runtime.current.history=[{mark:'X',square:1}];
  assert.equal(runtime.lastInspectableMove(),undefined);
});
