"""Exact negamax/alpha-beta search for alternating, zero-sum games.

Scores are always relative to the player whose turn it is. Full-depth search
is optimal; a depth limit with a heuristic is not a proof of optimal play.
No game objects are copied during search. Implement Position for other games.
"""

from collections import OrderedDict
from itertools import chain
from dataclasses import dataclass
from math import inf
from time import monotonic
from typing import Hashable, Iterable, Protocol

from fifteen import GameState


class Position(Protocol):
    """Mutable game position. Moves must alternate players.

    key() must include side to move and all rule-relevant history; equality
    must imply identical legal moves, scores, and future outcomes. Scores must
    be finite and position-relative (not relative to the search root or ply).
    legal_moves() returns preferred moves first and must not yield None.
    play() must succeed atomically; undo() must restore the entire position.
    A nonterminal position must have at least one legal move (including pass).
    """

    def key(self) -> Hashable: ...
    def terminal_score(self) -> float | None: ...
    def evaluate(self) -> float: ...
    def legal_moves(self) -> Iterable[Hashable]: ...
    def play(self, move: Hashable) -> object: ...
    def undo(self, token: object) -> None: ...


@dataclass(frozen=True)
class SearchResult:
    move: Hashable | None
    score: float | None
    depth: int
    nodes: int
    cutoffs: int
    cache_hits: int
    timed_out: bool = False


@dataclass(frozen=True)
class _Entry:
    depth: int
    score: float
    bound: str
    move: Hashable


class _Timeout(Exception):
    pass


class AlphaBetaEngine:
    """Reusable, single-search-at-a-time engine with bounded cache memory.

    Set cache_size=0 to disable caching. The table is cleared for each search,
    then shared across iterative-deepening passes. Cached cutoff scores are
    bounds, not exact values. Different-depth entries only guide move ordering.
    """

    def __init__(self, cache_size: int = 100_000):
        if cache_size < 0:
            raise ValueError("cache_size must be nonnegative")
        self.cache_size = cache_size
        self._table = OrderedDict()

    def search(self, position: Position, max_depth: int, *,
               iterative: bool = False, time_limit: float | None = None) -> SearchResult:
        """Search up to max_depth plies, restoring position even on interruption.

        Direct search avoids repeated work when the desired depth is known.
        Iterative search retains the last fully completed result on timeout.
        Before any depth completes, a timeout returns the first legal move and
        score=None. Time limits are cooperative, checked between nodes; slow
        game callbacks can exceed them. A deadline does not imply optimality.
        """
        if max_depth < 1:
            raise ValueError("max_depth must be at least 1")
        if time_limit is not None and time_limit < 0:
            raise ValueError("time_limit must be nonnegative")
        self._table.clear()
        self._nodes = self._cutoffs = self._hits = 0
        self._deadline = None if time_limit is None else monotonic() + time_limit
        terminal = position.terminal_score()
        if terminal is not None:
            return SearchResult(None, terminal, 0, 0, 0, 0)
        fallback = next(iter(position.legal_moves()), None)
        if fallback is None:
            raise ValueError("Nonterminal position has no legal moves")
        move, score, completed, timed_out = fallback, None, 0, False
        depths = range(1, max_depth + 1) if iterative else (max_depth,)
        for depth in depths:
            try:
                new_score, new_move = self._search(position, depth, -inf, inf)
            except _Timeout:
                timed_out = True
                break
            move, score, completed = new_move, new_score, depth
        return SearchResult(move, score, completed, self._nodes,
                            self._cutoffs, self._hits, timed_out)

    def _search(self, position, depth, alpha, beta):
        if self._deadline is not None and monotonic() >= self._deadline:
            raise _Timeout
        self._nodes += 1
        terminal = position.terminal_score()
        if terminal is not None:
            return terminal, None
        if depth == 0:
            return position.evaluate(), None

        original_alpha, original_beta = alpha, beta
        key = position.key() if self.cache_size else None
        entry = self._table.get(key) if self.cache_size else None
        if entry is not None and entry.depth == depth:
            self._hits += 1
            if entry.bound == "exact":
                return entry.score, entry.move
            if entry.bound == "lower":
                alpha = max(alpha, entry.score)
            else:
                beta = min(beta, entry.score)
            if alpha >= beta:
                self._cutoffs += 1
                return entry.score, entry.move

        # Stream moves: the initial recursive board can have 9**n choices.
        # Entries have the same complete position key, so their move is legal.
        moves = position.legal_moves()
        if entry is not None:
            moves = chain((entry.move,), (move for move in moves if move != entry.move))
        best_score, best_move = -inf, None
        for move in moves:
            token = position.play(move)
            try:
                child_score, _ = self._search(position, depth - 1, -beta, -alpha)
                score = -child_score
            finally:
                position.undo(token)
            if score > best_score:
                best_score, best_move = score, move
            alpha = max(alpha, score)
            if alpha >= beta:
                self._cutoffs += 1
                break

        if best_move is None:
            raise ValueError("Nonterminal position has no legal moves")
        if self.cache_size:
            bound = ("upper" if best_score <= original_alpha else
                     "lower" if best_score >= original_beta else "exact")
            if key not in self._table and len(self._table) >= self.cache_size:
                self._table.popitem(last=False)
            self._table[key] = _Entry(depth, best_score, bound, best_move)
        return best_score, best_move


class FifteenPosition(GameState):
    """Search adapter inheriting the shared game's state and move operations."""

    _order = (4, 0, 2, 6, 8, 1, 3, 5, 7)

    def key(self):
        if self.levels == 1:
            return tuple(self.board), self.turn
        return self.levels, self.turn, self.forced, self.root.key()

    def terminal_score(self):
        outcome = self.outcome()
        if outcome is None:
            return None
        return outcome * self.turn * (1 + self.remaining)

    def evaluate(self):
        # Neutral horizon estimate. Use all remaining plies for optimal play.
        return 0

    def legal_moves(self):
        return super().legal_moves(self._order)


if __name__ == "__main__":
    from ui import engine_demo
    engine_demo()
