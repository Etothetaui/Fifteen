"""Retrospective annotation of saved moves using existing rules and evaluation."""
import json
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from fifteen import GameState
from ai_evaluation import local_features

def address(path):
    return "/".join(str(i + 1) for i in path) or "whole board"

def features(node):
    if node is not None and node.result is not None:
        return 0, frozenset(), frozenset()
    return local_features(tuple(node.board) if node else (0,) * 9)

game = sys.argv[1].lower() if len(sys.argv) > 1 else "x"
if game not in ("x", "o"):
    raise ValueError("Expected study game x or o")
human_mark = game.upper()
computer_mark = "O" if human_mark == "X" else "X"
computer_result = -1 if computer_mark == "O" else 1
data = json.loads((ROOT / f"research/level4-playstudy-{game}-browser-journal.json").read_text())
state = GameState(levels=4)
notes = []
for move in data["moves"]:
    path = tuple(i - 1 for i in move["path"])
    local_before = state.board_at(path[:-1])
    before_score, before_x, before_o = features(local_before)
    before_cells = list(local_before.board) if local_before else [0] * 9
    ancestors_before = {
        path[:depth]: getattr(state.board_at(path[:depth]), "result", None)
        for depth in range(len(path))
    }
    state.play(path)
    if move["mark"] != computer_mark:
        continue
    node = state.board_at(path[:-1])
    score, x_threats, o_threats = features(node)
    target = state.board_at(state.forced)
    _, target_x, target_o = features(target)
    before_computer = before_o if computer_mark == "O" else before_x
    before_human = before_x if human_mark == "X" else before_o
    computer_threats = o_threats if computer_mark == "O" else x_threats
    blocked = path[-1] in before_human
    newly = sorted(computer_threats - before_computer)
    square = path[-1] + 1
    shape = "center" if square == 5 else "corner" if square in (1, 3, 7, 9) else "edge"
    effects = [
        f"{computer_mark} adds {square} to board {address(path[:-1])} ({shape}).",
        f"{human_mark} is next directed to {address(state.forced)}.",
        f"O immediate completion squares in the played board after this move: {[i + 1 for i in sorted(o_threats)]}.",
        f"X immediate completion squares in the played board after this move: {[i + 1 for i in sorted(x_threats)]}."
    ]
    closures = []
    for prefix, previous in ancestors_before.items():
        ancestor_node = state.board_at(prefix)
        result = getattr(ancestor_node, "result", None)
        if previous is None and result is not None:
            label = "X wins" if result == 1 else "O wins" if result == -1 else "draw"
            closures.append({"path": [i + 1 for i in prefix], "result": result})
            effects.append(f"Board {address(prefix)} closes: {label}.")
    if len(state.forced) < state.levels - 1:
        effects.append("The outgoing target resolves to a broader legal region because a child is closed.")
    if blocked:
        effects.append(f"The chosen square blocks an existing immediate {human_mark} completion at {square}.")
    if newly:
        effects.append(f"New {computer_mark} completion opportunities created: {[i + 1 for i in newly]}.")
    if state.outcome() is None:
        for target_mark, target_threats in (("X", target_x), ("O", target_o)):
            if not target_threats:
                continue
            squares = [i + 1 for i in sorted(target_threats)]
            if len(state.forced) == state.levels - 1:
                effects.append(f"The actual next leaf contains immediate {target_mark} completion squares: {squares}.")
            else:
                effects.append(f"At the next region's summary scale, {target_mark} completing child result slots {squares} would close that region. These are higher-level opportunities, not immediately playable leaf-square wins.")
    local = f"Inspect {address(path[:-1])} for existing marks, available squares, and immediate lines."
    destination = f"Compare destination {address(state.forced)} for the reply opportunities just listed."
    ancestor = "Inspect containing ancestors for owned children, active parent threats, and how any closure changes the move's value. A leaf gain cannot be evaluated by mark count alone."
    if node.result == computer_result:
        human = "A human could recognize this as an immediate leaf win, then compare its parent contribution and outgoing legal region. The local win does not establish the whole-game value of the choice."
    elif blocked:
        human = "A human could choose this as immediate local defense. It is not a legal obligation: another move can route the opponent away from the threatened leaf. Compare the block's destination with alternative routes before judging its strategic value."
    elif newly:
        human = "A human could choose this to create a delayed threat, then look for a way to regain access to the completion square. The threat alone does not guarantee that access."
    else:
        human = f"A human could choose this {shape} as development or for its destination. A conventional-looking local pattern does not identify which consideration dominated."
    target_computer = target_o if computer_mark == "O" else target_x
    if target_computer and state.outcome() is None:
        human += f" Routing the human player toward a {computer_mark} opportunity also gives that player defensive access at the relevant scale; a human observer might interpret this as a tradeoff, an oversight, or a setup. The record does not distinguish those intentions."
    robot = "Knowing this is the regular computer, the plausible mechanisms are the existing local opportunity scores, weighted ancestor summaries, forced-region evaluation, and bounded iterative search. Exact completed depth, tied alternatives, timeout behavior for this turn, and principal variation were not recorded; none is inferred from the coordinate."
    notes.append({
        "ply": move["ply"], "path": move["path"], "verified_effects": effects,
        "relevant_regions_for_a_human": [local, destination, ancestor],
        "as_if_human": human, "knowing_regular_computer": robot,
        "confidence": "High for replayed effects; low for intended plan.",
        "timing": "No computer gaze or per-region inspection time is observable.",
        "local_cells_before": before_cells, "local_cells_after": node.board,
        "closures": closures,
        "existing_local_feature_score_before": before_score,
        "existing_local_feature_score_after": score
    })

