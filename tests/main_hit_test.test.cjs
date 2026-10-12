const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function harness({allowed=true,mark='',reject=false}={}) {
  const inspected=[],played=[];let handler;
  const context=vm.createContext({current:{levels:6,computer_turn:false,over:false},busy:false,
    boardCamera:{x:-200,y:-100,size:800},
    mainViewport:{getBoundingClientRect:()=>({left:40,top:60}),addEventListener(type,fn){handler=fn;}},
    async requestPresentation(payload){
      inspected.push(payload);
      if(reject) throw Error('The position changed.');
      return {picker:{children:Array.from({length:9},(_,index)=>({kind:'cell',path:[...payload.path,index],allowed,mark}))}};
    },playNode(node){played.push(node);}});
  vm.runInContext(fs.readFileSync('board-ink.js','utf8'),context);
  const source=fs.readFileSync('magnifier-game.js','utf8');
  const start=source.indexOf("  mainViewport.addEventListener('click'");
  const end=source.indexOf("  document.addEventListener('wheel'",start);
  vm.runInContext(source.slice(start,end),context);
  const click=(extra={})=>handler({clientX:240,clientY:360,defaultPrevented:false,target:{closest:()=>null},...extra});
  return {click,inspected,played,context};
}
test('coarse-board clicks use the existing inspector and play its permitted cell',async()=>{
  const h=harness();await h.click();
  assert.equal(h.inspected[0].action,'inspect');
  assert.deepEqual(Array.from(h.inspected[0].path),Array(5).fill(4));
  assert.deepEqual(Array.from(h.played[0].path),Array(6).fill(4));
});
test('server permissions and occupied marks prevent fallback placements',async()=>{
  for(const fixture of [{allowed:false},{mark:'O'}]) {
    const h=harness(fixture);await h.click();assert.equal(h.played.length,0);
  }
});
test('native buttons, suppressed drags, outside points and busy turns do not issue fallback actions',async()=>{
  for(const extra of [{target:{closest:()=>({})}},{defaultPrevented:true},{clientX:-400}]) {
    const h=harness();await h.click(extra);assert.equal(h.inspected.length,0);
  }
  const h=harness();h.context.busy=true;await h.click();assert.equal(h.inspected.length,0);
});
test('an inspection invalidated by another move or reset cannot place a mark',async()=>{
  const h=harness({reject:true});await h.click();assert.equal(h.played.length,0);
});
