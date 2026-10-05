"""Derived search analysis. Rules, move application, and outcomes stay in fifteen."""

from dataclasses import dataclass, field
from functools import lru_cache

from fifteen import MAGIC_BOARD, winning_triples


# Derive opportunities from the authoritative sum-to-15 rule, not geometry.
_TRIPLES = tuple(tuple(MAGIC_BOARD.index(value) for value in triple)
                 for triple in winning_triples(MAGIC_BOARD))
BOARD_VALUE = 512
WIN_SCORE = 100_000
EVALUATION_VERSION = 1


@lru_cache(maxsize=16_384)
def local_features(cells):
    """Potential and immediate completion squares, viewed from X's side.

    None denotes a drawn child: it blocks a combination for both players.
    These are evaluation features, never a replacement for Board.result.
    """
    score = 0
    threats = {1: set(), -1: set()}
    for triple in _TRIPLES:
        values = [cells[i] for i in triple]
        for mark in (1, -1):
            if None in values or -mark in values:
                continue
            count = values.count(mark)
            score += mark * (0, 3, 24, 96)[count]
            if count == 2:
                threats[mark].update(i for i in triple if cells[i] == 0)
    # Two distinct completion squares are more urgent than a single threat.
    score += 32 * (max(0, len(threats[1]) - 1) - max(0, len(threats[-1]) - 1))
    return score, frozenset(threats[1]), frozenset(threats[-1])


@dataclass(frozen=True, slots=True)
class TreeKey:
    """Persistent exact key with a cached hash; collisions still check equality.

    Children are immutable keys shared with earlier positions. Hashing a parent
    uses nine cached child hashes, without walking the whole recursive board.
    """
    cells: tuple
    children: tuple
    result: int | None
    _hash: int = field(init=False, repr=False, compare=False)

    def __post_init__(self):
        object.__setattr__(self, '_hash', hash((self.cells, self.children, self.result)))

    def __hash__(self):
        return self._hash


@dataclass(frozen=True, slots=True)
class Analysis:
    key: TreeKey
    score: float
    x_threats: frozenset
    o_threats: frozenset
    tactical: bool
    child_scores: tuple
    tactical_children: int


def _summary(board, cells, child_keys, child_scores, tactical_children):
    local, x_threats, o_threats = local_features(cells)
    score = board.result * BOARD_VALUE if board.result is not None else max(
        1 - BOARD_VALUE, min(BOARD_VALUE - 1, local + sum(child_scores) / 12))
    tactical = board.result is None and (bool(x_threats or o_threats) if board.levels == 1
                                        else tactical_children > 0)
    return Analysis(TreeKey(cells, child_keys, board.result), score, x_threats,
                    o_threats, tactical, child_scores, tactical_children)


_EMPTY = Analysis(TreeKey((0,) * 9, (None,) * 9, None), 0, frozenset(), frozenset(), False, (0,) * 9, 0)


def analyze_board(board, children):
    """Combine at most nine child summaries; their combined weight is < 1.

    Winning a board matters more than accumulated progress within its children.
    Closed boards contribute only their outcome, not their abandoned squares.
    """
    return _summary(board, tuple(board.board), tuple(children[i].key if i in children else None
                    for i in range(9)), tuple(children[i].score if i in children else 0 for i in range(9)),
                    sum(child.tactical for child in children.values()))


def advance_board(board, previous, index, old_child, new_child):
    """Change one slot and one child contribution, sharing all other key parts."""
    previous = previous or _EMPTY
    value = board.magic_board[index]
    value = 0 if isinstance(value, int) else 1 if value == 'X' else -1 if value == 'O' else None
    cells = previous.key.cells
    if cells[index] != value:
        cells = cells[:index] + (value,) + cells[index + 1:]
    keys = previous.key.children
    scores, tactical = previous.child_scores, previous.tactical_children
    if new_child is not None:
        old_child = old_child or _EMPTY
        keys = keys[:index] + (new_child.key,) + keys[index + 1:]
        # Sum the same nine slots in the same order to avoid accumulating
        # floating-point drift across different move histories.
        scores = scores[:index] + (new_child.score,) + scores[index + 1:]
        tactical += int(new_child.tactical) - int(old_child.tactical)
    return _summary(board, cells, keys, scores, tactical)


