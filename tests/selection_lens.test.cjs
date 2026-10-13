const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = vm.createContext({});
vm.runInContext(fs.readFileSync('selection-lens.js','utf8'),context);
function view(first,second) { return context.selectionLensView(first,second); }

test('readable crop preserves the original Level 3 geometry and leaf density at deeper levels',()=>{
  assert.equal(context.readableLensFraction(3),.816/3);
  assert.equal(context.readableLensFraction(1),1);
  for(const level of [2,3,4,5,6,9,12]) {
    assert.ok(Math.abs(context.readableLensFraction(level)*3**level-7.344)<1e-10);
  }
});
test('independently zoomed chained crops map correctly and stay inside their parents',()=>{
  for(const f of [.01,.272,.8,1]) for(const sf of [.05,.272,1]) {
    const center={x:f/2,y:1-f/2},second={x:sf/2,y:1-sf/2};
    const result=context.selectionLensView(center,second,f,sf),half=result.fraction/2;
    assert.ok(Math.abs(result.fraction-f*sf)<1e-12);
    assert.ok(result.u-half>=-1e-12&&result.v+half<=1+1e-12);
    assert.ok(result.u-half>=center.x-f/2-1e-12);
  }
});

test('one magnifier retains its existing centered crop and scale', () => {
  const result = view({x:.3,y:.7});
  assert.equal(result.u,.3); assert.equal(result.v,.7);
  assert.equal(result.fraction,.816/3);
});
test('shared read-only camera maps the selected world center to its window center',()=>{
  for(const side of [200,400,900]) for(const center of [{x:.5,y:.5},{x:.136,y:.864}]) {
    const camera=context.selectionLensCamera(center,side);
    assert.ok(Math.abs(camera.x+center.x*camera.size-side/2)<1e-9);
    assert.ok(Math.abs(camera.y+center.y*camera.size-side/2)<1e-9);
    assert.equal(camera.detailThreshold,24);
  }
});
test('second magnifier selects within the first crop, retaining the first center when centered', () => {
  const fraction = .816/3;
  const centered = view({x:.3,y:.7},{x:.5,y:.5});
  assert.equal(centered.u,.3); assert.equal(centered.v,.7);
  assert.equal(centered.fraction,fraction*fraction);
  const shifted = view({x:.3,y:.7},{x:.8,y:.2});
  assert.ok(Math.abs(shifted.u-(.3+.3*fraction))<1e-12);
  assert.ok(Math.abs(shifted.v-(.7-.3*fraction))<1e-12);
});
test('chained corner crops remain contained in both their parent and the whole board', () => {
  const fraction = .816/3;
  for (const x of [fraction/2,1-fraction/2]) {
    for (const y of [fraction/2,1-fraction/2]) {
      for (const sx of [fraction/2,1-fraction/2]) {
        for (const sy of [fraction/2,1-fraction/2]) {
          const result = view({x,y},{x:sx,y:sy}), half=result.fraction/2;
          assert.ok(result.u-half>=x-fraction/2-1e-12);
          assert.ok(result.u+half<=x+fraction/2+1e-12);
          assert.ok(result.v-half>=y-fraction/2-1e-12);
          assert.ok(result.v+half<=y+fraction/2+1e-12);
          assert.ok(result.u-half>=-1e-12 && result.u+half<=1+1e-12);
          assert.ok(result.v-half>=-1e-12 && result.v+half<=1+1e-12);
        }
      }
    }
  }
});
test('workspace packing maximizes square size and stays inside desktop and landscape windows', () => {
  for(const [width,height] of [[1904,920],[828,250],[374,660]]) {
    for(const count of [1,2,3,5]) {
      const fit=context.fitBoardWorkspace(width,height,count);
      assert.ok(fit.side*fit.columns+12*(fit.columns-1)<=width+1e-9);
      assert.ok(fit.side*fit.rows+12*(fit.rows-1)<=height+1e-9);
      for(let columns=1;columns<=count;columns++) {
        const rows=Math.ceil(count/columns);
        const possible=Math.min((width-12*(columns-1))/columns,(height-12*(rows-1))/rows);
        assert.ok(fit.side>=possible-1e-9);
      }
    }
  }
});
test('touch pointer dragging clamps the outline and blur stops pending movement',()=>{
  const frames=new Map(), events={}, changes=[];let next=0,focusOptions;
  const lens={style:{},addEventListener(type,fn){events[type]=fn;},focus(options){focusOptions=options;},setPointerCapture(id){this.capture=id;}};
  const stage={clientWidth:300,clientHeight:300,getBoundingClientRect:()=>({left:10,top:20,width:300,height:300})};
  const windowEvents={};
  const runtime=vm.createContext({window:{addEventListener(type,fn){windowEvents[type]=fn;}},ResizeObserver:class{observe(){}},
    requestAnimationFrame(fn){frames.set(++next,fn);return next;},cancelAnimationFrame(id){frames.delete(id);}});
  vm.runInContext(fs.readFileSync('selection-lens.js','utf8'),runtime);
  const control=runtime.createSelectionLens(stage,lens,{onChange:point=>changes.push(point)});
  let prevented=false;
  events.pointerdown({button:0,pointerType:'touch',pointerId:7,clientX:160,clientY:170,preventDefault(){prevented=true;}});
  events.pointermove({pointerId:7,clientX:500,clientY:500});
  let time=0;
  for(let n=0;n<50&&frames.size;n++){const [id,fn]=frames.entries().next().value;frames.delete(id);fn(time+=16);}
  assert.equal(prevented,true);assert.equal(lens.capture,7);
  assert.equal(focusOptions.preventScroll,true);
  assert.ok(control.center.x<=1-.272/2&&control.center.y<=1-.272/2);
  assert.ok(control.center.x>.8&&control.center.y>.8);
  events.pointermove({pointerId:7,clientX:30,clientY:30});
  assert.ok(frames.size>0);
  const last=changes.length;windowEvents.blur();
  assert.equal(frames.size,0);assert.equal(changes.length,last);
});

