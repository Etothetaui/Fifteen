function boardPathAt(u, v, depth) {
    const path = [];
    u = Math.max(0, Math.min(1-Number.EPSILON, u)); v = Math.max(0, Math.min(1-Number.EPSILON, v));
    for (let n = 0; n < depth; n++) {
      u *= 3; v *= 3;
      path.push(Math.floor(v) * 3 + Math.floor(u));
      u %= 1; v %= 1;
    }
    return path;
  }
// Shared presentation geometry; Python remains the authority on rules and routing.
function boardRegionBounds(path) {
  const [row,column] = visualPosition(path), extent = 3 ** path.length;
  return {left:column/extent,top:row/extent,size:1/extent};
}
function boardLayerStroke(remaining, spacing) {
  // Grow with nesting depth, bounded by screen space rather than a level table.
  return Math.min(12,Math.max(1,Math.round(1.618 ** remaining-.618)),Math.max(.5,spacing*.18));
}
function paintBoardInk(canvas, {state:currentState, results=[], camera=null, permitted=currentState?.forced, fullBoard=false, readOnly=false, frames=false, routing=true, overviewCamera=null, threshold=96, blue=false} = {}) {
    if (!currentState) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = window.devicePixelRatio || 1;
    const width = rect.width, height = rect.height;
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    }
    const context = canvas.getContext('2d');
    context.setTransform(dpr, 0, 0, dpr, 0, 0); context.clearRect(0, 0, width, height);
    const size = camera ? camera.size : Math.min(width, height) - (fullBoard ? 0 : 8);
    const x = camera ? camera.x : (width - size) / 2, y = camera ? camera.y : (height - size) / 2;
    const leaf = size / 3 ** (currentState.levels - 1);
    if (!camera) {
      context.fillStyle = '#fcfbf6'; context.fillRect(x, y, size, size);
      context.strokeStyle = '#d9dfd2'; context.lineWidth = 1;
      for (let depth = 1; depth <= Math.min(fullBoard ? currentState.levels : 3, currentState.levels); depth++) {
        const divisions = 3 ** depth;
        if (size / divisions < (fullBoard ? 2 : 8)) break;
        context.globalAlpha = depth === 1 ? 1 : .5;
        if (fullBoard) {
          context.globalAlpha = 1;
          // Keep hierarchy visible without filling tiny overview cells with ink.
          context.lineWidth = Math.min(6, .5 * 1.618 ** (currentState.levels - depth), size / divisions * .18);
        }
        for (let n = 1; n < divisions; n++) {
          if (fullBoard && depth > 1 && n % 3 === 0) continue; // Already painted at a thicker parent level.
          context.beginPath(); context.moveTo(x + size * n / divisions, y); context.lineTo(x + size * n / divisions, y + size);
          context.moveTo(x, y + size * n / divisions); context.lineTo(x + size, y + size * n / divisions); context.stroke();
        }
      }
    }
    context.globalAlpha = 1;
    if (!camera || readOnly || leaf < (camera.detailThreshold || threshold)) {
      const cellSize = size / 3 ** currentState.levels;
      for (const move of currentState.history) {
        const path = (Array.isArray(move.square) ? move.square : [move.square]).map(n => n - 1), b = boardRegionBounds(path);
        const cx = x + (b.left + b.size / 2) * size, cy = y + (b.top + b.size / 2) * size;
        if (cx < -8 || cy < -8 || cx > width + 8 || cy > height + 8) continue;
        context.fillStyle = move.mark === 'X' ? '#25634a' : '#bd522e';
        const ink = Math.max(1.5, cellSize * .618);
        if (fullBoard) {
          const radius = cellSize * .26;
          context.strokeStyle = context.fillStyle; context.lineWidth = Math.max(.65, cellSize * .08);
          context.beginPath();
          if (move.mark === 'O') context.arc(cx, cy, radius, 0, Math.PI * 2);
          else { context.moveTo(cx-radius,cy-radius); context.lineTo(cx+radius,cy+radius); context.moveTo(cx-radius,cy+radius); context.lineTo(cx+radius,cy-radius); }
          context.stroke();
        }
        else if (cellSize >= 9) { context.font = `500 ${ink}px "Space Grotesk",sans-serif`; context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText(move.mark, cx, cy); }
        else context.fillRect(cx - ink / 2, cy - ink / 2, ink, ink);
      }
      // Show actual completed regions, smallest first, without a root-wide wash.
      for (const result of [...results].sort((a, b) => b.path.length - a.path.length)) {
        if (!result.path.length) continue;
        const b = boardRegionBounds(result.path), w = b.size * size;
        if (w < 12) continue;
        const px = x + b.left * size, py = y + b.top * size;
        context.fillStyle = '#fcfbf6'; context.globalAlpha = .618; context.fillRect(px, py, w, w);
        context.globalAlpha = .8; context.fillStyle = result.result === -1 ? '#bd522e' : '#25634a';
        context.font = `600 ${w * .618}px "Space Grotesk",sans-serif`; context.textAlign = 'center'; context.textBaseline = 'middle';
        context.fillText(resultSymbol(result.result), px + w / 2, py + w / 2);
      }
    }
    context.globalAlpha = 1;
    if (camera && frames) {
      // The playable buttons still use Python's tree. Only their decorative
      // hierarchy frames are drawn together, clipped to the visible viewport.
      // Shared edges of two half-pixel cell frames make a one-pixel line.
      // Draw them only at the same detail threshold used by the cell renderer.
      if (leaf >= (camera.detailThreshold || threshold)) {
        const count = 3 ** currentState.levels, step = size / count;
        context.strokeStyle = '#d9dfd2'; context.lineWidth = 1;
        context.beginPath();
        for (let n=Math.max(1,Math.ceil(-x/step));n<=Math.min(count-1,Math.floor((width-x)/step));n++) {
          if(n%3===0) continue; context.moveTo(x+n*step,Math.max(0,y));context.lineTo(x+n*step,Math.min(height,y+size));
        }
        for (let n=Math.max(1,Math.ceil(-y/step));n<=Math.min(count-1,Math.floor((height-y)/step));n++) {
          if(n%3===0) continue; context.moveTo(Math.max(0,x),y+n*step);context.lineTo(Math.min(width,x+size),y+n*step);
        }
        context.stroke();
        if (currentState.levels === 1) context.strokeRect(x+.5,y+.5,size-1,size-1);
      }
      context.strokeStyle = '#aab7a7';
      for (let depth = 1; depth < currentState.levels; depth++) {
        const count = 3 ** depth, step = size / count;
        if (step < (camera.detailThreshold || threshold) / 3) break;
        context.lineWidth = 2 * boardLayerStroke(currentState.levels-depth, step);
        context.beginPath();
        const fromX = Math.max(1,Math.ceil(-x/step)), toX = Math.min(count-1,Math.floor((width-x)/step));
        const fromY = Math.max(1,Math.ceil(-y/step)), toY = Math.min(count-1,Math.floor((height-y)/step));
        for (let n=fromX;n<=toX;n++) { if(depth>1 && n%3===0) continue; context.moveTo(x+n*step,Math.max(0,y));context.lineTo(x+n*step,Math.min(height,y+size)); }
        for (let n=fromY;n<=toY;n++) { if(depth>1 && n%3===0) continue; context.moveTo(Math.max(0,x),y+n*step);context.lineTo(Math.min(width,x+size),y+n*step); }
        context.stroke();
      }
      if (currentState.levels > 1) {
        context.lineWidth = 2 * boardLayerStroke(currentState.levels-1, size/3);
        context.strokeRect(x,y,size,size);
      }
    }
    if (!currentState.over) {
      const area = permitted || currentState.forced;
      if ((fullBoard || blue) && routing) {
        // Python supplies successive destination scopes using the game's
        // existing routing and closed-board resolver, not ancestor prefixes.
        context.lineWidth = 2;
        let routeIndex = 0;
        for (const route of currentState.routing_areas || []) {
          if (!route.length) continue; // Whole-board routing is implicit; blue still shows unrestricted play.
          context.strokeStyle = routeIndex++ % 2 === 0 ? '#a77cbd' : '#683980';
          const region = boardRegionBounds(route), extent = region.size * size, inset = Math.min(1,extent/4);
          context.lineWidth = Math.min(2,extent/2);
          context.strokeRect(x + region.left * size + inset, y + region.top * size + inset, extent - 2*inset, extent - 2*inset);
        }
      }
      const b = boardRegionBounds(area);
      context.strokeStyle = (fullBoard || blue) ? '#376ca6' : '#25634a'; context.lineWidth = (fullBoard || blue) ? 3 : 2;
      context.setLineDash((fullBoard || blue) ? [] : [5, 3]);
      const inset = fullBoard ? Math.min(1.5, b.size * size / 4) : 0;
      context.strokeRect(x + b.left * size + inset, y + b.top * size + inset, b.size * size - 2 * inset, b.size * size - 2 * inset); context.setLineDash([]);
    }
    const last = currentState.history.at(-1);
    if (last) {
      const b = boardRegionBounds((Array.isArray(last.square) ? last.square : [last.square]).map(n => n - 1));
      context.strokeStyle = '#bd522e'; context.lineWidth = 1.5;
      const cx = x + (b.left + b.size / 2) * size, cy = y + (b.top + b.size / 2) * size;
      context.strokeRect(cx - Math.max(3, b.size * size / 2), cy - Math.max(3, b.size * size / 2), Math.max(6, b.size * size), Math.max(6, b.size * size));
    }
    if (!camera && !fullBoard && overviewCamera) {
      const view = overviewCamera.view(0); context.strokeStyle = '#243b32'; context.lineWidth = 2;
      context.strokeRect(x + view.left * size, y + view.top * size, (view.right - view.left) * size, (view.bottom - view.top) * size);
    }
  }
