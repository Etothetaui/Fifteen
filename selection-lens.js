/* Shared presentation-only selection movement for static and playable lens views. */
function selectionLensView(first, second = null, fraction = .816 / 3) {
  // A second lens selects coordinates within the first lens's crop.
  return {u:first.x + (second ? second.x-.5 : 0)*fraction,
    v:first.y + (second ? second.y-.5 : 0)*fraction,
    fraction:second ? fraction*fraction : fraction};
}
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
function createSelectionLens(stage, lens, {fraction = .816 / 3, initialCenter = {x:.5,y:.5}, onChange = () => {}, enabled = () => true} = {}) {
  let center = {...initialCenter}, target = {...center}, drag = null, frame = null, lastTime = null;
  const heldKeys = new Set();
  const clamp = value => Math.max(fraction / 2, Math.min(1 - fraction / 2, value));
  function draw() {
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
    if (length && !drag) {
      const distance = (heldKeys.has('Shift') ? 360 : 180) * elapsed / 1000 / stage.clientWidth;
      target.x += dx / length * distance; target.y += dy / length * distance;
    }
    target.x = clamp(target.x); target.y = clamp(target.y);
    // Coalesce pointer events into screen frames and ease small input steps.
    const blend = 1 - Math.exp(-elapsed / 35);
    center.x += (target.x - center.x) * blend;
    center.y += (target.y - center.y) * blend;
    const settling = Math.hypot(target.x-center.x,target.y-center.y) * stage.clientWidth > .05;
    if (!settling) center = {...target};
    draw();
    if (settling || length) schedule(); else lastTime = null;
  }
  lens.addEventListener('pointerdown', event => {
    if (event.button !== 0 || !enabled()) return;
    event.preventDefault(); lens.focus({preventScroll:true});
    heldKeys.clear(); target = {...center};
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
    drag = null; heldKeys.clear(); target={...center}; lastTime=null;
    if(frame!==null) {cancelAnimationFrame(frame);frame=null;}
  };
  window.addEventListener('blur', stop);
  lens.addEventListener('blur', stop);
  lens.addEventListener('keydown', event => {
    if (!enabled()) return;
    const direction = {ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key];
    if (event.key === 'Shift') { heldKeys.add('Shift'); return; }
    if (!direction) return;
    event.preventDefault();
    if (!heldKeys.has(event.key)) {
      // A brief tap still moves a little; held movement does not depend on OS repeat.
      const step = 4 / stage.clientWidth;
      target.x += direction[0] * step; target.y += direction[1] * step;
    }
    heldKeys.add(event.key);
    if (event.shiftKey) heldKeys.add('Shift');
    schedule();
  });
  window.addEventListener('keyup', event => { heldKeys.delete(event.key); });
  new ResizeObserver(draw).observe(stage);
  target.x = clamp(target.x); target.y = clamp(target.y); center = {...target};
  draw();
  return {stop, get center() {return {...center};}, moveTo(next) { stop(); target = {x:clamp(next.x),y:clamp(next.y)}; center = {...target}; draw(); }};
}
