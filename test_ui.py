import unittest
from ui import GameUI, MODES


class UITests(unittest.TestCase):
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
