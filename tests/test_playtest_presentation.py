"""Rule-backed previews must leave the real match untouched."""
import unittest
from ui import GameUI


class PlaytestPresentationTests(unittest.TestCase):
    def test_routing_areas_follow_destinations_not_ancestors(self):
        ui = GameUI()
        ui.new_game('human-human', 4)
        ui.play([4, 4, 4, 4])
        ui.play([4, 4, 4, 0])
        before = ui.snapshot()
        self.assertEqual(before['forced'], [4, 4, 0])
        self.assertEqual(ui.routing_areas(), [[4, 0], [0], []])
        self.assertEqual(ui.snapshot(), before)

    def test_routing_areas_reuse_closed_board_fallback(self):
        ui = GameUI()
        ui.new_game('human-human', 3)
        # A focused presentation fixture: close top-level board 5 through the
        # authoritative Board.play operation, then route toward that board.
        position = ui.session.position
        for child in (0, 1, 2):
            for cell in (0, 1, 2):
                position.root.play((4, child, cell), 1)
        position.forced = (0, 4)
        before = ui.snapshot()
        self.assertEqual(ui.routing_areas(), [[]])
        self.assertEqual(position.resolve_target((4,)), ())
        self.assertEqual(ui.snapshot(), before)

    def test_lens_detail_exposes_cells_without_changing_the_position(self):
        ui = GameUI()
        ui.new_game('human-human', 4)
        before = ui.session.position.ply
        view = {'left': .4, 'top': .4, 'right': .6, 'bottom': .6, 'pixels': 2200}
        ui.set_view(view)
        def cells(tree):
            return 1 if tree['kind'] == 'cell' else sum(cells(child) for child in tree['children'])
        self.assertEqual(cells(ui.visible_tree()), 0)
        ui.set_view(view | {'detailThreshold': 24})
        self.assertGreater(cells(ui.visible_tree()), 0)
        self.assertEqual(ui.session.position.ply, before)
        accepted = ui.view.copy()
        with self.assertRaises(ValueError):
            ui.set_view(view | {'detailThreshold': 0})
        self.assertEqual(ui.view, accepted)

    def test_preview_terminal_capture_preserves_position_and_history(self):
        ui = GameUI()
        ui.new_game('human-human', 1)
        for move in (0, 3, 1, 4):
            ui.play(move)
        before = ui.snapshot()
        preview = ui.preview([2])
        self.assertEqual(preview, {'forced': [], 'outcome': 1,
                                  'closures': [{'path': [], 'result': 1}]})
        self.assertEqual(ui.snapshot(), before)
        self.assertEqual(ui.overview(), {'results': []})

    def test_chained_lens_detail_exposes_level_six_cells_without_a_move(self):
        ui = GameUI()
        ui.new_game('human-human', 6)
        position = ui.session.position
        before = (position.ply, position.turn, position.forced, list(ui.session.history))
        view = {'left': .46, 'top': .46, 'right': .54, 'bottom': .54, 'pixels': 5400}
        def cells(tree):
            return 1 if tree['kind'] == 'cell' else sum(cells(child) for child in tree['children'])
        ui.set_view(view | {'detailThreshold': 24})
        self.assertEqual(cells(ui.visible_tree()), 0)
        ui.set_view(view | {'detailThreshold': 12})
        self.assertGreater(cells(ui.visible_tree()), 0)
        self.assertEqual((position.ply, position.turn, position.forced, list(ui.session.history)), before)
        with self.assertRaises(ValueError):
            ui.set_view(view | {'detailThreshold': 11})

    def test_closed_destination_preview_releases_actual_region(self):
        ui = GameUI()
        ui.new_game('human-human', 2)
        for move in ([4, 0], [0, 4], [4, 1], [1, 4], [4, 2]):
            ui.play(move)
        before = ui.snapshot()
        self.assertEqual(ui.preview([2, 4])['forced'], [])
        self.assertEqual(ui.snapshot(), before)
        self.assertEqual(ui.overview(), {'results': [{'path': [4], 'result': 1}]})
        with self.assertRaises(ValueError):
            ui.preview([4, 3])
        self.assertEqual(ui.snapshot(), before)


if __name__ == '__main__':
    unittest.main()
