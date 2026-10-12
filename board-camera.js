// Presentation only: resize the existing board so its renderer, symbols, and
// ResizeObserver-based winning lines continue to share one layout.
class BoardCamera {
  constructor(viewport, board, reset, toggle, dragToggle, edgeToggle) {
    Object.assign(this, {viewport, board, resetButton: reset, toggle, dragToggle, edgeToggle,
      scale: 1, x: 0, y: 0, size: 0, frame: null, pointer: null, drag: null, edgeEntered: null});
    // Auxiliary playtest views can be removed without retaining document listeners.
    this.listeners = [];
    const listen = (target, type, handler, options) => {
      target.addEventListener(type, handler, options);
      this.listeners.push([target, type, handler, options]);
    };
    listen(viewport, 'wheel', event => this.wheel(event), {passive: false});
    listen(reset, 'click', () => this.reset());
    // Use the same option-selection behavior as the player controls.
    [toggle, dragToggle, edgeToggle].filter(Boolean).forEach(group => {
      const options = group.querySelectorAll('button');
      options.forEach(option => listen(option, 'click', () => {
        selectToggleOption(options, option);
        if (!this.enabled(dragToggle)) this.endDrag();
        this.stopEdge();
        this.startEdge();
      }));
    });
    listen(viewport, 'pointerdown', event => this.pointerDown(event));
    // Track the surrounding page too, so the outside edge strip remains active.
    listen(document, 'pointermove', event => this.pointerMove(event), true);
    listen(document, 'pointerleave', () => this.stopInput());
    listen(viewport, 'pointerup', () => this.endDrag());
    listen(viewport, 'pointercancel', () => this.stopInput());
    listen(viewport, 'lostpointercapture', () => this.endDrag());
    listen(viewport, 'pointerleave', () => {
      if (this.drag && !this.drag.active) this.endDrag();
    });
    // A drag must not also place a mark. Keyboard-generated clicks still work.
    listen(viewport, 'click', event => {
      if (this.suppressClick && event.detail !== 0) {
        event.preventDefault();
        event.stopImmediatePropagation();
        this.suppressClick = false;
      }
    }, true);
    listen(window, 'blur', () => this.stopInput());
    listen(document, 'visibilitychange', () => {
      if (document.hidden) this.stopInput();
    });
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(viewport);
    this.resize();
  }

  dispose() {
    this.stopInput();
    this.onChange = null;
    this.observer.disconnect();
    for (const [target, type, handler, options] of this.listeners) {
      target.removeEventListener(type, handler, options);
    }
    this.listeners.length = 0;
  }

  resize(preservePixels = this.preservePixelsOnResize) {
    const previousSize = this.size;
    const width = this.viewport.clientWidth, height = this.viewport.clientHeight;
    if (!width || !height) return;
    // Preserve the viewed center; minimum zoom reserves 100 CSS pixels above and below.
    const u = this.size ? (this.width / 2 - this.x) / this.size : .5;
    const v = this.size ? (this.height / 2 - this.y) / this.size : .5;
    Object.assign(this, {width, height, baseSize: Math.max(1, Math.min(width, height - (this.fitPadding ?? 200)))});
    if (preservePixels && previousSize) this.scale = Math.max(1, Math.min(this.maxScale, previousSize / this.baseSize));
    this.size = this.baseSize * this.scale;
    this.x = width / 2 - u * this.size;
    this.y = height / 2 - v * this.size;
    this.layoutSize = this.size;
    this.draw();
  }

