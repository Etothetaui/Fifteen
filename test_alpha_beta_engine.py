"""Independent exhaustive checks for the standard-game search adapter."""

import itertools
import unittest
from functools import lru_cache
from unittest.mock import patch

from alpha_beta_engine import AlphaBetaEngine, FifteenPosition


MAGIC = (6, 1, 8, 7, 5, 3, 2, 9, 4)


def outcome(board, turn):
    for player in (1, -1):
        values = [MAGIC[i] for i, mark in enumerate(board) if mark == player]
        if any(sum(triple) == 15 for triple in itertools.combinations(values, 3)):
            return player * turn * (1 + board.count(0))
    return None if 0 in board else 0


@lru_cache(None)
def reference(board, turn):
    result = outcome(board, turn)
    if result is not None:
        return result
    return max(-reference(board[:i] + (turn,) + board[i + 1:], -turn)
               for i, mark in enumerate(board) if mark == 0)


def reachable():
    pending = [((0,) * 9, 1)]
    seen = set()
    while pending:
        board, turn = pending.pop()
        if (board, turn) in seen:
            continue
        seen.add((board, turn))
        yield board, turn
        if outcome(board, turn) is None:
            pending.extend((board[:i] + (turn,) + board[i + 1:], -turn)
                           for i, mark in enumerate(board) if mark == 0)


class EngineTests(unittest.TestCase):
    def test_every_reachable_position(self):
        engines = [AlphaBetaEngine(0), AlphaBetaEngine(8), AlphaBetaEngine()]
        positions = list(reachable())
        self.assertEqual(len(positions), 5478)
        for board, turn in positions:
            for engine in engines:
                position = FifteenPosition(board, turn)
                result = engine.search(position, max(1, board.count(0)))
                self.assertEqual(result.score, reference(board, turn), (board, turn))
                self.assertEqual(position.key(), (board, turn))
                self.assertLessEqual(len(engine._table), engine.cache_size)
                if outcome(board, turn) is None:
                    self.assertEqual(board[result.move], 0)
                    child = board[:result.move] + (turn,) + board[result.move + 1:]
                    self.assertEqual(-reference(child, -turn), result.score)
                else:
                    self.assertIsNone(result.move)

    def test_iterative_matches_direct_at_each_depth(self):
        for board, turn in list(reachable())[::53]:
            for depth in range(1, board.count(0) + 1):
                position = FifteenPosition(board, turn)
                direct = AlphaBetaEngine().search(position, depth)
                iterative = AlphaBetaEngine().search(position, depth, iterative=True)
                self.assertEqual(iterative.score, direct.score)
                self.assertEqual(position.key(), (board, turn))

    def test_pruning_reduces_work(self):
        result = AlphaBetaEngine().search(FifteenPosition(), 9)
        self.assertEqual(result.score, 0)
        self.assertGreater(result.cutoffs, 0)
        self.assertGreater(result.cache_hits, 0)
        # Complete unpruned tree of legal games has 549,946 nodes.
        self.assertLess(result.nodes, 549946)

    def test_timeout_restores_position_and_returns_legal_fallback(self):
        position = FifteenPosition()
        initial = position.key()
        with patch('alpha_beta_engine.monotonic', side_effect=[0, 0, 0, 2]):
            result = AlphaBetaEngine().search(position, 9, time_limit=1)
        self.assertTrue(result.timed_out)
        self.assertEqual(result.depth, 0)
        self.assertIsNone(result.score)
        self.assertIn(result.move, list(position.legal_moves()))
        self.assertEqual(position.key(), initial)

    def test_iterative_timeout_retains_completed_result(self):
        position = FifteenPosition()
        # Deadline setup, root plus nine leaves, next iteration root.
        with patch('alpha_beta_engine.monotonic', side_effect=[0] * 11 + [2]):
            result = AlphaBetaEngine().search(position, 9, iterative=True, time_limit=1)
        self.assertTrue(result.timed_out)
        self.assertEqual(result.depth, 1)
        self.assertEqual(result.score, 0)
        self.assertEqual(position.key(), ((0,) * 9, 1))

    def test_callback_exception_restores_position(self):
        position = FifteenPosition()
        with patch.object(position, 'evaluate', side_effect=RuntimeError('evaluation failed')):
            with self.assertRaises(RuntimeError):
                AlphaBetaEngine().search(position, 1)
        self.assertEqual(position.key(), ((0,) * 9, 1))


if __name__ == '__main__':
    unittest.main()
