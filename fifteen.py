#!/usr/bin/env python3
"""Shared Fifteen rules, state, and game sessions."""

MAGIC_BOARD = (6, 1, 8, 7, 5, 3, 2, 9, 4)


class Player:
    def __init__(self, sym):
        self.sym = sym
        self.squares = []


def winning_triples(squares, *, latest_only=False):
    """Use the original sum-to-15 rule; optionally check only the latest move."""
    # Imported search positions have no move order, so check each possible
    # final move. The original latest-move helper remains available below.
    ends = (len(squares) - 1,) if latest_only else range(2, len(squares))
    for last in ends:
        for i in range(last):
            for j in range(i + 1, last):
                if squares[i] + squares[j] + squares[last] == 15:
                    yield (squares[i], squares[j], squares[last])


def isWinner(player):
    return next(winning_triples(player.squares, latest_only=True), None) is not None


def apply_move(board, player, square):
    """Apply a validated zero-based move for either a human or the AI."""
    if not isinstance(square, int) or not 0 <= square < 9:
        raise ValueError("Enter a position from 1 to 9.")
    if not isinstance(board[square], int):
        raise ValueError("Square has already been played, please try again.")
    player.squares.append(board[square])
    board[square] = player.sym


class GameState:
    """Original magic-square state; custom boards must be reachable positions."""

    def __init__(self, board=None, turn=1):
        cells = list(board) if board is not None else [0] * 9
        if len(cells) != 9 or any(x not in (-1, 0, 1) for x in cells):
            raise ValueError("board must contain nine values from -1, 0, 1")
        if turn not in (-1, 1):
            raise ValueError("turn must be 1 (X) or -1 (O)")
        self.magic_board = list(MAGIC_BOARD)
        self.players = {1: Player("X"), -1: Player("O")}
        for square, mark in enumerate(cells):
            if mark:
                apply_move(self.magic_board, self.players[mark], square)
        self.turn = turn

    @property
    def board(self):
        """Presentation/cache encoding; game state retains the magic numbers."""
        return [0 if isinstance(cell, int) else 1 if cell == "X" else -1
                for cell in self.magic_board]

    def winning_cells(self):
        """Return every winning triple as board indices, without display ordering."""
        return [tuple(sorted(MAGIC_BOARD.index(value) for value in triple))
                for player in self.players.values()
                for triple in winning_triples(player.squares)]

    def outcome(self):
        """Return the winning mark, zero for a draw, or None while playing."""
        for mark, player in self.players.items():
            if next(winning_triples(player.squares), None) is not None:
                return mark
        return None if any(isinstance(cell, int) for cell in self.magic_board) else 0

    def play(self, move):
        apply_move(self.magic_board, self.players[self.turn], move)
        self.turn = -self.turn
        return move

    def undo(self, token):
        self.turn = -self.turn
        self.magic_board[token] = self.players[self.turn].squares.pop()


def choose_ai_move(board, player, engine):
    """Translate the game's magic-square board at the engine boundary."""
    from alpha_beta_engine import FifteenPosition

    cells = [0 if isinstance(cell, int) else (1 if cell == "X" else -1)
             for cell in board]
    position = FifteenPosition(cells, 1 if player.sym == "X" else -1)
    # Search to terminal positions with no deadline: no heuristic fallback can
    # weaken the never-lose guarantee from a legal starting position.
    return search_move(position, engine)


def search_move(position, engine):
    """Use full-depth search for all game interfaces."""
    result = engine.search(position, max(1, position.board.count(0)))
    if result.move is None:
        raise ValueError("Cannot choose a move after the game is over.")
    return result.move


# Human-controlled marks for each mode. Labels belong to the UI.
MODES = {
    "human-human": (1, -1),
    "human-x": (1,),
    "human-o": (-1,),
    "computer-computer": (),
}


class GameSession:
    """Mode selection and turn progression shared by both interfaces."""

    def __init__(self, mode="human-x"):
        from alpha_beta_engine import AlphaBetaEngine
        self.engine = AlphaBetaEngine()
        self.new_game(mode)

    def new_game(self, mode):
        from alpha_beta_engine import FifteenPosition
        if mode not in MODES:
            raise ValueError("Choose one of the four game modes.")
        self.mode = mode
        self.position = FifteenPosition()
        self.last_move = None
        self.history = []

    @property
    def over(self):
        return self.position.outcome() is not None

    @property
    def computer_turn(self):
        return not self.over and self.position.turn not in MODES[self.mode]

    def play(self, square):
        if self.over:
            raise ValueError("This game is over. Start a new game.")
        if self.computer_turn:
            raise ValueError("Wait for the computer's move.")
        if type(square) is not int:
            raise ValueError("Choose an empty square.")
        self._apply(square)

    def computer_move(self):
        if self.computer_turn:
            self._apply(search_move(self.position, self.engine))

    def _apply(self, square):
        mark = "X" if self.position.turn == 1 else "O"
        self.position.play(square)
        self.last_move = square
        self.history.append({"mark": mark, "square": square + 1})


if __name__ == "__main__":
    from ui import main
    main()
