"""Browser presentation and terminal input/output for the shared game."""

import argparse
import json
import math
from fifteen import GameSession, MODES, DEFAULT_LEVELS
from version import __version__

# Presentation choices reuse the game's existing arbitrary-depth recursive rules.
UI_LEVELS = (1, 2, 3, 4, 5, 6)
# Expand a leaf board only when its nine cells are roughly 32px wide.
# This bounds visible DOM density independently of total game capacity.
DETAIL_THRESHOLD = 96


class GameUI:
    def __init__(self):
        self.session = GameSession()
        self.view = {"left": 0, "top": 0, "right": 1, "bottom": 1, "pixels": 600}

    def new_game(self, mode, levels=DEFAULT_LEVELS, players=None):
        if type(levels) is not int or levels not in UI_LEVELS:
            raise ValueError("Choose one of the available levels.")
        controllers = None if players is None else {1: players.get("X"), -1: players.get("O")}
        self.session.new_game(mode, levels, controllers)
        return self.snapshot()

    def play(self, square):
        self.session.play(square)
        return self.snapshot()

    def computer_move(self):
        self.session.computer_move()
        return self.snapshot()

    @staticmethod
    def winning_display(node):
        # Preserve n=1's highlight order when a move completes two wins.
        return list(min(node.winning_cells(), key=lambda cells: (
            0 if cells[1] - cells[0] == 1 else
            1 if cells[1] - cells[0] == 3 else 2, cells), default=())) if node else []

    def board_view(self, node, levels, path, *, detail=None, depth=None, bounds=(0, 0, 1)):
        """Format the recursive state; all permissions and results come from the game."""
        position = self.session.position
        allowed = position.allows_prefix(path)
        result = node.result if node else None
        data = {"kind": "board", "path": list(path), "levels": levels,
                "allowed": allowed, "result": result}
        left, top, size = bounds
        # Cull presentation detail, never game state. Python still supplies each
        # collapsed board's permissions/result and all visible leaf permissions.
        outside = detail is not None and (left + size < detail["left"] or
            left > detail["right"] or top + size < detail["top"] or top > detail["bottom"])
        if depth == 0 or (detail is not None and (outside or size * detail["pixels"] < detail.get("detailThreshold", DETAIL_THRESHOLD))):
            return data | {"children": [], "collapsed": True}
        winning = self.winning_display(node)
        marks = node.board if node else [0] * 9
        children = []
        last = self.session.last_move
        last_path = (last,) if type(last) is int else last
        for index in range(9):
            child_path = path + (index,)
            if levels == 1:
                mark = marks[index]
                child = {"kind": "cell", "path": list(child_path),
                         "mark": "X" if mark == 1 else "O" if mark == -1 else "",
                         "allowed": position.allows_prefix(child_path),
                         "last": child_path == last_path}
            else:
                child = self.board_view(node.children.get(index) if node else None,
                    levels - 1, child_path, detail=detail,
                    depth=None if depth is None else depth - 1,
                    bounds=(left + index % 3 * size / 3,
                            top + index // 3 * size / 3, size / 3))
            child["winning"] = index in winning
            children.append(child)
        data["children"] = children
        return data

    def set_view(self, view):
        """Validate normalized viewport geometry; it cannot change the match."""
        fields = ("left", "top", "right", "bottom", "pixels")
        if not isinstance(view, dict) or any(type(view.get(key)) not in (int, float) or
                not math.isfinite(view[key]) for key in fields):
            raise ValueError("Invalid board viewport.")
        if not (0 <= view["left"] <= view["right"] <= 1 and
                0 <= view["top"] <= view["bottom"] <= 1 and 0 < view["pixels"]):
            raise ValueError("Invalid board viewport.")
        # A lens can expose smaller cells without changing any game permissions.
        if "detailThreshold" in view:
            threshold = view["detailThreshold"]
            if type(threshold) not in (int, float) or not math.isfinite(threshold) or not 12 <= threshold <= DETAIL_THRESHOLD:
                raise ValueError("Invalid board detail threshold.")
        self.view = {key: view[key] for key in fields}
        if "detailThreshold" in view:
            self.view["detailThreshold"] = threshold

    def visible_tree(self):
        position = self.session.position
        return self.board_view(position.root, position.levels, (),
                               detail=self.view if position.levels > 3 else None)

    def inspect(self, path):
        """One picker layer, using the same renderer and authoritative permissions."""
        position = self.session.position
        if not isinstance(path, list) or len(path) >= position.levels or any(
                type(index) is not int or not 0 <= index < 9 for index in path):
            raise ValueError("Invalid board path.")
        return self.board_view(position.board_at(tuple(path)), position.levels - len(path),
                               tuple(path), depth=1)

    def overview(self):
        """Sparse actual results for auxiliary views; never expand empty capacity."""
        results = []
        pending = [((), self.session.position.root)]
        while pending:
            path, node = pending.pop()
            if node.result is not None:
                results.append({"path": list(path), "result": node.result})
            pending.extend((path + (index,), child) for index, child in node.children.items())
        return {"results": results}

    def preview(self, path):
        """Read hypothetical routing using the game's existing reversible move."""
        position = self.session.position
        path = position.move_path(path)
        before = [(path[:depth], getattr(position.board_at(path[:depth]), "result", None))
                  for depth in range(position.levels)]
        # No session history/last-move mutation, and restore even if formatting fails.
        token = position.play(path)
        try:
            closures = [{"path": list(prefix), "result": position.board_at(prefix).result}
                        for prefix, previous in before
                        if previous is None and position.board_at(prefix).result is not None]
            return {"forced": list(position.forced), "outcome": position.outcome(), "closures": closures}
        finally:
            position.undo(token)

    def routing_areas(self):
        """Successive destination scopes using the existing target resolver.

        The unspecified move digits range over each scope. Later choices and
        closures can change these scopes; this is not a prediction of moves.
        """
        position = self.session.position
        if position.outcome() is not None:
            return []
        area = position.forced
        scopes = []
        while area:
            area = position.resolve_target(area[1:])
            scopes.append(list(area))
        return scopes

    def snapshot(self):
        board = self.session.position.board
        winning = self.winning_display(self.session.position.root)
        over = self.session.over
        mark = "X" if self.session.position.turn == 1 else "O"
        computer = self.session.computer_turn
        if winning:
            status = f"{'X' if board[winning[0]] == 1 else 'O'} wins."
        elif over:
            status = "Draw."
        elif computer:
            status = f"Computer {mark} is moving…"
        else:
            status = f"{mark} to move."
        labels = {"human": "Human", "computer": "Computer", "experimental": "Experimental"}
        position = self.session.position
        scope = " / ".join(str(i + 1) for i in position.forced)
        instruction = ("Choose an empty square. X always starts." if position.levels == 1
                       else f"Play within board {scope}." if scope else "Play in any unfinished board.")
        return {"version": __version__, "mode": self.session.mode,
                "levels": position.levels, "default_levels": DEFAULT_LEVELS,
                "capacity": str(9 ** position.levels), "instruction": instruction,
                "forced": list(position.forced),
                "routing_areas": self.routing_areas(),
                "tree": self.visible_tree(),
                "picker": self.inspect([]) if position.levels > 3 else None,
                "board": ["X" if cell == 1 else "O" if cell == -1 else "" for cell in board],
                "status": status, "turn": mark, "over": over,
                "computer_turn": computer, "winning": winning,
                "last_move": self.session.last_move, "history": self.session.history.copy(),
                "players": {mark: labels[self.session.controllers[value]]
                            for mark, value in (("X", 1), ("O", -1))}}


controller = None


def dispatch(payload):
    """Decode browser actions; create a session only when first requested."""
    global controller
    if controller is None:
        controller = GameUI()
    request = json.loads(payload)
    if "view" in request:
        controller.set_view(request["view"])
    action = request.get("action")
    if action == "new":
        result = controller.new_game(request.get("mode"), request.get("levels", DEFAULT_LEVELS),
                                     request.get("players"))
    elif action == "play":
        result = controller.play(request.get("square"))
    elif action == "computer":
        result = controller.computer_move()
    elif action == "view":
        result = {"tree": controller.visible_tree()}
    elif action == "inspect":
        result = {"picker": controller.inspect(request.get("path"))}
    elif action == "overview":
        result = controller.overview()
    elif action == "preview":
        result = controller.preview(request.get("path"))
    else:
        raise ValueError("Unknown game action.")
    return json.dumps(result)


def print_board(board):
    for i, square in enumerate(board):
        print("\u25A1" if isinstance(square, int) else square, end=" ")
        if i % 3 == 2:
            print()


def print_position(position):
    if position.levels == 1:
        print_board(position.magic_board)
        return
    pending = [((), position.root)]
    while pending:
        path, node = pending.pop()
        label = " / ".join(str(i + 1) for i in path) or "Whole board"
        print(f"Board {label}:")
        print_board(node.magic_board)
        pending.extend((path + (i,), child) for i, child in reversed(sorted(node.children.items())))
    target = " / ".join(str(i + 1) for i in position.forced)
    print(f"Play within board {target}." if target else "Play in any unfinished board.")


def move(session):
    while True:
        mark = "X" if session.position.turn == 1 else "O"
        try:
            raw = input(f"Player {mark} Turn: ")
            square = (int(raw) - 1 if session.position.levels == 1 else
                      tuple(int(part) - 1 for part in raw.split()))
        except ValueError:
            print("Enter a position from 1 to 9.")
            continue
        try:
            session.play(square)
        except ValueError as error:
            print(error)
            continue
        return square


def game(ai=False, human="X", levels=DEFAULT_LEVELS):
    if human not in ("X", "O"):
        raise ValueError("human must be X or O")
    session = GameSession("human-" + human.lower() if ai else "human-human", levels)
    if ai:
        print(f"You are {human}. AI is {'O' if human == 'X' else 'X'}. X goes first.")
    print("Choose positions:\n1 2 3\n4 5 6\n7 8 9")
    if levels > 1:
        print(f"Enter {levels} positions separated by spaces, from outer board to square.")
        print("Unplayed boards are empty. Finished boards cannot be played.")
    print_position(session.position)
    print("-----")
    while not session.over:
        mark = "X" if session.position.turn == 1 else "O"
        if session.computer_turn:
            session.computer_move()
            path = session.position.move_path(session.last_move)
            label = " / ".join(str(i + 1) for i in path)
            print(f"AI ({mark}) chooses position {label}.")
        else:
            move(session)
        print_position(session.position)
        print("-----")
    winner = session.position.outcome()
    if winner:
        mark = "X" if winner == 1 else "O"
        print(f"Player {mark} wins!")
        return mark
    print("It's a tie!")
    return None


def parse_version_args(parser=None):
    """Handle the shared command-line version flag before starting a game."""
    if parser is None:
        parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--version", action="version", version=f"Fifteen v{__version__}")
    return parser.parse_args()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ai", action="store_true", help="play against the alpha-beta AI")
    parser.add_argument("--human", choices=("X", "O"), default=None,
                        help="your symbol in AI mode: X goes first (default: X)")
    parser.add_argument("--levels", type=int, choices=UI_LEVELS, default=DEFAULT_LEVELS,
                        help="number of recursive board levels (default: %(default)s)")
    args = parse_version_args(parser)
    if args.levels < 1:
        parser.error("--levels must be positive")
    if args.human is not None and not args.ai:
        parser.error("--human requires --ai")
    try:
        game(ai=args.ai, human=args.human or "X", levels=args.levels)
    except (EOFError, KeyboardInterrupt):
        print("\nGame ended.")


def engine_demo():
    """Display the existing engine demonstration in the terminal."""
    from alpha_beta_engine import AlphaBetaEngine, FifteenPosition
    parse_version_args()
    result = AlphaBetaEngine().search(FifteenPosition(), max_depth=9)
    print(f"Best opening position: {result.move + 1}; score: {result.score}")
    print(f"Nodes: {result.nodes}; cutoffs: {result.cutoffs}; cache hits: {result.cache_hits}")
