// Presentation only: Python supplies the winning children; no wins are inferred here.
// L = D + 2kr: multiply the X's center-to-tip reach by k at each end.
const WIN_LINE_EXTENSION = 1.618;
class WinningLines {
  constructor(board) {
    this.board = board;
    this.metrics = new Map();
    this.layouts = new Map();
    this.frame = null;
    this.observer = new ResizeObserver(() => this.invalidateLayout());
    this.observer.observe(board);
    const fontsChanged = () => { if (!this.disposed) { this.metrics.clear(); this.invalidateLayout(); } };
    this.fontsChanged = fontsChanged;
    document.fonts.ready.then(fontsChanged);
    document.fonts.addEventListener('loadingdone', fontsChanged);
  }

  dispose() {
    this.disposed = true;
    this.observer.disconnect();
    document.fonts.removeEventListener('loadingdone', this.fontsChanged);
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
  }

  add(element, node) {
    const winners = node.children.flatMap((child, index) => child.winning ? [index] : []);
    if (!node.result || winners.length !== 3) return;
    const line = document.createElement('div');
    line.className = 'winning-line';
    line.setAttribute('aria-hidden', 'true');
    line.dataset.first = winners[0];
    line.dataset.last = winners[2];
    line.dataset.levels = node.levels;
    line.dataset.winner = node.result;
    element.append(line);
  }

  // Measure the existing X glyph, rather than replacing either player's typography.
  // A large reference glyph keeps measurements stable even for tiny nested boards.
  measure(style) {
    const font = `${style.fontStyle} ${style.fontWeight} 256px ${style.fontFamily}`;
    if (!this.metrics.has(font)) {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 512;
      const context = canvas.getContext('2d', {willReadFrequently: true});
      context.font = font;
      const bounds = context.measureText('X');
      const left = 128 - bounds.actualBoundingBoxLeft;
      const top = 320 - bounds.actualBoundingBoxAscent;
      const width = bounds.actualBoundingBoxLeft + bounds.actualBoundingBoxRight;
      const height = bounds.actualBoundingBoxAscent + bounds.actualBoundingBoxDescent;
      context.fillText('X', 128, 320);
      const pixels = context.getImageData(0, 0, 512, 512).data;
      const ink = (x, y) => pixels[(y * 512 + x) * 4 + 3] >= 128;
      const arm = fraction => {
        const y = Math.floor(top + height * fraction);
        let start = -1, end = -1;
        for (let x = Math.floor(left); x < left + width / 2; x++) {
          if (ink(x, y)) { if (start < 0) start = x; end = x; }
        }
        return {center: (start + end + 1) / 2, width: end - start + 1, y};
      };
      const upper = arm(.2), lower = arm(.35);
      const slope = (lower.center - upper.center) / (lower.y - upper.y);
      const stroke = ((upper.width + lower.width) / 2) / Math.hypot(1, slope);
      let reach = 0;
      for (let y = Math.floor(top); y < top + height; y++) {
        for (let x = Math.floor(left); x < left + width; x++) {
          if (ink(x, y)) reach = Math.max(reach, Math.hypot(x + .5 - left - width / 2, y + .5 - top - height / 2));
        }
      }
      this.metrics.set(font, {stroke: stroke / 256, reach: reach / 256});
    }
    const metrics = this.metrics.get(font), size = Number.parseFloat(style.fontSize);
    return {stroke: metrics.stroke * size, reach: metrics.reach * size};
  }

  refresh() {
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => { this.frame = null; this.draw(); });
  }

  invalidateLayout() {
    this.layouts.clear();
    this.refresh();
  }

  setLevels(levels) {
    if (this.levels === levels) return;
    this.levels = levels;
    this.invalidateLayout();
  }

  layoutFor(line) {
    const key = line.dataset.levels;
    if (!this.layouts.has(key)) {
      const owner = line.parentElement;
      const symbol = owner.children[Number(line.dataset.first)].querySelector(':scope > .mark, :scope > .board-result');
      const style = getComputedStyle(symbol);
      const origin = owner.getBoundingClientRect();
      // All boards at this recursive layer share their grid and font size.
      // Save local centers and scaled glyph dimensions once for the current layout.
      const centers = [...owner.children].slice(0, 9).map(element => {
        const rect = element.getBoundingClientRect();
        return {x: rect.left + rect.width / 2 - origin.left - owner.clientLeft,
          y: rect.top + rect.height / 2 - origin.top - owner.clientTop};
      });
      this.layouts.set(key, {centers, metrics: this.measure(style), geometries: new Map(),
        colors: new Map([[line.dataset.winner, style.color]])});
    }
    return this.layouts.get(key);
  }

  draw() {
    this.board.querySelectorAll('.winning-line').forEach(line => {
      const layout = this.layoutFor(line);
      const key = `${line.dataset.first}/${line.dataset.last}`;
      if (!layout.geometries.has(key)) {
        layout.geometries.set(key, WinningLines.geometry(layout.centers[Number(line.dataset.first)],
          layout.centers[Number(line.dataset.last)], layout.metrics));
      }
      if (!layout.colors.has(line.dataset.winner)) {
        const first = line.parentElement.children[Number(line.dataset.first)];
        layout.colors.set(line.dataset.winner, getComputedStyle(first.querySelector(':scope > .mark, :scope > .board-result')).color);
      }
      const geometry = layout.geometries.get(key);
      Object.assign(line.style, {left: `${geometry.x}px`, top: `${geometry.y}px`,
        width: `${geometry.length}px`, height: `${layout.metrics.stroke}px`,
        transform: `rotate(${geometry.angle}rad)`, backgroundColor: layout.colors.get(line.dataset.winner)});
    });
  }

  static geometry(first, last, {reach, stroke}) {
    const dx = last.x - first.x, dy = last.y - first.y, distance = Math.hypot(dx, dy);
    const extension = WIN_LINE_EXTENSION * reach;
    return {x: first.x - dx / distance * extension,
      y: first.y - dy / distance * extension - stroke / 2,
      length: distance + 2 * extension, angle: Math.atan2(dy, dx)};
  }
}