out = ROOT / f"research/level4-playstudy-{game}-retrospective-computer-notes.json"
out.write_text(json.dumps(notes, indent=2) + "\n", encoding="utf-8")
lines = [
    "# Regular-computer moves — retrospective checkpoint review",
    "",
    f"**{'Completed game' if state.outcome() is not None else 'Incomplete study'}:** covers {len(notes)} regular Computer {computer_mark} moves in the saved {len(data['moves'])}-ply {human_mark}-game record. See [the combined analysis](level4-playstudy-analysis.md) for two-game findings.",
    "",
    "These annotations were produced after the checkpoint. They supplement, rather than replace or backdate, contemporaneous expectations. Move legality, routing, and board state use GameState.play in fifteen.py. Immediate completion opportunities use the existing ai_evaluation.local_features implementation, which derives combinations from the authoritative winning_triples rule. No separate win rule, AI policy, or move execution is introduced.",
    "",
    "General regular-AI mechanism is grounded in fifteen.search_move, alpha_beta_engine.AlphaBetaEngine, and ai_evaluation. It does not reveal which factor caused an individual choice. 'Relevant regions' describes what a human analysis would need, not measured regions the computer visited. No opponent gaze or thinking duration was observed.",
    ""
]
for note in notes:
    lines += [f'## Ply {note["ply"]} — {computer_mark} at ' + "/".join(map(str, note["path"])), ""]
    lines += ["Verified consequences:", ""]
    lines += ["- " + effect for effect in note["verified_effects"]]
    lines += ["", "Human-relevant inspection questions:", ""]
    lines += ["- " + region for region in note["relevant_regions_for_a_human"]]
    lines += ["", "As if the move came from a human: " + note["as_if_human"], "",
              "Knowing it came from regular Computer: " + note["knowing_regular_computer"], "",
              "Confidence: " + note["confidence"] + " " + note["timing"], ""]
(ROOT / f"research/level4-playstudy-{game}-computer-review.md").write_text("\n".join(lines), encoding="utf-8")
print(json.dumps({"reviewed_computer_moves": len(notes), f"blocked_immediate_{human_mark}_completions": [
    n["ply"] for n in notes if any("blocks an existing" in e for e in n["verified_effects"])
], "saved_game_outcome": state.outcome()}, indent=2))
