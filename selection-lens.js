/* Shared presentation-only selection movement for static and playable lens views. */
function selectionLensView(first, second = null, fraction = .816 / 3, secondFraction = fraction) {
  // A second lens selects coordinates within the first lens's crop.
  return {u:first.x + (second ? second.x-.5 : 0)*fraction,
    v:first.y + (second ? second.y-.5 : 0)*fraction,
    fraction:second ? fraction*secondFraction : fraction};
}
// Keep the same number of leaf cells visible as the original Level 3 crop.
function readableLensFraction(levels) { return Math.min(1, (.816/3)*3**(3-levels)); }
function selectionLensCamera(center,side,fraction=.816/3,detailThreshold=24) {
  const view=selectionLensView(center,null,fraction),size=side/view.fraction;
  return {size,x:side/2-view.u*size,y:side/2-view.v*size,detailThreshold};
}
function fitBoardWorkspace(width,height,count,gap=12) {
  // Choose the packing that gives every square the largest common side.
  let best={side:1,columns:1,rows:count};
  for(let columns=1;columns<=count;columns++) {
    const rows=Math.ceil(count/columns);
    const side=Math.min((width-gap*(columns-1))/columns,(height-gap*(rows-1))/rows);
    if(side>best.side) best={side,columns,rows};
  }
  return best;
}
function createSelectionLens(stage, lens, {fraction = .816 / 3, initialCenter = {x:.5,y:.5}, onChange = () => {}, enabled = () => true, keyboard = true, clickToPosition = false, movementScale = () => 1} = {}) {
  let center = {...initialCenter}, target = {...center}, drag = null, frame = null, lastTime = null;
  const heldKeys = new Set();
  const zoomKeys = new Set();
  let zoomTarget=fraction,zoomMinimum=1/27;
  const clamp = value => Math.max(fraction / 2, Math.min(1 - fraction / 2, value));
  function draw() {
    lens.style.width = `${fraction*100}%`;
    center.x = clamp(center.x); center.y = clamp(center.y);
    lens.style.transform = `translate3d(${(center.x - fraction / 2) * stage.clientWidth}px,${(center.y - fraction / 2) * stage.clientHeight}px,0)`;
    onChange({...center});
  }
  function schedule() { if (frame === null) frame = requestAnimationFrame(animate); }
  function animate(time) {
    frame = null;
    if (!enabled()) { stop(); lastTime = null; return; }
    const elapsed = lastTime === null ? 16 : Math.min(50, time - lastTime);
    lastTime = time;
    let dx = Number(heldKeys.has('ArrowRight')) - Number(heldKeys.has('ArrowLeft'));
    let dy = Number(heldKeys.has('ArrowDown')) - Number(heldKeys.has('ArrowUp'));
    const length = Math.hypot(dx,dy);
    const zoomDirection=Number(zoomKeys.has('ZoomOut'))-Number(zoomKeys.has('ZoomIn'));
    if(zoomDirection) zoomTarget=Math.max(zoomMinimum,Math.min(1,zoomTarget*Math.exp(zoomDirection*Math.log(3)*elapsed/1000)));
    if (length && !drag) {
      const distance = (heldKeys.has('Shift') ? 360 : 180) * movementScale() * elapsed / 1000 / stage.clientWidth;
      target.x += dx / length * distance; target.y += dy / length * distance;
    }
    target.x = clamp(target.x); target.y = clamp(target.y);
    // Coalesce pointer events into screen frames and ease small input steps.
    const blend = 1 - Math.exp(-elapsed / 35);
    // Interpolate proportional scale in log space; held zoom is frame-timed,
    // independent of operating-system key-repeat delay and frequency.
    fraction*=Math.exp(Math.log(zoomTarget/fraction)*blend);
    const zoomSettling=Math.abs(Math.log(zoomTarget/fraction))>.0001;
    if(!zoomSettling) fraction=zoomTarget;
    center.x += (target.x - center.x) * blend;
    center.y += (target.y - center.y) * blend;
    const settling = Math.hypot(target.x-center.x,target.y-center.y) * stage.clientWidth > .05;
    if (!settling) center = {...target};
    draw();
    const zoomCanMove=zoomDirection<0?zoomTarget>zoomMinimum:zoomDirection>0&&zoomTarget<1;
    if (settling || length || zoomSettling || zoomCanMove) schedule(); else lastTime = null;
  }
  lens.addEventListener('pointerdown', event => {
    if (event.button !== 0 || !enabled()) return;
    event.preventDefault(); lens.focus({preventScroll:true});
    heldKeys.clear();zoomKeys.clear();zoomTarget=fraction; target = {...center};
    const rect = stage.getBoundingClientRect();
    drag = {id:event.pointerId, dx:(event.clientX - rect.left) / rect.width - center.x, dy:(event.clientY - rect.top) / rect.height - center.y};
    lens.setPointerCapture(event.pointerId);
  });
  lens.addEventListener('pointermove', event => {
    if (!drag || drag.id !== event.pointerId) return;
    const rect = stage.getBoundingClientRect();
    target = {x:(event.clientX - rect.left) / rect.width - drag.dx, y:(event.clientY - rect.top) / rect.height - drag.dy};
    schedule();
  });
  const finish = event => { if (drag?.id === event.pointerId) drag = null; };
  for (const type of ['pointerup','pointercancel','lostpointercapture']) lens.addEventListener(type, finish);
  const stop = () => {
    drag = null; heldKeys.clear();zoomKeys.clear();zoomTarget=fraction; target={...center}; lastTime=null;
    if(frame!==null) {cancelAnimationFrame(frame);frame=null;}
  };
  window.addEventListener('blur', stop);
  lens.addEventListener('blur', stop);
  function keyDown(event) {
    if (!enabled()) return;
    const direction = {ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key];
    if (event.key === 'Shift') { heldKeys.add('Shift'); return; }
    if (!direction) return;
    event.preventDefault();
    if (!heldKeys.has(event.key)) {
      // A brief tap still moves a little; held movement does not depend on OS repeat.
      const step = 4 * movementScale() / stage.clientWidth;
      target.x += direction[0] * step; target.y += direction[1] * step;
    }
    heldKeys.add(event.key);
    if (event.shiftKey) heldKeys.add('Shift');
    schedule();
  }
  if(keyboard) lens.addEventListener('keydown', keyDown);
  if(clickToPosition) stage.addEventListener('click',event=>{
    if(!enabled() || lens.contains(event.target) || event.target.closest('button') || event.defaultPrevented) return;
    const rect=stage.getBoundingClientRect();
    stop();target={x:clamp((event.clientX-rect.left)/rect.width),y:clamp((event.clientY-rect.top)/rect.height)};
    center={...target};draw();lens.focus({preventScroll:true});
  });
  window.addEventListener('keyup', event => { heldKeys.delete(event.key); });
  new ResizeObserver(draw).observe(stage);
  target.x = clamp(target.x); target.y = clamp(target.y); center = {...target};
  draw();
  return {stop,keyDown,keyUp(key){heldKeys.delete(key);zoomKeys.delete(key);},get fraction(){return fraction;},
    zoomKeyDown(key,minimum){
      if(!enabled() || !['ZoomIn','ZoomOut'].includes(key)) return;
      if(zoomKeys.has(key)) return;
      zoomMinimum=minimum;
      if(!zoomKeys.has(key)) zoomTarget=Math.max(minimum,Math.min(1,zoomTarget*Math.exp(key==='ZoomIn'?-.04:.04)));
      zoomKeys.add(key);schedule();
    },
    setFraction(next){if(!Number.isFinite(next)||next<=0||next>1) return;stop();fraction=next;zoomTarget=next;draw();target={...center};},
    get center() {return {...center};}, moveTo(next) { stop(); target = {x:clamp(next.x),y:clamp(next.y)}; center = {...target}; draw(); }};
}
