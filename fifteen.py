#!/usr/bin/env python3
"""Shared Fifteen rules, state, and game sessions."""

DEFAULT_LEVELS = 1
MULTILEVEL_AI_SECONDS = 0.5

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


def validate_levels(levels):
    if type(levels) is not int or levels < 1:
        raise ValueError("Levels must be a positive whole number.")
    return levels


class Board:
    """Nine recursive children, with the original magic-square rule at each node.

    Deeper boards are created when first played. Missing children represent
    empty Board(levels - 1) objects, avoiding an exponential allocation at setup.
    A drawn child closes its slot without crediting either player's numbers.
    """

    def __init__(self, levels=DEFAULT_LEVELS):
        self.levels = validate_levels(levels)
        self.magic_board = list(MAGIC_BOARD)
        self.players = {1: Player("X"), -1: Player("O")}
        self.children = {}
        self.result = None
        # Consumers can invalidate derived analysis after direct Board edits.
        self.revision = 0

    @property
    def board(self):
        return [0 if isinstance(cell, int) else 1 if cell == "X" else
                -1 if cell == "O" else None for cell in self.magic_board]

    def winning_cells(self):
        return [tuple(sorted(MAGIC_BOARD.index(value) for value in triple))
                for player in self.players.values()
                for triple in winning_triples(player.squares)]

    def refresh_result(self):
        for mark, player in self.players.items():
            if next(winning_triples(player.squares), None) is not None:
                self.result = mark
                return
        self.result = None if any(isinstance(cell, int) for cell in self.magic_board) else 0

    def play(self, path, mark):
        """Apply one leaf move and propagate completed children up the tree."""
        index = path[0]
        if self.result is not None:
            raise ValueError("This board is finished.")
        if not isinstance(self.magic_board[index], int):
            raise ValueError("Square has already been played, please try again.")
        previous, previous_result = self.magic_board[index], self.result
        child_token, created, credit = None, False, None
        if self.levels == 1:
            apply_move(self.magic_board, self.players[mark], index)
            credit = mark
        else:
            child = self.children.get(index)
            if child is None:
                child = self.children[index] = Board(self.levels - 1)
                created = True
            child_token = child.play(path[1:], mark)
            if child.result in (1, -1):
                credit = child.result
                apply_move(self.magic_board, self.players[credit], index)
            elif child.result == 0:
                self.magic_board[index] = "="
        # An unfinished descendant leaves this board's nine slots unchanged.
        if credit is not None or self.magic_board[index] != previous:
            self.refresh_result()
        self.revision += 1
        return index, previous, previous_result, credit, child_token, created

    def undo(self, token):
        index, previous, previous_result, credit, child_token, created = token
        if child_token is not None:
            self.children[index].undo(child_token)
            if created:
                del self.children[index]
        if credit is not None:
            self.players[credit].squares.pop()
        self.magic_board[index] = previous
        self.result = previous_result
        self.revision += 1

    def key(self):
        return (tuple(self.board), tuple((i, child.key())
                for i, child in sorted(self.children.items())))


def empty_paths(levels, order):
    """Enumerate virtual empty descendants without allocating board objects."""
    if levels == 0:
        yield ()
    else:
        for index in order:
            for suffix in empty_paths(levels - 1, order):
                yield (index,) + suffix