class RecursiveAnalysis:
    """Incremental evaluation attached to an existing GameState, with reversible updates."""

    def __init__(self, position):
        self.position = position
        self.summaries = {}
        self.revision = -1

    def ensure_current(self):
        if self.revision == self.position.root.revision:
            return
        # Covers imported/directly edited Board trees. Normal search never
        # takes this path after initialization: update/restore touch ancestors.
        self.summaries.clear()

        def visit(board, path):
            children = {i: visit(child, path + (i,)) for i, child in board.children.items()}
            summary = analyze_board(board, children)
            self.summaries[path] = summary
            return summary

        visit(self.position.root, ())
        self.revision = self.position.root.revision

    def update(self, path):
        nodes = [((), self.position.root)]
        for index in path[:-1]:
            prefix, node = nodes[-1]
            nodes.append((prefix + (index,), node.children[index]))
        previous = [(prefix, self.summaries.get(prefix)) for prefix, _ in nodes]
        try:
            for depth in reversed(range(len(nodes))):
                prefix, node = nodes[depth]
                child_path = prefix + (path[depth],)
                self.summaries[prefix] = advance_board(
                    node, previous[depth][1], path[depth],
                    previous[depth + 1][1] if node.levels > 1 else None,
                    self.summaries[child_path] if node.levels > 1 else None)
        except BaseException:
            self.restore(previous)
            raise
        self.revision = self.position.root.revision
        return previous

    def restore(self, previous):
        for path, summary in previous:
            if summary is None:
                self.summaries.pop(path, None)
            else:
                self.summaries[path] = summary
        self.revision = self.position.root.revision

    def threats(self, path, mark):
        summary = self.summaries.get(path)
        if summary is None:
            return frozenset()
        return summary.x_threats if mark == 1 else summary.o_threats

    def evaluate(self):
        self.ensure_current()
        p = self.position
        score = self.summaries[()].score
        # The directed region determines who can realize local opportunities.
        # Its contribution shrinks with depth, preserving the parent's value.
        target = self.summaries.get(p.forced) if p.forced else None
        if target is not None:
            weight = 12 ** len(p.forced)
            score += (target.score / 4 + p.turn * 48 * len(self.threats(p.forced, p.turn))) / weight
        return max(-WIN_SCORE // 2, min(WIN_SCORE // 2, round(score * p.turn * 16)))

    def rank(self, node, prefix, order):
        p = self.position
        own, other = self.threats(prefix, p.turn), self.threats(prefix, -p.turn)
        # Keep quiet nodes cheap. Sorting tiny positional differences here
        # cost more than it saved in fixed-depth browser-game benchmarks.
        tactical_tree = self.summaries[()].tactical
        if not own and not other and not tactical_tree:
            return order

        def priority(index):
            score = 2000 * (index in own) + 1000 * (index in other)
            child = self.summaries.get(prefix + (index,))
            if child is not None:
                score += child.score * p.turn
            if len(prefix) == p.levels - 1 and tactical_tree:
                # A cheap destination estimate for ordering, not a rule or a
                # forced-move filter. Search applies the real move and routing.
                destination = p.resolve_target((prefix + (index,))[1:])
                target = self.summaries.get(destination)
                if target is not None:
                    score += target.score * p.turn / 4
                    score -= 300 * len(self.threats(destination, -p.turn))
            return score

        return sorted(order, key=priority, reverse=True)

    def is_tactical(self):
        """Extend only when an allowed leaf has an immediate local threat."""
        self.ensure_current()
        p = self.position
        target = self.summaries.get(p.forced)
        return target is not None and target.tactical
