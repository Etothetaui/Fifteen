import unittest
from ui import GameUI, MODES


class UITests(unittest.TestCase):
    def test_every_reachable_board_uses_magic_square_results(self):
        from alpha_beta_engine import FifteenPosition
        from fifteen import MAGIC_BOARD
        from test_alpha_beta_engine import reachable, outcome
        ui = GameUI()
        for cells, turn in reachable():
            ui.position = FifteenPosition(cells, turn)
            state = ui.snapshot()
            expected = outcome(cells, turn)
            self.assertEqual(state['over'], expected is not None)
            self.assertEqual(bool(state['winning']), expected not in (None, 0))
            if state['winning']:
                self.assertEqual(sum(MAGIC_BOARD[i] for i in state['winning']), 15)
                self.assertEqual(len({cells[i] for i in state['winning']}), 1)

    def test_original_move_state_is_restored_after_search(self):
        from fifteen import MAGIC_BOARD
        ui = GameUI()
        ui.play(0)
        self.assertEqual(ui.position.players[1].squares, [6])
        self.assertEqual(ui.position.magic_board, ['X', *MAGIC_BOARD[1:]])
        before = {mark: player.squares.copy() for mark, player in ui.position.players.items()}
        ui.engine.search(ui.position, 8)
        self.assertEqual({mark: player.squares for mark, player in ui.position.players.items()}, before)
        self.assertEqual(ui.position.magic_board, ['X', *MAGIC_BOARD[1:]])

    def test_four_modes_and_restart(self):
        ui = GameUI()
        for mode in MODES:
            state = ui.new_game(mode)
            self.assertEqual(state['board'], [''] * 9)
            if state['computer_turn']:
                state = ui.computer_move()
            else:
                state = ui.play(0)
            self.assertEqual(len(state['history']), 1)
            reset = ui.new_game(mode)
            self.assertEqual(reset['history'], [])
            self.assertEqual(reset['turn'], 'X')

    def test_computers_draw_and_stop(self):
        ui = GameUI()
        state = ui.new_game('computer-computer')
        for _ in range(9):
            state = ui.computer_move()
        self.assertTrue(state['over'])
        self.assertFalse(state['computer_turn'])
        self.assertEqual(state['winning'], [])
        self.assertEqual(ui.computer_move(), state)

    def test_win_and_illegal_actions(self):
        ui = GameUI()
        ui.new_game('human-human')
        for cell in (0, 3, 1, 4, 2):
            state = ui.play(cell)
        self.assertEqual(state['winning'], [0, 1, 2])
        self.assertEqual(state['status'], 'X wins.')
        with self.assertRaises(ValueError): ui.play(8)
        ui.new_game('human-o')
        with self.assertRaises(ValueError): ui.play(0)
        ui.new_game('human-human')
        for bad in (-1, 9, '1', True, None):
            with self.assertRaises(ValueError): ui.play(bad)
        ui.play(0)
        with self.assertRaises(ValueError): ui.play(0)
        with self.assertRaises(ValueError): ui.new_game('invalid')


if __name__ == '__main__': unittest.main()
