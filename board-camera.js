// Presentation only: resize the existing board so its renderer, symbols, and
// ResizeObserver-based winning lines continue to share one layout.
class BoardCamera {
  constructor(viewport, board, reset, toggle, dragToggle, edgeToggle) {
    Object.assign(this, {viewport, board, resetButton: reset, toggle, dragToggle, edgeToggle,
      scale: 1, x: 0, y: 0, size: 0, frame: null, pointer: null, drag: null, edgeEntered: null});
    viewport.addEventListener('wheel', event => this.wheel(event), {passive: false});
    reset.addEventListener('click', () => this.reset());
    // Use the same option-selection behavior as the player controls.
    [toggle, dragToggle, edgeToggle].filter(Boolean).forEach(group => {
      const options = group.querySelectorAll('button');
      options.forEach(option => option.addEventListener('click', () => {
        selectToggleOption(options, option);
        if (!this.enabled(dragToggle)) this.endDrag();
        this.stopEdge();
        this.startEdge();
      }));
    });
    viewport.addEventListener('pointerdown', event => this.pointerDown(event));
    // Track the surrounding page too, so the outside edge strip remains active.
    document.addEventListener('pointermove', event => this.pointerMove(event), true);
    document.addEventListener('pointerleave', () => this.stopInput());
    viewport.addEventListener('pointerup', () => this.endDrag());
    viewport.addEventListener('pointercancel', () => this.stopInput());
    viewport.addEventListener('lostpointercapture', () => this.endDrag());
    viewport.addEventListener('pointerleave', () => {
      if (this.drag && !this.drag.active) this.endDrag();
    });
    // A drag must not also place a mark. Keyboard-generated clicks still work.
    viewport.addEventListener('click', event => {
      if (this.suppressClick && event.detail !== 0) {
        event.preventDefault();
        event.stopImmediatePropagation();
        this.suppressClick = false;
      }
    }, true);
    window.addEventListener('blur', () => this.stopInput());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.stopInput();
    });
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(viewport);
    this.resize();
  }

  resize() {
    const width = this.viewport.clientWidth, height = this.viewport.clientHeight;
    if (!width || !height) return;
    // Preserve the viewed center; minimum zoom reserves 100 CSS pixels above and below.
    const u = this.size ? (this.width / 2 - this.x) / this.size : .5;
    const v = this.size ? (this.height / 2 - this.y) / this.size : .5;
    Object.assign(this, {width, height, baseSize: Math.max(1, Math.min(width, height - 200))});
    this.size = this.baseSize * this.scale;
    this.x = width / 2 - u * this.size;
    this.y = height / 2 - v * this.size;
    this.draw();
  }

  draw() {
    if (!this.size) return;
    // Center an axis that fits; otherwise prevent panning beyond the board.
    const clamp = (position, extent) => this.size <= extent ? (extent - this.size) / 2
      : Math.max(extent - this.size, Math.min(0, position));
    this.x = clamp(this.x, this.width);
    this.y = clamp(this.y, this.height);
    Object.assign(this.board.style, {width: `${this.size}px`, left: `${this.x}px`, top: `${this.y}px`});
    this.resetButton.disabled = this.scale === 1;
  }

  reset() {
    this.stopInput();
    this.scale = 1;
    this.resize();
  }

  wheel(event) {
    if (this.toggle.querySelector('[aria-pressed="true"]').dataset.zoom !== 'on' || !this.size || event.ctrlKey || event.deltaY === 0) return;
    // Consume the wheel at limits too, so reaching a limit doesn't scroll the page.
    // Leave Ctrl-wheel to browser zoom; normalize pixel, line, and page deltas.
    event.preventDefault();
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? this.height : 1);
    const next = Math.max(1, Math.min(9, this.scale * Math.exp(-Math.max(-100, Math.min(100, delta)) * .002)));
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
    if (!this.enabled(this.edgeToggle) || !this.pointer || this.drag || document.hidden || !document.hasFocus() ||
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

new BoardCamera(document.querySelector('#board-viewport'), document.querySelector('#board'),
  document.querySelector('#zoom-out'), document.querySelector('#scroll-zoom'),
  document.querySelector('#drag-move'), document.querySelector('#edge-move'));
