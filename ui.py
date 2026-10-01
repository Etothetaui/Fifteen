"""Browser UI controller, shared by Pyodide and local Python tests.

The HTML layer renders these snapshots; all turns, rules, and AI choices stay
in Python. No network service or server-side Python is required.
"""

import json
from alpha_beta_engine import AlphaBetaEngine, FifteenPosition
from version import __version__

MODES = {
    "human-human": ("Two players", (1, -1)),
    "human-x": ("You as X", (1,)),
    "human-o": ("You as O", (-1,)),
    "computer-computer": ("Watch computers", ()),
}


class GameUI:
    def __init__(self):
        self.engine = AlphaBetaEngine()
        self.new_game("human-x")

    def new_game(self, mode):
        if mode not in MODES:
            raise ValueError("Choose one of the four game modes.")
        self.mode = mode
        self.position = FifteenPosition()
        self.last_move = None
        self.history = []
        return self.snapshot()

    def play(self, square):
        if self.position.terminal_score() is not None:
            raise ValueError("This game is over. Start a new game.")
        if self.position.turn not in MODES[self.mode][1]:
            raise ValueError("Wait for the computer's move.")
        if type(square) is not int:
            raise ValueError("Choose an empty square.")
        self._apply(square)
        return self.snapshot()

    def computer_move(self):
        if self.position.terminal_score() is None and self.position.turn not in MODES[self.mode][1]:
            result = self.engine.search(self.position, self.position.board.count(0))
            self._apply(result.move)
        return self.snapshot()

    def _apply(self, square):
        mark = "X" if self.position.turn == 1 else "O"
        self.position.play(square)
        self.last_move = square
        self.history.append({"mark": mark, "square": square + 1})

    def snapshot(self):
        board = self.position.board
        winning = list(self.position.winning_squares())
        over = self.position.terminal_score() is not None
        mark = "X" if self.position.turn == 1 else "O"
        computer = not over and self.position.turn not in MODES[self.mode][1]
        if winning:
            status = f"{'X' if board[winning[0]] == 1 else 'O'} wins."
        elif over:
            status = "Draw."
        elif computer:
            status = f"Computer {mark} is moving…"
        else:
            status = f"{mark} to move."
        humans = MODES[self.mode][1]
        return {"version": __version__, "mode": self.mode,
                "board": ["X" if cell == 1 else "O" if cell == -1 else "" for cell in board],
                "status": status, "turn": mark, "over": over,
                "computer_turn": computer, "winning": winning,
                "last_move": self.last_move, "history": self.history.copy(),
                "players": {"X": "Human" if 1 in humans else "Computer",
                            "O": "Human" if -1 in humans else "Computer"}}


controller = GameUI()


def dispatch(payload):
    """Small JSON boundary; only named UI actions are accepted."""
    request = json.loads(payload)
    action = request.get("action")
    if action == "new":
        result = controller.new_game(request.get("mode"))
    elif action == "play":
        result = controller.play(request.get("square"))
    elif action == "computer":
        result = controller.computer_move()
    else:
        raise ValueError("Unknown game action.")
    return json.dumps(result)
