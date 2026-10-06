"""Experimental recursive-potential evaluation using the shared alpha-beta engine.

Potential is a heuristic, not a probability or an alternative outcome rule.
All legal moves, routing, captures and terminal results come from FifteenPosition.
"""

from functools import lru_cache
from math import prod
from time import monotonic

from alpha_beta_engine import AlphaBetaEngine, FifteenPosition
from ai_evaluation import _TRIPLES, local_features, BOARD_VALUE
from fifteen import GameState


@lru_cache(maxsize=50_000)
def combine(children):
    """Combine heuristic child potentials through existing winning triples."""
    values = []
    for side in (0, 1):
        lines = [prod(children[i][side] for i in triple) for triple in _TRIPLES]
        values.append(1 - prod(1 - line for line in lines))
    total = sum(values)
    return (values[0] / total, values[1] / total) if total else (0., 0.)


@lru_cache(maxsize=100_000)
def potential(key, levels):
    """Propagate child opportunities through the parent's winning combinations.

    Immutable shared analysis keys make unchanged subtrees reusable after a move.
    Finished children contribute only their actual result.
    """
    if key is None:
        return .5, .5
    if key.result is not None:
        return float(key.result == 1), float(key.result == -1)
    if levels == 1:
        score, x, o = local_features(key.cells)
        value = max(-.46, min(.46, score / 220))
        return .5 + value, .5 - value
    return combine(tuple(potential(child, levels - 1) for child in key.children))


@lru_cache(maxsize=50_000)
def accessible_potential(key, levels, target, mark):
    """Estimate the value of an available capture, respecting the routed scope.

    This is a horizon feature only: no board state or outcome is changed. Search
    still applies real moves and considers the destination after each capture.
    A free region may realize one opportunity, not every threat at once.
    """
    base = potential(key, levels)
    if key is None or key.result is not None:
        return base
    if levels == 1:
        _, x, o = local_features(key.cells)
        if (x if mark == 1 else o):
            return (1., 0.) if mark == 1 else (0., 1.)
        return base
    children = tuple(potential(child, levels - 1) for child in key.children)
    best = base
    for index in (target[:1] if target else range(9)):
        child = key.children[index]
        improved = accessible_potential(child, levels - 1, target[1:], mark)
        if improved == children[index]:
            continue
        candidate = combine(children[:index] + (improved,) + children[index+1:])
        if (candidate[0] - candidate[1]) * mark > (best[0] - best[1]) * mark:
            best = candidate
    return best


class ExperimentalPosition(FifteenPosition):
    """Same reversible game adapter; different strategic evaluation only."""

    @classmethod
    def from_game(cls, game):
        """Borrow the authoritative board for a synchronous, reversible search."""
        position = cls(levels=game.levels)
        position.root = game.root
        position.turn, position.forced, position.ply = game.turn, game.forced, game.ply
        return position

    def cache_context(self):
        return type(self), 4

    def key(self):
        key = super().key()
        root = getattr(self, '_root_order', None)
        return (key, root[1]) if root and root[0] == self.ply else key

    def legal_moves(self):
        root = getattr(self, '_root_order', None)
        if root and root[0] == self.ply:
            return iter(root[1])
        return super().legal_moves()

    def immediate_wins(self):
        """Find legal whole-game completions from existing magic-square features.

        A one-move cascade must complete a threat at every ancestor. Candidate
        outcomes are still verified by applying the authoritative game move.
        """
        self._analysis.ensure_current()
        def descend(prefix):
            for index in self._analysis.threats(prefix, self.turn):
                path = prefix + (index,)
                if not self.allows_prefix(path):
                    continue
                if len(path) == self.levels:
                    move = path[0] if self.levels == 1 else path
                    mark = self.turn
                    token = self.play(move)
                    try:
                        wins = self.outcome() == mark
                    finally:
                        self.undo(token)
                    if wins:
                        yield move
                else:
                    yield from descend(path)
        return descend(())

    def fallback_score(self):
        if self.levels == 1:
            return super().evaluate()
        self._analysis.ensure_current()
        x, o = accessible_potential(self._analysis.summaries[()].key, self.levels,
                                    self.forced, self.turn)
        # Keep the established evaluation's capture priorities. Connectivity
        # and access refine that score rather than replacing it wholesale.
        return super().evaluate() + round((x - o) * self.turn * BOARD_VALUE)


class ExperimentalEngine(AlphaBetaEngine):
    """Separate engine entry point; search mechanics stay shared."""

    def __init__(self, **kwargs):
        # Root safety is checked separately; broad local-threat extensions made
        # completed iterations too costly in late free-choice positions.
        super().__init__(threat_extensions=0, **kwargs)

    def search(self, position, max_depth, *, iterative=False, time_limit=None):
        if max_depth < 1:
            raise ValueError("max_depth must be at least 1")
        if time_limit is not None and time_limit < 0:
            raise ValueError("time_limit must be nonnegative")
        if position.outcome() is not None or time_limit is None:
            return super().search(position, max_depth, iterative=iterative, time_limit=time_limit)
        started = monotonic()
        # A complete tactical pass provides a useful fallback even if iterative
        # search cannot finish depth one. It deliberately covers every root move.
        wins = tuple(position.immediate_wins())
        ranked = []
        for move in wins or tuple(GameState.legal_moves(position, position._order)):
            token = position.play(move)
            try:
                unsafe = next(position.immediate_wins(), None) is not None if position.outcome() is None else False
                terminal = position.terminal_score()
                score = -(position.fallback_score() if terminal is None else terminal)
                ranked.append((unsafe, -score, move))
            finally:
                position.undo(token)
        ranked.sort(key=lambda item: item[:2])
        safe = [move for unsafe, _, move in ranked if not unsafe]
        order = tuple(safe or [move for _, _, move in ranked])
        position._root_order = position.ply, order
        try:
            remaining = max(0, time_limit - (monotonic() - started))
            return super().search(position, max_depth, iterative=iterative, time_limit=remaining)
        finally:
            del position._root_order
