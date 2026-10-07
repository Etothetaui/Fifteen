// Presentation only: Python supplies the winning children; no wins are inferred here.
class WinningLines {
  constructor(board) {
    this.board = board;
    this.metrics = new Map();
    this.frame = null;
    this.observer = new ResizeObserver(() => this.refresh());
    this.observer.observe(board);
    const fontsChanged = () => { this.metrics.clear(); this.refresh(); };
    document.fonts.ready.then(fontsChanged);
    document.fonts.addEventListener('loadingdone', fontsChanged);
  }

  add(element, node) {
    const winners = node.children.flatMap((child, index) => child.winning ? [index] : []);
    if (!node.result || winners.length !== 3) return;
    const line = document.createElement('div');
    line.className = 'winning-line';
    line.setAttribute('aria-hidden', 'true');
    line.dataset.first = winners[0];
    line.dataset.last = winners[2];
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

  draw() {
    this.board.querySelectorAll('.winning-line').forEach(line => {
      const owner = line.parentElement;
      const first = owner.children[Number(line.dataset.first)];
      const last = owner.children[Number(line.dataset.last)];
      const symbol = first.querySelector(':scope > .mark, :scope > .board-result');
      if (!symbol) return;
      const style = getComputedStyle(symbol), metrics = this.measure(style);
      const origin = owner.getBoundingClientRect();
      const center = element => {
        const rect = element.getBoundingClientRect();
        return {x: rect.left + rect.width / 2 - origin.left - owner.clientLeft,
          y: rect.top + rect.height / 2 - origin.top - owner.clientTop};
      };
      const geometry = WinningLines.geometry(center(first), center(last), metrics);
      Object.assign(line.style, {left: `${geometry.x}px`, top: `${geometry.y}px`,
        width: `${geometry.length}px`, height: `${metrics.stroke}px`,
        transform: `rotate(${geometry.angle}rad)`, backgroundColor: style.color});
    });
  }

  static geometry(first, last, {reach, stroke}) {
    const dx = last.x - first.x, dy = last.y - first.y, distance = Math.hypot(dx, dy);
    return {x: first.x - dx / distance * reach,
      y: first.y - dy / distance * reach - stroke / 2,
      length: distance + 2 * reach, angle: Math.atan2(dy, dx)};
  }
}
