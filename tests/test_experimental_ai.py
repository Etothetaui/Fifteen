"""Experimental AI tactical safety and shared-state preservation."""
import json
from pathlib import Path
import unittest

from experimental_ai import ExperimentalEngine, ExperimentalPosition
from fifteen import GameState
from ui import GameUI


class ExperimentalTests(unittest.TestCase):
    def replay(self, plies):
        p = ExperimentalPosition(levels=3)
        rows = json.loads((Path(__file__).resolve().parents[1] /
                           'benchmarks/assistant-level3-match.json').read_text())
        for row in rows:
            for side in ('x', 'o'):
                if p.ply == plies:
                    return p
                p.play(tuple(int(i)-1 for i in row[side]))
        return p

    def test_logged_terminal_threat_is_detected_and_blocked_on_timeout(self):
        p = self.replay(249)
        before = p.key(), p.forced, p.turn, p.evaluate()
        result = ExperimentalEngine().search(p, p.remaining, iterative=True, time_limit=0)
        self.assertEqual(before, (p.key(), p.forced, p.turn, p.evaluate()))
        self.assertIn(result.move, list(GameState.legal_moves(p)))
        p.play(result.move)
        self.assertEqual(list(p.immediate_wins()), [])

    def test_logged_final_win_is_taken_on_timeout(self):
        p = self.replay(250)
        result = ExperimentalEngine().search(p, p.remaining, iterative=True, time_limit=0)
        p.play(result.move)
        self.assertEqual(p.outcome(), 1)

    def test_level_one_remains_exact(self):
        p = ExperimentalPosition()
        engine = ExperimentalEngine()
        while p.outcome() is None:
            p.play(engine.search(p, p.remaining).move)
        self.assertEqual(p.outcome(), 0)

    def test_evaluation_and_state_restore_at_arbitrary_levels(self):
        for levels in (1, 2, 3, 5):
            p = ExperimentalPosition(levels=levels)
            before = p.key(), p.evaluate()
            tokens = []
            for _ in range(15):
                move = next(iter(p.legal_moves()), None)
                if move is None:
                    break
                tokens.append(p.play(move))
                self.assertLess(abs(p.evaluate()), 100_000)
            for token in reversed(tokens):
                p.undo(token)
            self.assertEqual(before, (p.key(), p.evaluate()))

    def test_all_nine_player_combinations_and_restart(self):
        ui = GameUI()
        for x in ('human', 'computer', 'experimental'):
            for o in ('human', 'computer', 'experimental'):
                state = ui.new_game('human-human', players={'X': x, 'O': o})
                self.assertEqual(state['players'], {'X': x.title(), 'O': o.title()})
                if x == 'human':
                    ui.play(0)
                else:
                    ui.computer_move()
                if o == 'human':
                    ui.play(next(iter(ui.session.position.legal_moves())))
                else:
                    ui.computer_move()
                self.assertEqual(len(ui.session.history), 2)
                self.assertEqual(ui.new_game('human-x')['history'], [])

    def test_borrowed_adapter_restores_shared_board(self):
        original = GameState(levels=3)
        original.play((4, 4, 4))
        before = original.root.key(), original.turn, original.forced, original.ply
        borrowed = ExperimentalPosition.from_game(original)
        result = ExperimentalEngine().search(borrowed, 2)
        self.assertIs(borrowed.root, original.root)
        self.assertEqual(before, (original.root.key(), original.turn, original.forced, original.ply))
        original.play(result.move)
        self.assertEqual(original.ply, 2)

    def test_routed_capture_has_more_value_than_inaccessible_threat(self):
        p = ExperimentalPosition(levels=3)
        # Build through the authoritative board operations; vary only access.
        p.root.play((0, 0, 0), 1)
        p.root.play((0, 0, 1), 1)
        p.root.play((8, 8, 0), -1)
        p.root.play((8, 7, 0), -1)
        p.ply = 4
        p.forced = (8, 8)
        inaccessible = p.fallback_score()
        p.forced = (0, 0)
        accessible = p.fallback_score()
        self.assertGreater(accessible, inaccessible)
        self.assertIsNone(p.outcome())
        self.assertIsNone(p.board_at((0, 0)).result)

    def test_immediate_win_candidates_match_authoritative_outcomes(self):
        for ply in (224, 235, 242, 249, 250):
            p = self.replay(ply)
            expected = set()
            mark = p.turn
            for move in list(GameState.legal_moves(p)):
                token = p.play(move)
                if p.outcome() == mark:
                    expected.add(move)
                p.undo(token)
            self.assertEqual(set(p.immediate_wins()), expected)


if __name__ == '__main__':
    unittest.main()
