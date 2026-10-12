"""Build a standalone lens prototype from the recorded X game's midpoint.

The existing SVG exporter replays authoritative rules and renders the position.
The HTML magnifies that same vector picture; it contains no game implementation.
"""
import importlib.util
import json
import re
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("recorded_svg", ROOT / "research/export-recorded-board-svg.py")
renderer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(renderer)
record = ROOT / "research/level4-playstudy-x-readable-log.md"
moves = re.findall(r"^### Ply (\d+): (?:Assistant|Regular Computer) ([XO]) — ([1-9/]+)$", record.read_text(encoding="utf-8"), re.M)
midpoint = len(moves) // 2
picture = ROOT / "research/level4-game-x-midpoint-board.svg"
report = renderer.export(record, picture, ply=midpoint)
svg = ET.parse(picture).getroot()
# Keep the export's board coordinates; both views reference the very same shapes.
content = "".join(ET.tostring(child, encoding="unicode") for child in svg)
last = [int(n) - 1 for n in moves[midpoint - 1][2].split("/")]
column = row = 0
for n in last:
    column, row = column * 3 + n % 3, row * 3 + n // 3
start = json.dumps({"x": (column + .5) / 81, "y": (row + .5) / 81})
template = '''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Fifteen — Static board magnifier</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#f5f2e9;color:#243b32;font:14px system-ui,sans-serif;min-height:100dvh;display:flex;flex-direction:column;align-items:center}
header{width:100%;padding:12px 16px;text-align:center}h1{font-size:16px;font-weight:600;margin:0 0 5px}p{margin:0;color:#637066;font-size:12px}
#workspace{display:flex;gap:20px;width:max-content;max-width:100%;padding:0 16px}
#stage,#detail{position:relative;width:min(calc((100vw - 52px)/2),calc(100dvh - 104px));aspect-ratio:1;background:#fcfbf6;flex:none}
#whole-board{display:block;width:100%;height:100%}
#lens{position:absolute;left:0;top:0;width:27.2%;aspect-ratio:1;cursor:grab;touch-action:none;user-select:none;background:transparent;will-change:transform}
#lens:active{cursor:grabbing}#lens:focus-visible{outline:3px solid #bd522e;outline-offset:3px}
#lens::after{content:"";position:absolute;inset:0;box-shadow:inset 0 0 0 2px #243b32;pointer-events:none}
#lens-picture{display:block;width:100%;height:100%;box-shadow:inset 0 0 0 1px #aab7a7}
footer{padding:10px 12px;text-align:center;color:#637066;font-size:11px}
</style>
</head>
<body>
<header><h1>Static board magnifier</h1><p>Level 4 · X game · move __PLY__ of __TOTAL__ · Drag the square to inspect the board.</p></header>
<svg width="0" height="0" aria-hidden="true" style="position:absolute"><defs><g id="recorded-position">__PICTURE__</g></defs></svg>
<main id="workspace" aria-label="Recorded board and magnified selection">
<section id="stage" aria-label="Non-playable recorded board">
<svg id="whole-board" viewBox="36 100 1944 1944" role="img" aria-label="Recorded X game at its midpoint"><use href="#recorded-position"/></svg>
<div id="lens" tabindex="0" role="group" aria-label="Selection outline; drag or use arrow keys to move"></div>
</section>
<section id="detail" aria-label="Magnified selection">
<svg id="lens-picture" viewBox="36 100 528.768 528.768" role="img" aria-label="Contents of the outlined square"><use href="#recorded-position"/></svg>
</section>
</main>
<footer>Outline side: 81.6% of a top-level square’s side. Right view shows the entire outlined area. Hold arrow keys to move; Shift moves faster.</footer>
<script>
__LENS_SCRIPT__
createSelectionLens(document.getElementById('stage'), document.getElementById('lens'), {
  initialCenter: __START__,
  onChange(center) {
    const side = 1944 * .816 / 3;
    document.getElementById('lens-picture').setAttribute('viewBox', `${36 + center.x * 1944 - side/2} ${100 + center.y * 1944 - side/2} ${side} ${side}`);
  }
});
</script>
</body></html>'''
html = template.replace('__PLY__', str(midpoint)).replace('__TOTAL__', str(len(moves))).replace('__PICTURE__', content).replace('__START__', start).replace('__LENS_SCRIPT__', (ROOT / 'selection-lens.js').read_text(encoding='utf-8'))
destination = ROOT / 'board-magnifier.html'
destination.write_text(html, encoding='utf-8')
print(json.dumps({**report, 'html':str(destination), 'total_recorded_moves':len(moves), 'lens_side_fraction':.816/3, 'magnification':3/.816}, indent=2))
