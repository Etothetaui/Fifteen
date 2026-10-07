// Presentation only: resize the existing board so its renderer, symbols, and
// ResizeObserver-based winning lines continue to share one layout.
class BoardCamera {
  constructor(viewport, board, reset, toggle) {
    Object.assign(this, {viewport, board, resetButton: reset, toggle, scale: 1, x: 0, y: 0, size: 0});
    viewport.addEventListener('wheel', event => this.wheel(event), {passive: false});
    reset.addEventListener('click', () => this.reset());
    board.addEventListener('focusin', event => this.reveal(event.target));
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(viewport);
    this.resize();
  }

  resize() {
    const width = this.viewport.clientWidth, height = this.viewport.clientHeight;
    if (!width || !height) return;
    // Preserve the viewed center on resize; at minimum zoom always fit the board.
    const u = this.size ? (this.width / 2 - this.x) / this.size : .5;
    const v = this.size ? (this.height / 2 - this.y) / this.size : .5;
    Object.assign(this, {width, height, baseSize: Math.min(width, height)});
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
    this.scale = 1;
    this.resize();
  }

  wheel(event) {
    if (!this.toggle.checked || !this.size || event.ctrlKey || event.deltaY === 0) return;
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
  }

  reveal(target) {
    if (target === this.board || !this.size) return;
    // Arrow-key focus remains usable when the destination is outside the crop.
    const rect = target.getBoundingClientRect(), view = this.viewport.getBoundingClientRect();
    const left = view.left + this.viewport.clientLeft, top = view.top + this.viewport.clientTop;
    if (rect.left < left) this.x += left - rect.left;
    else if (rect.right > left + this.width) this.x -= rect.right - left - this.width;
    if (rect.top < top) this.y += top - rect.top;
    else if (rect.bottom > top + this.height) this.y -= rect.bottom - top - this.height;
    this.viewport.scrollLeft = this.viewport.scrollTop = 0;
    this.draw();
  }
}

new BoardCamera(document.querySelector('#board-viewport'), document.querySelector('#board'),
  document.querySelector('#zoom-out'), document.querySelector('#scroll-zoom'));