class GameState:
    """Recursive position and routing shared by every interface and the AI."""

    def __init__(self, board=None, turn=1, *, levels=DEFAULT_LEVELS):
        self.levels = validate_levels(levels)
        if type(turn) is not int or turn not in (-1, 1):
            raise ValueError("turn must be 1 (X) or -1 (O)")
        if board is not None and levels != 1:
            raise ValueError("Flat imported boards require one level.")
        cells = list(board) if board is not None else [0] * 9
        if len(cells) != 9 or any(type(x) is not int or x not in (-1, 0, 1) for x in cells):
            raise ValueError("board must contain nine values from -1, 0, 1")
        self.root = Board(levels)
        for square, mark in enumerate(cells):
            if mark:
                apply_move(self.root.magic_board, self.root.players[mark], square)
        self.root.refresh_result()
        self.turn = turn
        self.forced = ()
        self.ply = sum(cell != 0 for cell in cells)

    @property
    def magic_board(self):
        return self.root.magic_board

    @property
    def players(self):
        return self.root.players

    @property
    def board(self):
        return self.root.board

    @property
    def remaining(self):
        # An upper bound when finished boards contain unplayed squares.
        return 9 ** self.levels - self.ply

    def winning_cells(self):
        return self.root.winning_cells()

    def outcome(self):
        return self.root.result

    def move_path(self, move):
        if self.levels == 1 and type(move) is int:
            move = (move,)
        if not isinstance(move, (tuple, list)) or len(move) != self.levels:
            raise ValueError(f"Choose a path with {self.levels} positions.")
        if any(type(i) is not int or not 0 <= i < 9 for i in move):
            raise ValueError("Enter a position from 1 to 9.")
        return tuple(move)

    def board_at(self, path):
        """Return an existing board, or None for a virtual empty descendant."""
        node = self.root
        for index in path:
            node = node.children.get(index) if node is not None else None
        return node

    def allows_prefix(self, path):
        """Whether a board/square is inside the permitted unfinished region."""
        if self.outcome() is not None:
            return False
        shared = min(len(path), len(self.forced))
        if tuple(path[:shared]) != self.forced[:shared]:
            return False
        node = self.root
        for index in path:
            if node is None:
                return True
            if node.result is not None or not isinstance(node.magic_board[index], int):
                return False
            node = node.children.get(index)
        return node is None or node.result is None

    def resolve_target(self, destination):
        node, prefix = self.root, ()
        for index in destination:
            if node is None:
                return tuple(destination)
            # A closed child releases only its parent's remaining region.
            if not isinstance(node.magic_board[index], int):
                break
            prefix += (index,)
            node = node.children.get(index)
        return prefix

    def legal_moves(self, order=tuple(range(9)), *, rank=None):
        """Stream legal paths; an optional rank callback changes ordering only."""
        if self.outcome() is not None:
            return

        def descend(node, levels, prefix):
            if node is None:
                if rank is None:
                    for suffix in empty_paths(levels, order):
                        yield prefix + suffix
                    return
            elif node.result is not None:
                return
            indices = rank(node, prefix, order) if rank else order
            for index in indices:
                if node is None or isinstance(node.magic_board[index], int):
                    if levels == 1:
                        yield prefix + (index,)
                    else:
                        yield from descend(node.children.get(index) if node else None,
                                           levels - 1, prefix + (index,))

        node = self.board_at(self.forced)
        for path in descend(node, self.levels - len(self.forced), self.forced):
            yield path[0] if self.levels == 1 else path

    def play(self, move):
        path = self.move_path(move)
        if not self.allows_prefix(path):
            raise ValueError("Choose an empty square in the active board.")
        previous = self.forced, self.turn, self.ply
        board_token = self.root.play(path, self.turn)
        self.ply += 1
        self.turn = -self.turn
        self.forced = self.resolve_target(path[1:]) if self.outcome() is None else ()
        return board_token, previous

    def undo(self, token):
        board_token, previous = token
        self.root.undo(board_token)
        self.forced, self.turn, self.ply = previous


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
    """Solve n=1 exactly; use the same engine with a deadline for larger games."""
    options = {} if position.levels == 1 else {
        "iterative": True, "time_limit": MULTILEVEL_AI_SECONDS}
    result = engine.search(position, max(1, position.remaining), **options)
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

    def __init__(self, mode="human-x", levels=DEFAULT_LEVELS):
        from alpha_beta_engine import AlphaBetaEngine
        self.engine = AlphaBetaEngine()
        self.new_game(mode, levels)

    def new_game(self, mode, levels=DEFAULT_LEVELS, players=None):
        from alpha_beta_engine import FifteenPosition
        if mode not in MODES:
            raise ValueError("Choose one of the four game modes.")
        if players is None:
            players = {mark: "human" if mark in MODES[mode] else "computer"
                       for mark in (1, -1)}
        if set(players) != {1, -1} or any(value not in ("human", "computer", "experimental")
                                        for value in players.values()):
            raise ValueError("Choose Human, Computer, or Experimental for each player.")
        position = FifteenPosition(levels=levels)
        self.controllers = dict(players)
        self.experimental_engine = None
        self.mode = mode
        self.position = position
        self.last_move = None
        self.history = []

    @property
    def over(self):
        return self.position.outcome() is not None

    @property
    def computer_turn(self):
        return not self.over and self.controllers[self.position.turn] != "human"

    def play(self, square):
        if self.over:
            raise ValueError("This game is over. Start a new game.")
        if self.computer_turn:
            raise ValueError("Wait for the computer's move.")
        self._apply(square)

    def computer_move(self):
        if self.computer_turn:
            position, engine = self.position, self.engine
            if self.controllers[position.turn] == "experimental":
                from experimental_ai import ExperimentalEngine, ExperimentalPosition
                if self.experimental_engine is None:
                    self.experimental_engine = ExperimentalEngine()
                engine = self.experimental_engine
                position = ExperimentalPosition.from_game(position)
            self._apply(search_move(position, engine))

    def _apply(self, square):
        mark = "X" if self.position.turn == 1 else "O"
        path = self.position.move_path(square)
        self.position.play(square)
        self.last_move = path[0] if self.position.levels == 1 else path
        self.history.append({"mark": mark, "square": path[0] + 1 if len(path) == 1
                             else [i + 1 for i in path]})


if __name__ == "__main__":
    from ui import main
    main()
