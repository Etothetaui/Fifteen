const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function probe(levels,routing,options={}) {
  const rects=[];
  const ctx={setTransform(){},clearRect(){},fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},setLineDash(){},strokeRect(x,y,w,h){rects.push({x,y,w,h,color:this.strokeStyle});}};
  const canvas={width:400,height:400,getBoundingClientRect:()=>({width:400,height:400}),getContext:()=>ctx};
  const context=vm.createContext({window:{devicePixelRatio:1},visualPosition:()=>[0,0]});
  vm.runInContext(fs.readFileSync('board-ink.js','utf8'),context);
  const routes=Array.from({length:levels-1},(_,index)=>Array(levels-index-2).fill(0));
  context.paintBoardInk(canvas,{state:{levels,forced:Array(levels-1).fill(0),history:[],over:false,routing_areas:routes},fullBoard:true,routing,...options});
  return {rects,context};
}
test('routing draws every non-root scope and alternates colors at L6 and beyond',()=>{
  for(const levels of [4,6,8,12]) {
    const {rects}=probe(levels,true);
    const routes=rects.filter(r=>['#a77cbd','#683980'].includes(r.color));
    assert.equal(routes.length,levels-2);
    routes.forEach((r,i)=>{
      assert.equal(r.color,i%2===0 ? '#a77cbd':'#683980');
      assert.ok(r.w>0 && r.h>0,'tiny rectangles must not invert');
    });
  }
});
test('routing switch suppresses purple but retains blue permissions',()=>{
  const {rects}=probe(6,false);
  assert.equal(rects.filter(r=>['#a77cbd','#683980'].includes(r.color)).length,0);
  assert.equal(rects.filter(r=>r.color==='#376ca6').length,1);
});
test('playable mode zero uses the same optional routing scopes as the overview',()=>{
  const {rects}=probe(6,true,{fullBoard:false,blue:true,camera:{size:400,x:0,y:0,detailThreshold:24},frames:true});
  assert.equal(rects.filter(r=>['#a77cbd','#683980'].includes(r.color)).length,4);
  assert.ok(rects.some(r=>r.color==='#376ca6'));
});
test('layer widths depend on depth and available pixels without a level lookup table',()=>{
  const {context}=probe(1,false);
  let previous=0;
  for(let level=1;level<=20;level++) {
    const stroke=context.boardLayerStroke(level,100);
    assert.ok(Number.isFinite(stroke)&&stroke>=previous&&stroke<=12);
    previous=stroke;
  }
  assert.ok(context.boardLayerStroke(10,5)<context.boardLayerStroke(10,100));
});
test('point hit-testing handles deep-board corners without truncating the last cells',()=>{
  const {context}=probe(1,false);
  for(const depth of [1,4,6,12,14]) {
    assert.deepEqual(Array.from(context.boardPathAt(1,1,depth)),Array(depth).fill(8));
    assert.deepEqual(Array.from(context.boardPathAt(0,0,depth)),Array(depth).fill(0));
    assert.deepEqual(Array.from(context.boardPathAt(.5,.5,depth)),Array(depth).fill(4));
  }
});
