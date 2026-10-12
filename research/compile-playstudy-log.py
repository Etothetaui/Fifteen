"""Compile saved browser observations; never choose or execute a game move."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from fifteen import GameState

# These are recorded camera observations, not generated gameplay decisions.
CAMERA_EVENTS = {"inspection", "overview-inspection", "zoom-transition"}

def address(path):
    return "/".join(str(i) for i in path) or "whole board"

def one_based(path):
    return [i + 1 for i in path]

def compile_game(mark):
    source = ROOT / "research" / f"level4-playstudy-{mark}-browser-journal.json"
    if not source.exists():
        return {"game": mark, "available": False}
    data = json.loads(source.read_text(encoding="utf-8"))
    decisions = {}
    associated_notes = {}
    inspections = {}
    pending = []
    for event in data["events"]:
        if event.get("event") in CAMERA_EVENTS:
            pending.append(event)
        if event.get("move") and "ply" in event:
            decisions[event["ply"]] = event
            if event.get("actor", "").startswith("assistant"):
                inspections[event["ply"]] = pending
                pending = []
        elif "ply" in event and event.get("event") not in CAMERA_EVENTS:
            associated_notes.setdefault(event["ply"], []).append(event)

    state = GameState(levels=data["levels"])
    rows = []
    for move in data["moves"]:
        ply = move["ply"]
        expected = "X" if state.turn == 1 else "O"
        if expected != move["mark"]:
            raise ValueError(f"Actor mismatch at ply {ply}")
        path = tuple(i - 1 for i in move["path"])
        before = one_based(state.forced)
        ancestors = [(prefix, state.board_at(prefix).result if state.board_at(prefix) else None)
                     for n in range(len(path)) for prefix in [path[:n]]]
        state.play(path)
        closures = []
        for prefix, previous in ancestors:
            board = state.board_at(prefix)
            if board and board.result is not None and previous is None:
                closures.append({"board": one_based(prefix),
                                 "result": {1: "X", -1: "O", 0: "draw"}[board.result]})
        rows.append({"ply": ply, "mark": expected, "path": move["path"],
                     "forced_before": before, "forced_after": one_based(state.forced),
                     "closures": closures, "decision": decisions.get(ply, {}),
                     "inspections": inspections.get(ply, [])})

    review_path = ROOT / "research" / f"level4-playstudy-{mark}-retrospective-computer-notes.json"
    retrospective = json.loads(review_path.read_text(encoding="utf-8")) if review_path.exists() else []
    computer_rows = {r["ply"]: r for r in rows if r["mark"] != mark.upper()}
    for note in retrospective:
        if note["ply"] not in computer_rows or note["path"] != computer_rows[note["ply"]]["path"]:
            raise ValueError("Retrospective annotation does not match a saved computer move")
    if len({note["ply"] for note in retrospective}) != len(retrospective):
        raise ValueError("Duplicate retrospective annotation")
    audit = {
        "game": mark, "available": True, "saved_plies": state.ply,
        "outcome": state.outcome(), "terminal": state.outcome() is not None,
        "forced_after": one_based(state.forced),
        "assistant_decisions": sum(bool(r["decision"]) for r in rows if r["mark"] == mark.upper()),
        "computer_contemporaneous_interpretations": sum(bool(r["decision"]) for r in rows if r["mark"] != mark.upper()),
        "computer_retrospective_annotations": len(retrospective),
        "inspection_events": sum(len(r["inspections"]) for r in rows),
        "unassigned_inspections": len(pending),
        "closures": sum(len(r["closures"]) for r in rows),
        "limitations": [
            "Saved checkpoint is not proof of the current browser position.",
            "Navigation durations include automation overhead and are not human gaze or thinking time.",
            "DOM mark lists can include rendered content outside the clipped viewer.",
            "Early computer moves lack separate contemporaneous interpretation events.",
            "Recorded zoom ratios use differing historical references; absolute displayed board width is also retained.",
            "All post-move routing and closures were verified using existing GameState.play."
        ]
    }
    dest = ROOT / "research" / f"level4-playstudy-{mark}-readable-log.md"
    text = [
        f"# Level 4 game as {mark.upper()} — saved checkpoint diary",
        "",
        f"**{'Completed game' if state.outcome() is not None else 'Incomplete game'}:** {state.ply} saved plies; outcome {state.outcome()!r}. "
        "See [the combined two-game analysis](level4-playstudy-analysis.md) for findings and priorities.",
        "",
        "The original browser journal is preserved. Recorded explanations below are "
        "decision summaries, not private reasoning transcripts. Human interpretations "
        "are hypotheses, not measured human behavior. Navigation execution intervals "
        "are not eye-fixation or thinking times. Rule effects are independently replayed "
        "through the project's authoritative GameState; no alternate rules are used.",
        "",
        f"Retrospective computer review: [separate verified effects and interpretations](level4-playstudy-{mark}-computer-review.md).",
        "",
        "## Move-by-move record",
        ""
    ]
    labels = {
        "decisionSummary": "Recorded decision summary",
        "forecast": "Recorded forecast",
        "humanDemand": "Human-oriented interpretation",
        "effect": "Recorded effect",
        "softwareInterpretation": "Software interpretation (hypothesis unless explicitly verified)",
        "robotInterpretation": "Computer interpretation (observed effects; search intent is a hypothesis)",
        "interpretation": "Recorded interpretation",
        "forecastCorrection": "Recorded forecast correction",
        "humanInterpretation": "As-if-human interpretation (hypothesis)",
        "observerCorrection": "Preserved correction",
        "brainstorm": "Idea recorded during play",
        "note": "Recorded note"
    }
    for row in rows:
        actor = "Assistant" if row["mark"] == mark.upper() else "Regular Computer"
        text += [f'### Ply {row["ply"]}: {actor} {row["mark"]} — {address(row["path"])}',
                 "",
                 f'Verified route: {address(row["forced_before"])} before; '
                 f'{address(row["forced_after"])} after. '
                 f'Newly completed boards: {json.dumps(row["closures"])}.',
                 ""]
        event = row["decision"]
        if not event:
            text += ["No separate contemporaneous explanation event was saved for this move. "
                     "Its move and route are verified; intended reasoning remains unknown.", ""]
        for field, label in labels.items():
            if field in event:
                text += [f'{label}: {event[field]}', ""]
        if "inspectionOrder" in event:
            text += ["Recorded inspection order: " + " → ".join(event["inspectionOrder"]), ""]
        for note in associated_notes.get(row["ply"], []):
            text += ["Additional record associated with this ply (including preserved interpretations and corrections):",
                     "", json.dumps(note, ensure_ascii=False), ""]
        if row["inspections"]:
            text += ["Actual inspection sequence, in recorded order:", ""]
            for i, visit in enumerate(row["inspections"], 1):
                obs = visit.get("observation", {})
                width = visit.get("boardWidth", obs.get("board", {}).get("width"))
                default_method = ("drag at retained scale" if "drags" in visit else
                                  "overview reset" if visit.get("event") == "overview-inspection" else
                                  "scroll-wheel zoom" if visit.get("event") == "zoom-transition" else
                                  "unrecorded")
                method = visit.get("method", default_method)
                text += [
                    f'{i}. Board {address(visit.get("path", []))} — {visit["purpose"]}. '
                    f'Method: {method}. Execution: {visit.get("elapsedMs", "unrecorded")} ms; '
                    f'recorded scale ratio: {visit.get("zoom", "unrecorded")}; '
                    f'absolute board width: {width} CSS px; '
                    f'drags: {visit.get("drags", visit.get("correctiveDrags", "unrecorded"))}; '
                    f'wheel actions: {visit.get("wheelActions", "unrecorded")}. '
                    f'Start: {visit.get("startedAt", "unrecorded")}.'
                ]
            text += [""]
        if "elapsedSinceSubmissionMs" in event:
            text += [f'Recorded elapsed interval after submission: {event["elapsedSinceSubmissionMs"]} ms '
                     "(includes other activity; not human decision time).", ""]
    text += ["## Original miscellaneous observations", ""]
    for event in data["events"]:
        if not event.get("move") and event.get("event") not in CAMERA_EVENTS:
            text += [f'- {json.dumps(event, ensure_ascii=False)}']
    dest.write_text("\n".join(text) + "\n", encoding="utf-8")
    return audit

if __name__ == "__main__":
    audit = [compile_game(mark) for mark in ("x", "o")]
    (ROOT / "research" / "level4-playstudy-completion-audit.json").write_text(
        json.dumps(audit, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(audit, indent=2))
