const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function harness(count) {
  const calls=[],elements={
    'lens-stage':{clientWidth:400},'middle-lens-stage':{clientWidth:400},
    'lens-overview':{name:'overview'},'middle-lens-board':{name:'middle'}};
  const runtime=vm.createContext({$:id=>elements[id],count,current:{levels:6,history:[]},results:[],detailThreshold:96,
    routing:false,candidate:null,interactionRevision:1,boardFocusPath:'4/4/4/4/5/5',generation:1,overviewKey:'',
    mainInk:{name:'main'},boardCamera:{},first:{center:{x:.5,y:.5},fraction:.01},
    selectionLensCamera:()=>({}),paintBoardInk(canvas,options){calls.push({name:canvas.name,options});}});
  const main=fs.readFileSync('magnifier-game.js','utf8');
  vm.runInContext(main.slice(main.indexOf('  function ink('),main.indexOf('  function sync(')),runtime);
  return {runtime,calls};
}
test('an off-crop selector remains drawn in the overview and every magnified view',()=>{
  for(const count of [0,1,2]) {
    const h=harness(count);h.runtime.redraw();
    for(const name of count===2?['overview','middle','main']:count===1?['overview','main']:['main']) {
      const call=h.calls.find(item=>item.name===name);
      assert.deepEqual(Array.from(call.options.selectedPath||[]),[4,4,4,4,5,5],name+' must display the world selector');
    }
    h.calls.length=0;h.runtime.boardFocusPath='4/4/4/4/5/6';h.runtime.redraw();
    if(count) assert.ok(h.calls.some(call=>call.name==='overview'),'moving only the selector must invalidate cached overview ink');
  }
});
