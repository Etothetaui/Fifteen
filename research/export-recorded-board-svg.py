"""Export a recorded position; replay uses the existing authoritative rules."""
import argparse
import json
import re
import sys
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from fifteen import GameState

SVG = "http://www.w3.org/2000/svg"
ET.register_namespace("", SVG)
COLORS = {1: "#25634a", -1: "#bd522e", 0: "#637066"}


def export(source, destination, *, ply=None):
    content = source.read_text(encoding="utf-8")
    if source.suffix == ".md":
        level = re.search(r"^# Level (\d+) game as ([XO])", content)
        if not level:
            raise ValueError("Unrecognized completed diary heading")
        recorded = re.findall(r"^### Ply (\d+): (?:Assistant|Regular Computer) ([XO]) — ([1-9/]+)$", content, re.M)
        data = {"levels": int(level[1]), "player_mark": level[2], "moves": [
            {"ply": int(ply), "mark": mark, "path": [int(i) for i in address.split("/")]}
            for ply, mark, address in recorded
        ]}
    else:
        data = json.loads(content)
    player_mark = data.get("player_mark", "X")
    state = GameState(levels=data["levels"])
    moves = data["moves"]
    if ply is not None:
        if not isinstance(ply, int) or not 0 <= ply <= len(moves):
            raise ValueError("Checkpoint ply is outside the recorded game")
        moves = moves[:ply]
    for ply, move in enumerate(moves, 1):
        if move["ply"] != ply or move["mark"] != ("X" if state.turn == 1 else "O"):
            raise ValueError(f"Invalid recorded move sequence at ply {ply}")
        state.play(tuple(i - 1 for i in move["path"]))
    # Retain the recorded marks beneath the completed-board presentation.
    cell = 24
    side = cell * 3 ** state.levels
    margin, top = 36, 100
    width, height = side + 2 * margin, side + top + 54
    svg = ET.Element(f"{{{SVG}}}svg", {
        "viewBox": f"0 0 {width} {height}", "width": str(width), "height": str(height),
        "role": "img", "aria-labelledby": "title description",
    })

    def node(tag, **attrs):
        return ET.SubElement(svg, f"{{{SVG}}}{tag}", {k.replace('_', '-'): str(v) for k, v in attrs.items()})

    def text(x, y, value, size=18, color="#243b32", **attrs):
        item = node("text", x=x, y=y, fill=color, font_size=size,
                    font_family="Arial, sans-serif", **attrs)
        item.text = value
        return item

    outcome = state.outcome()
    if outcome is None and ply is None:
        raise ValueError("Record does not contain a final board; refusing to label a checkpoint as final")
    result = "X wins" if outcome == 1 else "O wins" if outcome == -1 else "Draw" if outcome == 0 else "Unfinished"
    node("title", id="title").text = f"Level {state.levels} game as {player_mark} — {result}"
    node("desc", id="description").text = (
        f"Reconstructed from {state.ply} recorded moves. "
        "Large centered X/O symbols indicate won boards; diamonds indicate drawn boards."
    )
    node("metadata").text = json.dumps({
        "record": source.name, "levels": state.levels, "plies": state.ply,
        "checkpoint": ply is not None,
        "outcome": outcome, "rules": "fifteen.GameState.play", "last_move": moves[-1] if moves else None,
    })
    node("rect", x=0, y=0, width=width, height=height, fill="#f5f2e9")
    text(margin, 42, f"Level {state.levels} · game as {player_mark} · {result}", 26, font_weight="bold")
    text(margin, 73, f"{state.ply:,} moves · X green · O orange · diamond drawn", 16)
    node("rect", x=margin, y=top, width=side, height=side, fill="#fcfbf6")
    boards, marks = [], []

    def visit(board, x, y, size, path):
        if board.result is not None and path:
            boards.append((x, y, size, board.result, path))
        child_size = size / 3
        if board.levels == 1:
            for index, mark in enumerate(board.board):
                if mark in (1, -1):
                    marks.append((x + (index % 3 + .5) * child_size,
                                  y + (index // 3 + .5) * child_size, mark, path + (index,)))
        else:
            for index, child in board.children.items():
                visit(child, x + index % 3 * child_size,
                      y + index // 3 * child_size, child_size, path + (index,))

    visit(state.root, margin, top, side, ())
    # Uniform leaf coordinates preserve the recorded 1–9 row-major addresses.
    # Hierarchy is presentation only; wins and draws come from Board.result.
    for x, y, size, result, path in sorted(boards, key=lambda b: -b[2]):
        node("rect", x=x, y=y, width=size, height=size, fill=COLORS[result], fill_opacity=".055")
    count = 3 ** state.levels
    for i in range(1, count):
        depth = 0
        divisor = i
        while divisor % 3 == 0:
            depth += 1
            divisor //= 3
        stroke_width = (.45, 1.25, 2.7, 5.5)[min(depth, 3)]
        color = "#d9dfd2" if depth == 0 else "#aab7a7"
        for x1, y1, x2, y2 in [(margin + i * cell, top, margin + i * cell, top + side),
                                (margin, top + i * cell, margin + side, top + i * cell)]:
            node("line", x1=x1, y1=y1, x2=x2, y2=y2, stroke=color, stroke_width=stroke_width)
    for x, y, size, result, path in sorted(boards, key=lambda b: -b[2]):
        node("rect", x=x + 1.5, y=y + 1.5, width=size - 3, height=size - 3,
             fill="none", stroke=COLORS[result], stroke_width="1.7", stroke_opacity=".65")
    for x, y, mark, path in marks:
        attrs = {"stroke": COLORS[mark], "stroke_width": 2, "fill": "none"}
        if mark == 1:
            for dx in (-1, 1):
                node("line", x1=x - 6, y1=y - dx * 6, x2=x + 6, y2=y + dx * 6,
                     stroke_linecap="round", **attrs)
        else:
            node("circle", cx=x, cy=y, r=6.3, **attrs)
    for x, y, size, result, path in sorted(boards, key=lambda b: b[2]):
        # A lighter result background keeps descendants visible beneath the symbol.
        # The root is excluded so the final image still shows the whole position.
        node("rect", x=x + 2, y=y + 2, width=size - 4, height=size - 4,
             fill="#fcfbf6", fill_opacity=.618,
             stroke=COLORS[result], stroke_width="1.7")
        cx, cy = x + size / 2, y + size / 2
        radius = size * .309
        attrs = {"stroke": COLORS[result], "stroke_width": size * .045,
                 "fill": "none"}
        if result == 1:
            for direction in (-1, 1):
                node("line", x1=cx - radius, y1=cy - direction * radius,
                     x2=cx + radius, y2=cy + direction * radius,
                     stroke_linecap="round", **attrs)
        elif result == -1:
            node("circle", cx=cx, cy=cy, r=radius, **attrs)
        else:
            node("polygon", points=f"{cx},{cy-radius} {cx+radius},{cy} {cx},{cy+radius} {cx-radius},{cy}",
                 fill=COLORS[result])
    node("rect", x=margin, y=top, width=side, height=side, fill="none",
         stroke=COLORS.get(outcome, "#243b32"), stroke_width=5)
    text(margin, top + side + 30, "Concluded boards show their result; remaining boards show individual moves.", 15)
    destination.write_bytes(ET.tostring(svg, encoding="utf-8", xml_declaration=True))
    ET.parse(destination)
    if len(marks) != state.ply:
        raise ValueError("Rendered mark count differs from replayed move count")
    return {"output": str(destination), "plies": state.ply, "outcome": outcome,
            "rendered_marks": len(marks), "completed_subboards": len(boards)}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    print(json.dumps(export(args.source, args.destination), indent=2))