  draw(notify = true) {
    if (!this.size) return;
    // Center an axis that fits; otherwise prevent panning beyond the board.
    const clamp = (position, extent) => this.size <= extent ? (extent - this.size) / 2
      : Math.max(extent - this.size, Math.min(0, position));
    this.x = clamp(this.x, this.width);
    this.y = clamp(this.y, this.height);
    if (this.levels > 3) {
      // Move/zoom the existing picture immediately. Recursive grid layout only
      // changes when fresh detail is committed, not on every input/frame.
      Object.assign(this.board.style, {width: `${this.layoutSize}px`, left: '0px', top: '0px',
        transformOrigin: '0 0', transform: `translate(${this.x}px, ${this.y}px) scale(${this.size / this.layoutSize})`});
    } else {
      Object.assign(this.board.style, {width: `${this.size}px`, left: `${this.x}px`, top: `${this.y}px`, transform: ''});
    }
    this.resetButton.disabled = this.scale === 1;
    if (notify) this.onChange?.();
  }

  commitDetail() {
    this.layoutSize = this.size;
    this.draw(false);
  }

  view(overscan = 80) {
    // A small overscan strip avoids blank detail while panning between replies.
    const clamp = value => Math.max(0, Math.min(1, value));
    return {left: clamp((-this.x - overscan) / this.size), top: clamp((-this.y - overscan) / this.size),
      right: clamp((this.width - this.x + overscan) / this.size),
      bottom: clamp((this.height - this.y + overscan) / this.size), pixels: this.size,
      ...(this.detailThreshold ? {detailThreshold: this.detailThreshold} : {})};
  }

  // Explicit navigation restores location/absolute scale, including after resize.
  capture() {
    return {u: (this.width / 2 - this.x) / this.size,
      v: (this.height / 2 - this.y) / this.size, pixels: this.size};
  }

  navigate({u, v, pixels}) {
    this.stopInput();
    this.scale = Math.max(1, Math.min(this.maxScale, pixels / this.baseSize));
    this.size = this.scale * this.baseSize;
    this.x = this.width / 2 - u * this.size;
    this.y = this.height / 2 - v * this.size;
    this.draw();
  }

  setLevels(levels) {
    this.levels = levels;
    this.reset();
  }

  get maxScale() {
    // Preserve Levels 1–3's range; deeper boards can zoom to usable leaf sizes.
    // A presentation may request larger cells to fit its comparison panels.
    return Math.max(this.maxScaleFloor || 0, (this.levels || 1) <= 3 ? 9 : Math.max(9, 3 ** this.levels * (this.detailCellPixels || 44) / this.baseSize));
  }

  reset() {
    this.stopInput();
    this.scale = 1;
    this.resize(false);
  }

