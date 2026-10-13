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

test('destination outline maps into overview and magnified views, including root freedom and tiny regions',()=>{
  for(const destination of [[],[0,0,0,0,0],Array(12).fill(0)]) {
    for(const camera of [null,{size:10800,x:-1200,y:-800}]) {
      const {rects}=probe(6,false,{camera,destination});
      const outline=rects.filter(r=>r.color==='#a5790c');assert.equal(outline.length,1);
      assert.ok(outline[0].w>0&&outline[0].h>0);
    }
  }
  assert.equal(probe(6,false).rects.some(r=>r.color==='#a5790c'),false);
});

test('selector arrows move exactly one grid square across recursive boundaries without wrapping',()=>{
  const context=vm.createContext({});
  const web=fs.readFileSync('web.js','utf8');
  vm.runInContext(web.slice(web.indexOf('function visualPosition('),web.indexOf('function availableCells(')),context);
  vm.runInContext(fs.readFileSync('board-ink.js','utf8'),context);
  for(const levels of [1,3,6,12]) {
    const center=Array(levels).fill(4),position=context.visualPosition(center);
    for(const [key,dr,dc] of [['ArrowLeft',0,-1],['ArrowRight',0,1],['ArrowUp',-1,0],['ArrowDown',1,0]]) {
      assert.deepEqual(Array.from(context.visualPosition(context.boardArrowPath(center,key))),[position[0]+dr,position[1]+dc]);
    }
    assert.equal(context.boardArrowPath(Array(levels).fill(0),'ArrowLeft'),null);
    assert.equal(context.boardArrowPath(Array(levels).fill(8),'ArrowRight'),null);
    const start=context.boardPathAt((2+.5)/3**levels,(1+.5)/3**levels,levels);
    if(levels>1) assert.deepEqual(Array.from(context.visualPosition(context.boardArrowPath(start,'ArrowRight'))),[1,3]);
  }
});

test('selector respects Python supplied playable scope, independent of any viewport',()=>{
  const context=vm.createContext({});const web=fs.readFileSync('web.js','utf8');
  vm.runInContext(web.slice(web.indexOf('function visualPosition('),web.indexOf('function availableCells(')),context);
  vm.runInContext(fs.readFileSync('board-ink.js','utf8'),context);
  for(const depth of [2,4,6,12]) {
    const scope=Array(depth-1).fill(4),first=[...scope,0],last=[...scope,8];
    assert.equal(context.boardArrowPath(first,'ArrowLeft',scope),null);
    assert.equal(context.boardArrowPath(first,'ArrowUp',scope),null);
    assert.equal(context.boardArrowPath(last,'ArrowRight',scope),null);
    assert.equal(context.boardArrowPath(last,'ArrowDown',scope),null);
    assert.deepEqual(Array.from(context.boardArrowPath(first,'ArrowRight',scope)),[...scope,1]);
    assert.deepEqual(Array.from(context.boardClampSelector(Array(depth).fill(0),scope)),first);
    assert.deepEqual(Array.from(context.boardClampSelector(Array(depth).fill(8),scope)),last);
  }
});
