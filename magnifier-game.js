// Main-game layout. Shared movement, drawing, renderer and Python rules are reused.
(() => {
  const $=id=>document.getElementById(id), workspace=$('main-board-workspace'), settings=$('settings-dialog');
  const mainViewport=$('board-viewport'), fraction=.816/3;
  let count=0,routing=false,autoLegal='off',lastMoveCount=0,current=null,results=[],overviewKey='',lastGeneration=-1,serial=0,first,second;
  let returnView=null,previewMode=false,candidate=null,previewSerial=0;
  const mainInk=document.createElement('canvas'); mainInk.className='lab-ink'; mainInk.setAttribute('aria-hidden','true'); mainViewport.append(mainInk);
  $('game-brand').append(...document.querySelector('.sidebar header').children);
  $('game-status').append(document.querySelector('.status-wrap'),document.querySelector('.game-top'));
  // Keep the explicit navigation button beside settings rather than spending
  // a whole window row on a single button, especially in phone landscape.
  $('game-header').append($('game-tools'));
  document.querySelector('.sidebar header').remove();
  $('settings-content').append(document.querySelector('.sidebar'),document.querySelector('.navigation-controls'));
  boardCamera.fitPadding=0;
  showMoveSelector=true;
  boardCamera.detailThreshold=24;
  const previousChange=boardCamera.onChange;
  function ink(canvas,options={}) {paintBoardInk(canvas,{state:current,results,threshold:detailThreshold,routing,selectedPath:boardFocusPath?boardFocusPath.split('/').map(Number):null,destination:candidate?.revision===interactionRevision?candidate.destination:null,...options});}
  function paintMain() {ink(mainInk,{camera:boardCamera,frames:true,blue:count===0});}
  function paintMiddle() {
    if(count!==2 || !first) return;
    const side=$('middle-lens-stage').clientWidth;
    if(side) ink($('middle-lens-board'),{camera:selectionLensCamera(first.center,side,first.fraction),readOnly:true,frames:true});
  }
  function redraw() {
    if(!current) return;
    paintMain(); paintMiddle();
    if(count) {
      const key=JSON.stringify([generation,current.history.length,results,routing,boardFocusPath,candidate?.destination,$('lens-stage').clientWidth]);
      if(key!==overviewKey) {overviewKey=key;ink($('lens-overview'),{fullBoard:true});}
    }
  }
  function sync(center=first?.center) {
    if(!current || !count || !center || !mainViewport.clientWidth) return;
    const view=selectionLensView(center,count===2 ? second?.center || {x:.5,y:.5} : null,first?.fraction || fraction,second?.fraction || fraction);
    boardCamera.maxScaleFloor=1/view.fraction;
    boardCamera.detailThreshold=12;
    boardCamera.detailCellPixels=Math.max(44,mainViewport.clientWidth/view.fraction/3**current.levels);
    boardCamera.navigate({u:view.u,v:view.v,pixels:mainViewport.clientWidth/view.fraction});
  }
  boardCamera.onChange=()=>{previousChange?.();paintMain();};
  boardCamera.inputBlocked=()=>count>0 || settings.open;
  first=createSelectionLens($('lens-stage'),$('selection-lens'),{keyboard:false,clickToPosition:true,movementScale:()=> (first?.fraction || fraction)/fraction,enabled:()=>count>0&&!settings.open,onChange:center=>{sync(center);paintMiddle();}});
  second=createSelectionLens($('middle-lens-stage'),$('second-selection-lens'),{keyboard:false,clickToPosition:true,movementScale:()=> (second?.fraction || fraction)/fraction,enabled:()=>count===2&&!settings.open,onChange:()=>sync()});
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
  function setMagnifiers(value) {
    first.stop();second.stop();count=value;
    const button=$('magnifier-count').querySelector(`[data-count="${count}"]`);
    selectToggleOption($('magnifier-count').querySelectorAll('button'),button);
    document.body.dataset.magnifiers=String(count);overviewKey='';
    $('camera-controls').hidden=count>0;
    boardCamera.maxScaleFloor=0;boardCamera.detailThreshold=24;
    if(!count) boardCamera.reset();
    fit();
  }
  $('magnifier-count').querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>setMagnifiers(Number(button.dataset.count))));
  $('routing-outlines').querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>{
    routing=button.dataset.routing==='on';selectToggleOption($('routing-outlines').querySelectorAll('button'),button);overviewKey='';redraw();
  }));
  $('auto-legal').querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>{
    autoLegal=button.dataset.autoLegal;selectToggleOption($('auto-legal').querySelectorAll('button'),button);
  }));
  $('settings-open').onclick=()=>{first.stop();second.stop();boardCamera.stopInput();settings.showModal();};
  $('settings-close').onclick=()=>settings.close();
  function captureView() {
    return {generation,count,camera:boardCamera.capture(),span:mainViewport.clientWidth/boardCamera.size,first:{center:first.center,fraction:first.fraction},second:{center:second.center,fraction:second.fraction}};
  }
  function saveReturn() {returnView=captureView();$('return-view').disabled=false;}
  function positionView(center,span=null) {
    if(!current) return;
    if(!count) {
      if(span) boardCamera.maxScaleFloor=1/span;
      boardCamera.navigate({u:center.x,v:center.y,pixels:span ? mainViewport.clientWidth/span : boardCamera.size});
    }
    else {
      if(span!==null) {
        // Fit the complete region, including released freedom, rather than
        // merely centering a fixed crop on a potentially closed child.
        first.setFraction(Math.min(1,span));
        if(count===2) second.setFraction(1);
      }
      first.moveTo(center);
      if(count===2) {const a=first.center;second.moveTo({x:.5+(center.x-a.x)/first.fraction,y:.5+(center.y-a.y)/first.fraction});}
    }
  }
  function showLegalRegion(fitRegion=true) {
    if(!current) return;
    const b=boardRegionBounds(current.forced);positionView({x:b.left+b.size/2,y:b.top+b.size/2},fitRegion?b.size:null);
  }
  function readableDetail(center=null) {
    if(!current) return;
    const span=readableLensFraction(current.levels);
    if(!center) {
      const view=boardCamera.capture();center={x:view.u,y:view.v};
    }
    positionView(center,span);
  }
  $('show-legal').onclick=()=>{if(current){saveReturn();showLegalRegion();}};
  $('go-legal').onclick=()=>{if(current){saveReturn();showLegalRegion(false);}};
  $('readable-detail').onclick=()=>{if(current){saveReturn();readableDetail();}};
  function lastInspectableMove() {
    if(!current) return null;
    const humans=Object.entries(current.players||{}).filter(([,controller])=>controller==='Human');
    // In a one-human match, inspect the opponent even while their next reply
    // is pending. Two-human/spectator matches inspect the latest move.
    return humans.length===1 ? [...current.history].reverse().find(move=>move.mark!==humans[0][0]) : current.history.at(-1);
  }
  $('last-move-view').onclick=()=>{
    const last=lastInspectableMove();if(!last) return;
    saveReturn();const path=(Array.isArray(last.square)?last.square:[last.square]).map(n=>n-1),b=boardRegionBounds(path);
    readableDetail({x:b.left+b.size/2,y:b.top+b.size/2});
  };
  $('return-view').onclick=()=>{
    const saved=returnView;if(!saved || saved.generation!==generation) return;
    returnView=null;$('return-view').disabled=true;setMagnifiers(saved.count);
    first.setFraction(saved.first.fraction);second.setFraction(saved.second.fraction);
    first.moveTo(saved.first.center);second.moveTo(saved.second.center);
    if(!count) {boardCamera.maxScaleFloor=1/saved.span;boardCamera.navigate({...saved.camera,pixels:mainViewport.clientWidth/saved.span});}else sync();
  };
  function zoomLens(control,inside) {
    if(!current) return;
    const minimum=control===first ? 1/3**(current.levels+1) : 1/27;
    control.zoomKeyDown(inside?'ZoomIn':'ZoomOut',minimum);
  }
  function closePreview() {previewSerial++;candidate=null;redraw();}
  async function previewNode(node) {
    if(!node || !canPlay(node)) {closePreview();return;}
    const request=++previewSerial,revision=interactionRevision;
    candidate=null;redraw();
    try {
      // Python resolves the actual next destination, including closed-board
      // fallback. Presentation only outlines that region in the existing views.
      const response=await requestPresentation({action:'preview',path:node.path});
      if(request!==previewSerial || revision!==interactionRevision) return;
      candidate={node,revision,destination:response.outcome===null?response.forced:null};redraw();
    } catch(_) {if(request===previewSerial) {candidate=null;redraw();}}
  }
  function commitCandidate() {
    if(!candidate || candidate.revision!==interactionRevision || !canPlay(candidate.node)) return;
    const node=candidate.node;closePreview();playNode(node);
  }
  function previewOrCommit(node) {
    if(candidate?.revision===interactionRevision && candidate.node.path.join('/')===node.path.join('/')) commitCandidate();
    else previewNode(node);
  }
  $('move-input').querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>{
    previewMode=button.dataset.input==='preview';selectToggleOption($('move-input').querySelectorAll('button'),button);closePreview();
    if(previewMode) inspectSelection().then(node=>{if(node) previewNode(node);}).catch(()=>{});
  }));
  board.addEventListener('click',event=>{
    if(!previewMode) return;
    const cell=event.target.closest('button');if(!cell || cell.disabled) return;
    event.preventDefault();event.stopImmediatePropagation();
    selectCell(cell);previewOrCommit(cell._viewNode);
  },true);
  function selectCell(cell) {
    board.querySelectorAll('.move-selected').forEach(item=>item.classList.remove('move-selected'));
    if(!cell) return;boardFocusPath=cell.dataset.path;setBoardEntry(cell.disabled?availableCells()[0]:cell,true);cell.classList.add('move-selected');
    (cell.disabled?board:cell).focus({preventScroll:true});redraw();
  }
  async function inspectCellPath(path) {
    const response=await requestPresentation({action:'inspect',path:path.slice(0,-1)});
    return response.picker.children[path.at(-1)];
  }
  async function inspectSelection() {
    const selected=boardFocusPath;if(!selected) return null;
    const cell=[...board.querySelectorAll('button')].find(item=>item.dataset.path===selected);
    const node=cell?cell._viewNode:await inspectCellPath(selected.split('/').map(Number));
    return selected===boardFocusPath?node:null;
  }
  function moveSelection(path) {
    closePreview();boardFocusPath=path.join('/');
    const cell=[...board.querySelectorAll('button')].find(item=>item.dataset.path===boardFocusPath);
    if(cell) selectCell(cell);else {setBoardEntry(availableCells()[0],true);board.focus({preventScroll:true});redraw();}
    if(previewMode) inspectSelection().then(node=>{if(node) previewNode(node);}).catch(()=>{});
  }
  const firstKeys={w:'ArrowUp',a:'ArrowLeft',s:'ArrowDown',d:'ArrowRight'},secondKeys={t:'ArrowUp',f:'ArrowLeft',g:'ArrowDown',h:'ArrowRight'};
  document.addEventListener('keydown',event=>{
    if(settings.open || resetDialog.open || event.ctrlKey || event.metaKey || event.altKey || event.target.closest('input,textarea,select,[contenteditable="true"]') || !current) return;
    const key=event.key.toLowerCase(),control=count&&firstKeys[key]?first:count===2&&secondKeys[key]?second:null;
    if(control) {event.preventDefault();event.stopImmediatePropagation();control.keyDown({key:(control===first?firstKeys:secondKeys)[key],shiftKey:event.shiftKey,preventDefault(){}});return;}
    if(count&&['q','e'].includes(key) || count===2&&['r','y'].includes(key)) {event.preventDefault();zoomLens(['q','e'].includes(key)?first:second,['e','y'].includes(key));return;}
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key)) {
      event.preventDefault();event.stopImmediatePropagation();
      if(event.key==='Home'||event.key==='End') moveSelection(boardClampSelector(Array(current.levels).fill(event.key==='End'?8:0),current.forced));
      else {const path=boardFocusPath?boardFocusPath.split('/').map(Number):Array(current.levels).fill(4),next=boardArrowPath(path,event.key,current.forced);if(next) moveSelection(next);}return;
    }
    if(event.code==='Space' && !event.target.closest('#game-header')) {
      event.preventDefault();event.stopImmediatePropagation();
      if(previewMode) commitCandidate();
      else inspectSelection().then(node=>{if(node && canPlay(node)) playNode(node);}).catch(()=>{});
    }
  },true);
  document.addEventListener('keyup',event=>{const key=event.key.toLowerCase();if(firstKeys[key]) first.keyUp(firstKeys[key]);if(secondKeys[key]) second.keyUp(secondKeys[key]);if(['q','e'].includes(key)) first.keyUp(key==='e'?'ZoomIn':'ZoomOut');if(['r','y'].includes(key)) second.keyUp(key==='y'?'ZoomIn':'ZoomOut');if(event.key==='Shift'){first.keyUp('Shift');second.keyUp('Shift');}});
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
      const node=await inspectCellPath(path);
      if(node?.kind==='cell' && node.allowed && !node.mark) {if(previewMode) previewOrCommit(node);else playNode(node);}
    } catch(_) {} // A concurrent reset/move invalidates the existing request guard.
  });
  document.addEventListener('wheel',event=>{if(count && mainViewport.contains(event.target)){event.preventDefault();event.stopImmediatePropagation();}}, {capture:true,passive:false});
  presentationObserver=async next=>{
    current=next;
    // Keep the cursor within the authoritative playable scope when routing
    // changes. Neither this clamp nor arrow movement depends on a camera crop.
    const path=boardFocusPath.split('/').map(Number);
    boardFocusPath=boardClampSelector(path.length===next.levels?path:Array(next.levels).fill(4),next.forced).join('/');
    board.querySelectorAll('.move-selected').forEach(cell=>cell.classList.remove('move-selected'));
    const selected=[...board.querySelectorAll('button')].find(cell=>cell.dataset.path===boardFocusPath);
    if(selected) selected.classList.add('move-selected');
    if(lastGeneration!==generation) {lastGeneration=generation;lastMoveCount=next.history.length;results=[];overviewKey='';returnView=null;$('return-view').disabled=true;closePreview();second.setFraction(fraction);first.setFraction(readableLensFraction(next.levels));second.moveTo({x:.5,y:.5});first.moveTo({x:.5,y:.5});if(!count) boardCamera.reset();}
    redraw();sync();
    // Reuse explicit navigation only for a newly played move, never for a
    // presentation refresh or a new game. Keep the final position on game over.
    const moved=next.history.length>lastMoveCount;lastMoveCount=next.history.length;
    $('last-move-view').disabled=!lastInspectableMove();
    if(moved) closePreview();
    // Automatic following changes location only; fitting is an explicit action.
    if(moved && !next.over && (autoLegal==='all' || (autoLegal==='human' && !next.computer_turn))) showLegalRegion(false);
    const request=++serial;
    try {const response=await requestPresentation({action:'overview'});if(request===serial){results=response.results;redraw();}} catch(_) {}
  };
  fit();if(state) presentationObserver(state);
})();