  wheel(event) {
    if (this.toggle.querySelector('[aria-pressed="true"]').dataset.zoom !== 'on' || !this.size || event.ctrlKey || event.deltaY === 0) return;
    // Consume the wheel at limits too, so reaching a limit doesn't scroll the page.
    // Leave Ctrl-wheel to browser zoom; normalize pixel, line, and page deltas.
    event.preventDefault();
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? this.height : 1);
    const next = Math.max(1, Math.min(this.maxScale, this.scale * Math.exp(-Math.max(-100, Math.min(100, delta)) * .002)));
    const rect = this.viewport.getBoundingClientRect();
    const px = event.clientX - rect.left - this.viewport.clientLeft;
    const py = event.clientY - rect.top - this.viewport.clientTop;
    const ratio = next / this.scale;
    this.x = px - (px - this.x) * ratio;
    this.y = py - (py - this.y) * ratio;
    this.scale = next;
    this.size = this.baseSize * next;
    this.draw();
    this.startEdge();
  }

  enabled(group) {
    const option = group?.querySelector('[aria-pressed="true"]');
    return (option?.dataset.move ?? option?.dataset.zoom) === 'on';
  }

  pointerDown(event) {
    this.suppressClick = false;
    if (!this.enabled(this.dragToggle) || event.button !== 0 || event.pointerType !== 'mouse') return;
    this.stopEdge();
    this.drag = {id: event.pointerId, startX: event.clientX, startY: event.clientY,
      lastX: event.clientX, lastY: event.clientY, active: false};
  }

  pointerMove(event) {
    if (event.pointerType !== 'mouse') return;
    const rect = this.viewport.getBoundingClientRect();
    this.pointer = {x: event.clientX - rect.left - this.viewport.clientLeft,
      y: event.clientY - rect.top - this.viewport.clientTop};
    const drag = this.drag;
    if (drag && drag.id === event.pointerId) {
      // Small hand movements remain ordinary clicks; once dragging, grab the board.
      if (!drag.active && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) >= 5) {
        drag.active = true;
        this.suppressClick = true;
        this.viewport.setPointerCapture(event.pointerId);
        this.viewport.classList.add('dragging');
      }
      if (drag.active) {
        event.preventDefault();
        this.x += event.clientX - drag.lastX;
        this.y += event.clientY - drag.lastY;
        this.draw();
        drag.lastX = event.clientX;
        drag.lastY = event.clientY;
      }
    } else this.startEdge();
  }

  endDrag() {
    const drag = this.drag;
    this.drag = null;
    this.viewport.classList.remove('dragging');
    if (drag && this.viewport.hasPointerCapture(drag.id)) this.viewport.releasePointerCapture(drag.id);
    this.startEdge();
  }

  stopInput() {
    this.pointer = null;
    this.endDrag();
    this.stopEdge();
  }

  edgeZoneActive() {
    if (this.inputBlocked?.() || !this.enabled(this.edgeToggle) || !this.pointer || this.drag || document.hidden || !document.hasFocus() ||
        document.querySelector('dialog[open]')) return false;
    const {x, y} = this.pointer;
    return x >= -25 && y >= -25 && x <= this.width + 25 && y <= this.height + 25 &&
      (x <= 75 || x >= this.width - 75 || y <= 75 || y >= this.height - 75);
  }

  edgeDirection() {
    if (!this.edgeZoneActive()) return [0, 0];
    const {x, y} = this.pointer;
    // View movement points from the viewer center toward the mouse. Move the board
    // oppositely, preserving the vector's angle rather than snapping to eight directions.
    let dx = this.width / 2 - x;
    let dy = this.height / 2 - y;
    if (this.size <= this.width || (dx > 0 && this.x >= 0) ||
        (dx < 0 && this.x <= this.width - this.size)) dx = 0;
    if (this.size <= this.height || (dy > 0 && this.y >= 0) ||
        (dy < 0 && this.y <= this.height - this.size)) dy = 0;
    const length = Math.hypot(dx, dy) || 1;
    return [dx / length, dy / length];
  }

  startEdge() {
    if (!this.edgeZoneActive()) { this.stopEdge(); return; }
    // Keep elapsed zone time when direction changes or a board boundary blocks motion.
    if (this.edgeEntered === null) this.edgeEntered = performance.now();
    if (this.frame !== null || !this.edgeDirection().some(Boolean)) return;
    this.lastFrame = null;
    const tick = time => {
      this.frame = null;
      if (!this.edgeZoneActive()) { this.stopEdge(); return; }
      const [dx, dy] = this.edgeDirection();
      if (!dx && !dy) return;
      // Time-based speed; cap a stalled frame's displacement to avoid a catch-up leap.
      const seconds = this.lastFrame === null ? 0 : Math.min(50, time - this.lastFrame) / 1000;
      this.lastFrame = time;
      const speed = this.edgeSpeed(time);
      this.x += dx * speed * seconds;
      this.y += dy * speed * seconds;
      this.draw();
      this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
  }

  stopEdge() {
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
    this.edgeEntered = null;
  }

  edgeSpeed(time) {
    // Smoothstep eases from 300 to 1.618 times that speed over one second.
    // Only elapsed time in the zone matters; pointer proximity and zoom do not.
    const t = Math.max(0, Math.min(1, (time - this.edgeEntered) / 1000));
    return 300 * (1 + .618 * t * t * (3 - 2 * t));
  }

}

const boardCamera = new BoardCamera(document.querySelector('#board-viewport'), document.querySelector('#board'),
  document.querySelector('#zoom-out'), document.querySelector('#scroll-zoom'),
  document.querySelector('#drag-move'), document.querySelector('#edge-move'));
