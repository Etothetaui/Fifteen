"""Search equivalence, tactical choices, and incremental-analysis restoration."""

import random
import unittest
from unittest.mock import patch

from alpha_beta_engine import AlphaBetaEngine, FifteenPosition
from ai_evaluation import RecursiveAnalysis, TreeKey, local_features, WIN_SCORE
from fifteen import GameState
from tests.test_recursive import fill_win, fill_draw, full_state


def reference(position, depth, extensions=0):
    terminal = position.terminal_score()
    if terminal is not None:
        return terminal
    if depth == 0:
        if extensions and position.is_tactical():
            depth, extensions = 1, extensions - 1
        else:
            return position.evaluate()
    best = float('-inf')
    # Independent exhaustive minimax; uses only the authoritative legal rules.
    for move in GameState.legal_moves(position):
        token = position.play(move)
        try:
            best = max(best, -reference(position, depth - 1, extensions))
        finally:
            position.undo(token)
    return best


class ImprovedSearchTests(unittest.TestCase):
    def test_local_features_respect_drawn_slots_and_colors(self):
        cells = (1, 1, 0, 0, 0, 0, 0, 0, 0)
        score, x, o = local_features(cells)
        self.assertIn(2, x)
        self.assertFalse(o)
        flipped = tuple(-v for v in cells)
        other, _, threats = local_features(flipped)
        self.assertEqual(score, -other)
        self.assertEqual(x, threats)
        self.assertFalse(local_features((1, 1, None, 0, 0, 0, 0, 0, 0))[1])

    def test_incremental_matches_rebuild_through_play_and_undo(self):
        rng = random.Random(7)
        for levels in (2, 3, 5):
            position = FifteenPosition(levels=levels)
            initial = full_state(position), position.key(), position.evaluate()
            tokens = []
            for _ in range(45):
                moves = GameState.legal_moves(position)
                # Avoid materializing the huge initial move list at level 5.
                candidates = [move for _, move in zip(range(25), moves)]
                if not candidates:
                    break
                tokens.append(position.play(rng.choice(candidates)))
                rebuilt = RecursiveAnalysis(position)
                rebuilt.ensure_current()
                self.assertEqual(position._analysis.summaries, rebuilt.summaries)
                self.assertEqual(position.evaluate(), rebuilt.evaluate())
                self.assertEqual(position.is_tactical(), rebuilt.is_tactical())
            for token in reversed(tokens):
                position.undo(token)
                rebuilt = RecursiveAnalysis(position)
                rebuilt.ensure_current()
                self.assertEqual(position._analysis.summaries, rebuilt.summaries)
            self.assertEqual((full_state(position), position.key(), position.evaluate()), initial)

    def test_cascade_and_draw_analysis_restoration(self):
        for draw in (False, True):
            position = FifteenPosition(levels=3)
            position.key()  # Existing analysis must notice direct Board edits.
            fill_win(position.root, (0,), 2)
            if draw:
                fill_draw(position.root, (1, 0))
            else:
                fill_win(position.root, (1,), 2)
                for i in (0, 1): fill_win(position.root, (2, i), 1)
                for i in (0, 1): position.root.play((2, 2, i), 1)
            before = position.key(), position.evaluate(), full_state(position)
            token = position.play((2, 2, 2))
            rebuilt = RecursiveAnalysis(position)
            rebuilt.ensure_current()
            self.assertEqual(position._analysis.summaries, rebuilt.summaries)
            position.undo(token)
            self.assertEqual((position.key(), position.evaluate(), full_state(position)), before)

    def test_exact_key_checks_equality_even_when_hashes_collide(self):
        first = TreeKey((0,) * 9, (), None)
        other = TreeKey((1,) + (0,) * 8, (), None)
        object.__setattr__(other, '_hash', hash(first))
        self.assertNotEqual(first, other)
        self.assertEqual(len({first: 1, other: 2}), 2)

    def test_ordering_preserves_legal_moves_and_prioritizes_win(self):
        position = FifteenPosition(levels=2)
        position.root.play((4, 0), 1)
        position.root.play((4, 1), 1)
        position.forced = (4,)
        ordered = list(position.legal_moves())
        self.assertEqual(set(ordered), set(GameState.legal_moves(position)))
        self.assertEqual(ordered[0], (4, 2))
        result = AlphaBetaEngine().search(position, 1)
        self.assertEqual(result.move, (4, 2))

    def test_evaluation_values_parent_win_and_destination(self):
        position = FifteenPosition(levels=2)
        empty = position.evaluate()
        fill_win(position.root, (0,), 1)
        self.assertGreater(position.evaluate(), empty)
        position.root.play((4, 0), -1)
        position.root.play((4, 1), -1)
        position.turn = -1
        position.forced = (4,)
        urgent = position.evaluate()
        position.forced = (8,)
        self.assertGreater(urgent, position.evaluate())
        self.assertFalse(position.is_tactical())
        position.forced = (4,)
        self.assertTrue(position.is_tactical())
        self.assertLess(abs(position.evaluate()), WIN_SCORE)

    def test_pvs_matches_unpruned_minimax_with_extensions(self):
        for levels in (2, 3):
            position = FifteenPosition(levels=levels)
            position.play((4,) * levels)
            for extensions in (0, 1):
                for depth in (1, 2, 3):
                    expected = reference(position, depth, extensions)
                    before = full_state(position), position.key(), position.evaluate()
                    for pvs in (False, True):
                        result = AlphaBetaEngine(pvs=pvs, threat_extensions=extensions).search(position, depth)
                        self.assertEqual(result.score, expected)
                        self.assertEqual((full_state(position), position.key(), position.evaluate()), before)

    def test_threat_extension_searches_all_replies_and_is_bounded(self):
        position = FifteenPosition(levels=2)
        position.root.play((4, 0), -1)
        position.root.play((4, 1), -1)
        position.forced = (4,)
        for budget in (0, 1, 2):
            result = AlphaBetaEngine(threat_extensions=budget).search(position, 1)
            self.assertEqual(result.score, reference(position, 1, budget))

    def test_cache_reused_across_turns_without_depth_contamination(self):
        position = FifteenPosition(levels=2)
        position.play((4, 4))
        engine = AlphaBetaEngine(threat_extensions=0)
        first = engine.search(position, 3)
        position.play(first.move)
        warm = engine.search(position, 2)
        cold = AlphaBetaEngine(threat_extensions=0).search(position, 2)
        self.assertEqual(warm.score, cold.score)
        self.assertGreater(warm.cache_hits, 0)
        self.assertLess(warm.nodes, cold.nodes)
        shallow = engine.search(position, 1)
        self.assertEqual(shallow.score, reference(position, 1))
        engine.clear_cache()
        self.assertFalse(engine._table)

    def test_timeout_and_exception_restore_incremental_analysis(self):
        position = FifteenPosition(levels=3)
        position.play((4, 4, 4))
        before = full_state(position), position.key(), position.evaluate()
        with patch('alpha_beta_engine.monotonic', side_effect=[0] * 12 + [2] * 100):
            result = AlphaBetaEngine().search(position, 10, iterative=True, time_limit=1)
        self.assertTrue(result.timed_out)
        self.assertEqual((full_state(position), position.key(), position.evaluate()), before)
        with patch.object(position, 'evaluate', side_effect=RuntimeError('test')):
            with self.assertRaises(RuntimeError): AlphaBetaEngine().search(position, 1)
        self.assertEqual((full_state(position), position.key(), position.evaluate()), before)

    def test_analysis_failure_leaves_play_atomic(self):
        position = FifteenPosition(levels=3)
        before = full_state(position), position.key(), position.evaluate()
        import ai_evaluation
        original = ai_evaluation.advance_board
        calls = 0

        def fail_parent(*args):
            nonlocal calls
            calls += 1
            if calls == 2:
                raise RuntimeError('analysis interrupted')
            return original(*args)

        with patch('ai_evaluation.advance_board', side_effect=fail_parent):
            with self.assertRaises(RuntimeError): position.play((4, 4, 4))
        self.assertEqual((full_state(position), position.key(), position.evaluate()), before)

    def test_pvs_supports_fractional_scores_and_generic_cache_isolation(self):
        class FractionalTree:
            def __init__(self, scores):
                self.scores, self.path = scores, ()

            def key(self): return self.path
            def terminal_score(self):
                if len(self.path) == 2:
                    return self.scores[self.path[0]][self.path[1]]
                return None
            def evaluate(self): return 0
            def legal_moves(self): return range(3)
            def play(self, move):
                previous = self.path
                self.path += (move,)
                return previous
            def undo(self, token): self.path = token

        engine = AlphaBetaEngine()
        for scores in (((.12, .11, .19), (.16, .13, .14), (.15, .17, .18)),
                       ((-.21, -.28, -.27), (-.11, -.09, -.10), (-.18, -.15, -.17))):
            position = FractionalTree(scores)
            result = engine.search(position, 2)
            self.assertAlmostEqual(result.score, max(map(min, scores)))
            self.assertEqual(position.path, ())


if __name__ == '__main__':
    unittest.main()
