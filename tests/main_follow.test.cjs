const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function harness(count) {
  const moves=[],zooms=[],camera=[];
  const lens=name=>({fraction:name==='first'?.272:.18,center:{x:.5,y:.5},
    setFraction(value){zooms.push([name,value]);this.fraction=value;},
    moveTo(center){moves.push([name,center]);this.center=center;}});
  const context=vm.createContext({current:{forced:[0,8,4]},count,first:lens('first'),second:lens('second'),
    mainViewport:{clientWidth:600},boardCamera:{size:2400,maxScaleFloor:4,navigate(view){camera.push(view);}}});
  const web=fs.readFileSync('web.js','utf8');
  vm.runInContext(web.slice(web.indexOf('function visualPosition('),web.indexOf('function availableCells(')),context);
  vm.runInContext(fs.readFileSync('board-ink.js','utf8'),context);
  const source=fs.readFileSync('magnifier-game.js','utf8');
  vm.runInContext(source.slice(source.indexOf('  function positionView('),source.indexOf('  function readableDetail(')),context);
  return {context,moves,zooms,camera};
}
test('automatic following preserves camera scale and both independently selected magnifier zooms',()=>{
  for(const count of [0,1,2]) {
    const h=harness(count);h.context.showLegalRegion(false);
    assert.equal(h.zooms.length,0);
    assert.equal(h.context.first.fraction,.272);assert.equal(h.context.second.fraction,.18);
    if(count===0) assert.equal(h.camera[0].pixels,2400);
    else assert.equal(h.moves.length,count);
  }
});
test('explicit fitting continues to fit the full legal region',()=>{
  for(const count of [0,1,2]) {
    const h=harness(count);h.context.showLegalRegion();
    if(count===0) assert.equal(h.camera[0].pixels,600*27);
    else {assert.equal(h.context.first.fraction,1/27);if(count===2) assert.equal(h.context.second.fraction,1);}
  }
});