test('pointer positioning, independent zoom and clamping preserve a valid crop',()=>{
  const events={},stageEvents={};
  const lens={style:{},contains:()=>false,addEventListener(type,fn){events[type]=fn;},focus(){},setPointerCapture(){}};
  const stage={clientWidth:400,clientHeight:400,getBoundingClientRect:()=>({left:10,top:20,width:400,height:400}),addEventListener(type,fn){stageEvents[type]=fn;}};
  const runtime=vm.createContext({window:{addEventListener(){}},ResizeObserver:class{observe(){}},requestAnimationFrame(){return 1;},cancelAnimationFrame(){}});
  vm.runInContext(fs.readFileSync('selection-lens.js','utf8'),runtime);
  const control=runtime.createSelectionLens(stage,lens,{keyboard:false,clickToPosition:true});
  stageEvents.click({clientX:410,clientY:420,target:{closest:()=>null}});
  assert.equal(control.center.x,1-.272/2);
  control.setFraction(1);assert.equal(control.center.x,.5);assert.equal(control.center.y,.5);
  assert.equal(lens.style.width,'100%');
  control.setFraction(.01);stageEvents.click({clientX:10,clientY:20,target:{closest:()=>null}});
  assert.equal(control.center.x,.005);assert.equal(control.center.y,.005);
  stageEvents.click({clientX:300,clientY:300,target:{closest:()=>({})}});
  assert.equal(control.center.x,.005,'zoom buttons must not reposition the lens');
  control.setFraction(0);assert.equal(control.fraction,.01);
});

test('zoom is gradual and frame-timed, ignores key-repeat, settles on release and cancels on blur',()=>{
  function run(repeats) {
    const frames=new Map(),events={},windowEvents={};let id=0,time=0;
    const lens={style:{},addEventListener(type,fn){events[type]=fn;},focus(){},setPointerCapture(){}};
    const stage={clientWidth:400,clientHeight:400};
    const runtime=vm.createContext({window:{addEventListener(type,fn){windowEvents[type]=fn;}},ResizeObserver:class{observe(){}},
      requestAnimationFrame(fn){frames.set(++id,fn);return id;},cancelAnimationFrame(key){frames.delete(key);}});
    vm.runInContext(fs.readFileSync('selection-lens.js','utf8'),runtime);
    const control=runtime.createSelectionLens(stage,lens,{});
    const tick=()=>{const [key,fn]=frames.entries().next().value;frames.delete(key);fn(time+=16);};
    control.zoomKeyDown('ZoomIn',.01);assert.equal(control.fraction,.816/3,'keydown must not jump the scale');
    let previous=control.fraction;
    for(let n=0;n<25;n++) {
      if(repeats) control.zoomKeyDown('ZoomIn',.01);
      tick();assert.ok(control.fraction<previous);assert.ok(control.fraction/previous>.95);previous=control.fraction;
    }
    const held=control.fraction;control.keyUp('ZoomIn');
    for(let n=0;n<100&&frames.size;n++) tick();
    assert.equal(frames.size,0,'release must settle and stop requesting frames');
    const released=control.fraction;assert.ok(released<held&&released/held>.8);
    control.zoomKeyDown('ZoomOut',.01);tick();windowEvents.blur();
    assert.equal(frames.size,0);
    return released;
  }
  assert.ok(Math.abs(run(false)-run(true))<1e-12,'OS repeat must not change zoom speed');
});
