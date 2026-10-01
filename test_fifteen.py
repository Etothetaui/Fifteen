"""Integration checks for the playable alpha-beta mode."""

import contextlib
import io
import os
import subprocess
import sys
import unittest
from unittest.mock import patch

from alpha_beta_engine import AlphaBetaEngine
from fifteen import MAGIC_BOARD, Player, apply_move, choose_ai_move, game, move
from test_alpha_beta_engine import outcome, reachable, reference
from version import __version__


class GameTests(unittest.TestCase):
    def test_adapter_chooses_optimal_move_in_every_nonterminal_position(self):
        engine = AlphaBetaEngine()
        for cells, turn in reachable():
            if outcome(cells, turn) is not None:
                continue
            board = [MAGIC_BOARD[i] if cell == 0 else 'X' if cell == 1 else 'O'
                     for i, cell in enumerate(cells)]
            before = board.copy()
            player = Player('X' if turn == 1 else 'O')
            square = choose_ai_move(board, player, engine)
            self.assertEqual(board, before)
            self.assertEqual(player.squares, [])
            self.assertEqual(cells[square], 0)
            child = cells[:square] + (turn,) + cells[square + 1:]
            self.assertEqual(-reference(child, -turn), reference(cells, turn))

    def test_perfect_human_draws_with_either_symbol(self):
        human_engine = AlphaBetaEngine()

        def perfect_human(board, player):
            square = choose_ai_move(board, player, human_engine)
            apply_move(board, player, square)
            return square

        for symbol in ('X', 'O'):
            output = io.StringIO()
            with patch('fifteen.move', side_effect=perfect_human), contextlib.redirect_stdout(output):
                self.assertIsNone(game(ai=True, human=symbol))
            self.assertIn("It's a tie!", output.getvalue())
            self.assertIn('AI (', output.getvalue())

    def test_input_retries_without_corrupting_state(self):
        board = list(MAGIC_BOARD)
        board[0] = 'O'
        player = Player('X')
        with patch('builtins.input', side_effect=['bad', '0', '-1', '10', '1', '2']), contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(move(board, player), 1)
        self.assertEqual(board, ['O', 'X', *MAGIC_BOARD[2:]])
        self.assertEqual(player.squares, [MAGIC_BOARD[1]])

    def run_cli(self, *args, text=''):
        return subprocess.run([sys.executable, 'fifteen.py', *args], input=text,
                              capture_output=True, text=True, encoding='utf-8',
                              env=os.environ | {'PYTHONIOENCODING': 'utf-8'}, timeout=10)

    def test_two_human_win_and_tie(self):
        for moves, expected in [('1\n4\n2\n5\n3\n', 'Player X wins!'),
                                ('1\n2\n3\n5\n4\n6\n8\n7\n9\n', "It's a tie!")]:
            result = self.run_cli(text=moves)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn(expected, result.stdout)

    def test_cli_options_and_ai_opening(self):
        self.assertEqual(self.run_cli('--version').stdout.strip(), f'Fifteen v{__version__}')
        self.assertIn('--ai', self.run_cli('--help').stdout)
        self.assertEqual(self.run_cli('--human', 'O').returncode, 2)
        self.assertEqual(self.run_cli('--ai', '--human', 'Z').returncode, 2)
        result = self.run_cli('--ai', '--human', 'O')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('AI (X) chooses position', result.stdout)
        self.assertIn('Game ended.', result.stdout)


if __name__ == '__main__':
    unittest.main()
