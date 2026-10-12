// Main-game layout. Shared movement, drawing, renderer and Python rules are reused.
(() => {
  const $=id=>document.getElementById(id), workspace=$('main-board-workspace'), settings=$('settings-dialog');
  const mainViewport=$('board-viewport'), fraction=.816/3;
  let count=0,routing=false,autoLegal='off',lastMoveCount=0,current=null,results=[],overviewKey='',lastGeneration=-1,serial=0,first,second;
  const mainInk=document.createElement('canvas'); mainInk.className='lab-ink'; mainInk.setAttribute('aria-hidden','true'); mainViewport.append(mainInk);
  $('game-brand').append(...document.querySelector('.sidebar header').children);
  $('game-status').append(document.querySelector('.status-wrap'),document.querySelector('.game-top'));
  // Keep the explicit navigation button beside settings rather than spending
  // a whole window row on a single button, especially in phone landscape.
  $('game-header').append($('game-tools'));
  document.querySelector('.sidebar header').remove();
  $('settings-content').append(document.querySelector('.sidebar'),document.querySelector('.navigation-controls'));
  boardCamera.fitPadding=0;
  boardCamera.detailThreshold=24;
  const previousChange=boardCamera.onChange;
  function ink(canvas,options={}) {paintBoardInk(canvas,{state:current,results,threshold:detailThreshold,routing,...options});}
  function paintMain() {ink(mainInk,{camera:boardCamera,frames:true,blue:count===0});}
  function paintMiddle() {
    if(count!==2 || !first) return;
    const side=$('middle-lens-stage').clientWidth;
    if(side) ink($('middle-lens-board'),{camera:selectionLensCamera(first.center,side,fraction),readOnly:true,frames:true});
  }
  function redraw() {
    if(!current) return;
    paintMain(); paintMiddle();
    if(count) {
      const key=JSON.stringify([generation,current.history.length,results,routing,$('lens-stage').clientWidth]);
      if(key!==overviewKey) {overviewKey=key;ink($('lens-overview'),{fullBoard:true});}
    }
  }
  function sync(center=first?.center) {
    if(!current || !count || !center || !mainViewport.clientWidth) return;
    const view=selectionLensView(center,count===2 ? second?.center || {x:.5,y:.5} : null,fraction);
    boardCamera.maxScaleFloor=1/view.fraction;
    boardCamera.detailThreshold=12;
    boardCamera.detailCellPixels=Math.max(44,mainViewport.clientWidth/view.fraction/3**current.levels);
    boardCamera.navigate({u:view.u,v:view.v,pixels:mainViewport.clientWidth/view.fraction});
  }
  boardCamera.onChange=()=>{previousChange?.();paintMain();};
  boardCamera.inputBlocked=()=>count>0 || settings.open;
  first=createSelectionLens($('lens-stage'),$('selection-lens'),{enabled:()=>count>0&&!settings.open,onChange:center=>{sync(center);paintMiddle();}});
  second=createSelectionLens($('middle-lens-stage'),$('second-selection-lens'),{enabled:()=>count===2&&!settings.open,onChange:()=>sync()});
  function fit() {
    // Phone portrait views keep full-width boards and scroll vertically;
    // squeezing three boards into one screen would make the playable cells tiny.
    const stacked=innerWidth<=650 && innerHeight>innerWidth && count>0;
    const packing=stacked ? {side:Math.max(1,workspace.clientWidth-16),columns:1,rows:count+1}
      : fitBoardWorkspace(workspace.clientWidth-16,workspace.clientHeight-16,count+1);
    workspace.style.gridTemplateColumns=`repeat(${packing.columns},${packing.side}px)`;
    workspace.style.gridTemplateRows=`repeat(${packing.rows},${packing.side}px)`;
    boardCamera.resize(); sync(); redraw();
  }
  new ResizeObserver(fit).observe(workspace);
  new ResizeObserver(()=>{overviewKey='';redraw();sync();}).observe(mainViewport);
  new ResizeObserver(()=>{overviewKey='';redraw();}).observe($('lens-stage'));
  $('magnifier-count').querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>{
    first.stop();second.stop();count=Number(button.dataset.count);
    selectToggleOption($('magnifier-count').querySelectorAll('button'),button);
    document.body.dataset.magnifiers=String(count);overviewKey='';
    $('camera-controls').hidden=count>0;
    boardCamera.maxScaleFloor=0;boardCamera.detailThreshold=24;
    if(!count) boardCamera.reset();
    fit();
  }));
  $('routing-outlines').querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>{
    routing=button.dataset.routing==='on';selectToggleOption($('routing-outlines').querySelectorAll('button'),button);overviewKey='';redraw();
  }));
  $('auto-legal').querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>{
    autoLegal=button.dataset.autoLegal;selectToggleOption($('auto-legal').querySelectorAll('button'),button);
  }));
  $('settings-open').onclick=()=>{first.stop();second.stop();boardCamera.stopInput();settings.showModal();};
  $('settings-close').onclick=()=>settings.close();
  function showLegalRegion() {
    if(!current) return;
    const b=boardRegionBounds(current.forced), center={x:b.left+b.size/2,y:b.top+b.size/2};
    if(!count) boardCamera.navigate({u:center.x,v:center.y,pixels:mainViewport.clientWidth/b.size});
    else {
      first.moveTo(center);
      if(count===2) {const a=first.center;second.moveTo({x:.5+(center.x-a.x)/fraction,y:.5+(center.y-a.y)/fraction});}
    }
  }
  $('show-legal').onclick=showLegalRegion;
  mainViewport.addEventListener('click',async event=>{
    if(!current || busy || current.computer_turn || current.over || event.defaultPrevented || event.target.closest('button')) return;
    // Coarse regions have no leaf buttons. Hit-test presentation coordinates,
    // then obtain the real leaf permissions through the existing Python picker.
    // Native buttons keep their existing click path; no legality is inferred here.
    const rect=mainViewport.getBoundingClientRect();
    const u=(event.clientX-rect.left-boardCamera.x)/boardCamera.size;
    const v=(event.clientY-rect.top-boardCamera.y)/boardCamera.size;
    if(u<0 || u>1 || v<0 || v>1) return;
    const path=boardPathAt(u,v,current.levels);
    try {
      const response=await requestPresentation({action:'inspect',path:path.slice(0,-1)});
      const node=response.picker.children[path.at(-1)];
      if(node?.kind==='cell' && node.allowed && !node.mark) playNode(node);
    } catch(_) {} // A concurrent reset/move invalidates the existing request guard.
  });
  document.addEventListener('wheel',event=>{if(count && mainViewport.contains(event.target)){event.preventDefault();event.stopImmediatePropagation();}}, {capture:true,passive:false});
  presentationObserver=async next=>{
    current=next;
    if(lastGeneration!==generation) {lastGeneration=generation;lastMoveCount=next.history.length;results=[];overviewKey='';second.moveTo({x:.5,y:.5});first.moveTo({x:.5,y:.5});if(!count) boardCamera.reset();}
    redraw();sync();
    // Reuse explicit navigation only for a newly played move, never for a
    // presentation refresh or a new game. Keep the final position on game over.
    const moved=next.history.length>lastMoveCount;lastMoveCount=next.history.length;
    if(moved && !next.over && (autoLegal==='all' || (autoLegal==='human' && !next.computer_turn))) showLegalRegion();
    const request=++serial;
    try {const response=await requestPresentation({action:'overview'});if(request===serial){results=response.results;redraw();}} catch(_) {}
  };
  fit();if(state) presentationObserver(state);
})();
