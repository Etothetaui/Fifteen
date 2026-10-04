"""Recursive rules, routing, search restoration, and interface integration."""
import json
import subprocess
import sys
import unittest
from unittest.mock import patch

from fifteen import Board, GameSession, MAGIC_BOARD
from alpha_beta_engine import AlphaBetaEngine, FifteenPosition
from ui import GameUI, dispatch


DRAW = ((0, 1), (1, -1), (2, 1), (4, -1), (3, 1),
        (5, -1), (7, 1), (6, -1), (8, 1))


def fill_win(root, prefix, levels, mark=1):
    if levels == 1:
        for i in (0, 1, 2):
            root.play(prefix + (i,), mark)
    else:
        for i in (0, 1, 2):
            fill_win(root, prefix + (i,), levels - 1, mark)


def fill_draw(root, prefix):
    for index, mark in DRAW:
        root.play(prefix + (index,), mark)


def full_state(position):
    def node(board):
        return (tuple(board.magic_board), board.result,
                tuple((mark, tuple(player.squares)) for mark, player in board.players.items()),
                tuple((i, node(child)) for i, child in sorted(board.children.items())))
    return node(position.root), position.turn, position.forced, position.ply


class RecursiveTests(unittest.TestCase):
    def test_lazy_recursive_structure_and_arbitrary_depth(self):
        for levels in (1, 2, 3, 4, 8):
            position = FifteenPosition(levels=levels)
            self.assertEqual(position.root.children, {})
            move = next(iter(position.legal_moves()))
            path = position.move_path(move)
            self.assertEqual(len(path), levels)
            before = full_state(position)
            token = position.play(move)
            board = position.root
            for index in path[:-1]:
                board = board.children[index]
                self.assertIsInstance(board, Board)
            self.assertEqual(board.players[1].squares, [MAGIC_BOARD[path[-1]]])
            position.undo(token)
            self.assertEqual(full_state(position), before)

    def test_shifted_move_path_and_restricted_moves(self):
        position = FifteenPosition(levels=3)
        position.play((2, 6, 1))
        self.assertEqual(position.forced, (6, 1))
        self.assertEqual(set(position.legal_moves()), {(6, 1, i) for i in range(9)})
        position.play((6, 1, 4))
        self.assertEqual(position.forced, (1, 4))
        before = full_state(position)
        with self.assertRaises(ValueError): position.play((0, 0, 0))
        self.assertEqual(full_state(position), before)

    def test_won_or_drawn_destination_releases_only_nearest_parent(self):
        for draw in (False, True):
            position = FifteenPosition(levels=3)
            if draw:
                fill_draw(position.root, (6, 1))
            else:
                fill_win(position.root, (6, 1), 1)
            position.play((0, 6, 1))
            self.assertEqual(position.forced, (6,))
            moves = list(position.legal_moves())
            self.assertEqual(len(moves), 72)
            self.assertTrue(all(path[0] == 6 and path[1] != 1 for path in moves))

    def test_finished_middle_board_releases_whole_board(self):
        for draw in (False, True):
            position = FifteenPosition(levels=3)
            if draw:
                for i in range(9): fill_draw(position.root, (6, i))
            else:
                fill_win(position.root, (6,), 2)
            position.play((0, 6, 1))
            self.assertEqual(position.forced, ())
            moves = list(position.legal_moves())
            self.assertTrue(any(path[0] == 8 for path in moves))
            self.assertTrue(all(path[0] != 6 for path in moves))

    def test_two_levels_finished_destination_allows_any_open_board(self):
        position = FifteenPosition(levels=2)
        fill_win(position.root, (4,), 1)
        position.play((0, 4))
        self.assertEqual(position.forced, ())
        self.assertTrue(all(path[0] != 4 for path in position.legal_moves()))

    def test_magic_square_win_cascades_and_undo_restores_every_level(self):
        position = FifteenPosition(levels=3)
        # Complete the first two child slots at each step of the final branch.
        for i in (0, 1): fill_win(position.root, (i,), 2)
        for i in (0, 1): fill_win(position.root, (2, i), 1)
        for i in (0, 1): position.root.play((2, 2, i), 1)
        before = full_state(position)
        token = position.play((2, 2, 2))
        self.assertEqual(position.outcome(), 1)
        self.assertEqual(position.root.players[1].squares, list(MAGIC_BOARD[:3]))
        self.assertEqual(list(position.legal_moves()), [])
        with self.assertRaises(ValueError): position.play((8, 8, 8))
        position.undo(token)
        self.assertEqual(full_state(position), before)

    def test_draw_closes_without_crediting_either_player(self):
        position = FifteenPosition(levels=2)
        for i in range(9): fill_draw(position.root, (i,))
        self.assertEqual(position.outcome(), 0)
        self.assertEqual(position.players[1].squares, [])
        self.assertEqual(position.players[-1].squares, [])
        self.assertEqual(list(position.legal_moves()), [])

    def test_search_uses_recursive_legal_moves_and_restores_state(self):
        for levels in (2, 3, 4):
            position = FifteenPosition(levels=levels)
            position.play((0,) * levels)
            before = full_state(position)
            result = AlphaBetaEngine().search(position, 2)
            self.assertIn(result.move, position.legal_moves())
            self.assertEqual(full_state(position), before)
            with patch('alpha_beta_engine.monotonic', side_effect=[0, 0, 0, 2]):
                result = AlphaBetaEngine().search(position, 5, time_limit=1)
            self.assertTrue(result.timed_out)
            self.assertEqual(full_state(position), before)

    def test_key_includes_destination(self):
        position = FifteenPosition(levels=3)
        first = position.key()
        position.forced = (1, 2)
        self.assertNotEqual(first, position.key())

    def test_invalid_moves_and_level_changes_are_atomic(self):
        session = GameSession('human-human', 3)
        before = full_state(session.position)
        for bad in (None, True, 0, (0, 0), (0, 0, 9), (0, False, 0), (0, '1', 0)):
            with self.assertRaises(ValueError): session.play(bad)
            self.assertEqual(full_state(session.position), before)
        for bad in (0, -1, True, 1.5, '2'):
            with self.assertRaises(ValueError): session.new_game('human-o', bad)
            self.assertEqual(session.mode, 'human-human')
            self.assertEqual(full_state(session.position), before)

    def test_browser_level_choices_and_restart(self):
        ui = GameUI()
        state = ui.new_game('human-human', 2)
        self.assertEqual(state['levels'], 2)
        self.assertEqual(len(state['tree']['children']), 9)
        state = ui.play([0, 4])
        self.assertEqual(state['forced'], [4])
        self.assertEqual(state['history'][0]['square'], [1, 5])
        for bad in (4, 0, True, '2'):
            with self.assertRaises(ValueError): ui.new_game('human-human', bad)
            self.assertEqual(ui.snapshot(), state)
        state = ui.new_game('human-human', 3)
        self.assertEqual(state['capacity'], '729')
        self.assertEqual(len(state['tree']['children']), 9)
        state = ui.play([2, 6, 1])
        self.assertEqual(state['forced'], [6, 1])
        leaves = [cell for outer in state['tree']['children']
                  for inner in outer['children'] for cell in inner['children']]
        self.assertEqual(len(leaves), 729)
        self.assertEqual([cell['path'] for cell in leaves if cell['allowed']],
                         [[6, 1, i] for i in range(9)])
        state = ui.new_game('human-human', 1)
        self.assertEqual(state['history'], [])
        self.assertEqual(state['board'], [''] * 9)
        state = json.loads(dispatch(json.dumps({'action':'new','mode':'human-human','levels':2})))
        state = json.loads(dispatch(json.dumps({'action':'play','square':[2,6]})))
        self.assertEqual(state['forced'], [6])

    def test_all_modes_use_recursive_session(self):
        for mode in ('human-human', 'human-x', 'human-o', 'computer-computer'):
            session = GameSession(mode, 2)
            with patch('fifteen.MULTILEVEL_AI_SECONDS', 0):
                if session.computer_turn: session.computer_move()
                else: session.play((0, 4))
            self.assertEqual(len(session.history), 1)
            self.assertEqual(len(session.position.forced), 1)

    def test_terminal_accepts_recursive_paths(self):
        result = subprocess.run([sys.executable, 'fifteen.py', '--levels', '2'],
                                input='1 5\n5 3\n', text=True, capture_output=True,
                                encoding='utf-8', timeout=10,
                                env=__import__('os').environ | {'PYTHONIOENCODING':'utf-8'})
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('Play within board 5.', result.stdout)
        self.assertIn('Play within board 3.', result.stdout)


if __name__ == '__main__':
    unittest.main()
