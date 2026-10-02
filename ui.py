"""Browser presentation and terminal input/output for the shared game."""

import argparse
import json
from fifteen import GameSession, MODES
from version import __version__


class GameUI:
    def __init__(self):
        self.session = GameSession()

    def new_game(self, mode):
        self.session.new_game(mode)
        return self.snapshot()

    def play(self, square):
        self.session.play(square)
        return self.snapshot()

    def computer_move(self):
        self.session.computer_move()
        return self.snapshot()

    def snapshot(self):
        board = self.session.position.board
        # Preserve the existing highlight order when a move completes two wins.
        winning = list(min(self.session.position.winning_cells(), key=lambda cells: (
            0 if cells[1] - cells[0] == 1 else
            1 if cells[1] - cells[0] == 3 else 2, cells), default=()))
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
        humans = MODES[self.session.mode]
        return {"version": __version__, "mode": self.session.mode,
                "board": ["X" if cell == 1 else "O" if cell == -1 else "" for cell in board],
                "status": status, "turn": mark, "over": over,
                "computer_turn": computer, "winning": winning,
                "last_move": self.session.last_move, "history": self.session.history.copy(),
                "players": {"X": "Human" if 1 in humans else "Computer",
                            "O": "Human" if -1 in humans else "Computer"}}


controller = None


def dispatch(payload):
    """Decode browser actions; create a session only when first requested."""
    global controller
    if controller is None:
        controller = GameUI()
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


def print_board(board):
    for i, square in enumerate(board):
        print("\u25A1" if isinstance(square, int) else square, end=" ")
        if i % 3 == 2:
            print()


def move(session):
    while True:
        mark = "X" if session.position.turn == 1 else "O"
        try:
            square = int(input(f"Player {mark} Turn: ")) - 1
        except ValueError:
            print("Enter a position from 1 to 9.")
            continue
        try:
            session.play(square)
        except ValueError as error:
            print(error)
            continue
        return square


def game(ai=False, human="X"):
    if human not in ("X", "O"):
        raise ValueError("human must be X or O")
    session = GameSession("human-" + human.lower() if ai else "human-human")
    if ai:
        print(f"You are {human}. AI is {'O' if human == 'X' else 'X'}. X goes first.")
    print("Choose positions:\n1 2 3\n4 5 6\n7 8 9")
    print_board(session.position.magic_board)
    print("-----")
    while not session.over:
        mark = "X" if session.position.turn == 1 else "O"
        if session.computer_turn:
            session.computer_move()
            print(f"AI ({mark}) chooses position {session.last_move + 1}.")
        else:
            move(session)
        print_board(session.position.magic_board)
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
    args = parse_version_args(parser)
    if args.human is not None and not args.ai:
        parser.error("--human requires --ai")
    try:
        game(ai=args.ai, human=args.human or "X")
    except (EOFError, KeyboardInterrupt):
        print("\nGame ended.")


def engine_demo():
    """Display the existing engine demonstration in the terminal."""
    from alpha_beta_engine import AlphaBetaEngine, FifteenPosition
    parse_version_args()
    result = AlphaBetaEngine().search(FifteenPosition(), max_depth=9)
    print(f"Best opening position: {result.move + 1}; score: {result.score}")
    print(f"Nodes: {result.nodes}; cutoffs: {result.cutoffs}; cache hits: {result.cache_hits}")
