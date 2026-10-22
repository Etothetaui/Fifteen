"""Contract checks for the actual ten-level interface, against original rules."""
import json
import random
import tempfile
import threading
import unittest
from copy import deepcopy
from pathlib import Path
from http.server import ThreadingHTTPServer
from urllib.request import Request, urlopen

from fifteen import GameState, MAGIC_BOARD, winning_triples
from campaign import Campaign, CIRCUITS, place_identity
from relay_server import Handler


class RelayContractTests(unittest.TestCase):
    def setUp(self):
        self.c = Campaign()

    def action(self, name, **kwargs):
        return self.c.action(dict(action=name, revision=self.c.revision, **kwargs))

    def assertSame(self, reference):
        p = self.c.position
        self.assertEqual(p.root.key(), reference.root.key())
        self.assertEqual((p.turn, p.forced, p.ply, p.outcome()),
                         (reference.turn, reference.forced, reference.ply, reference.outcome()))

    def test_long_sequence_choices_previews_and_restoration(self):
        self.action('new', mode='human-human')
        ref = GameState(levels=10)
        rng = random.Random(83)
        for _ in range(300):
            # Pick a whole address through authoritative prefix permissions.
            prefix = ()
            for depth in range(10):
                options = [i for i in range(9) if ref.allows_prefix(prefix+(i,))]
                prefix += (rng.choice(options),)
            before, history = self.c.position.key(), self.c.export()
            preview = self.action('preview', path=list(prefix))
            self.assertEqual(self.c.position.key(), before)
            self.assertEqual(self.c.export(), history)
            expected = ref.play(prefix)
            self.assertEqual(tuple(preview['destination']), ref.forced)
            self.action('play', path=list(prefix))
            self.assertSame(ref)
            if rng.random() < .15:
                self.action('undo')
                ref.undo(expected)
                self.assertSame(ref)

    def test_reply_preview_does_not_commit_either_move(self):
        path = [4]*10
        predicted = self.action('preview', path=path)
        reply = list(predicted['destination_focus'])+[2]
        before, exported = self.c.position.key(), self.c.export()
        result = self.action('preview', path=path, reply=reply)
        ref = GameState(levels=10)
        ref.play(path);ref.play(reply)
        self.assertEqual(result['reply']['destination'], ref.forced)
        self.assertEqual(self.c.position.key(), before)
        self.assertEqual(self.c.export(), exported)

    def test_parent_shows_local_threats_without_awarding_ownership(self):
        parent=(4,)*8
        for relay in (0,1):
            self.c.position.root.play(parent+(0,relay),-1)
        for relay in (3,4):
            self.c.position.root.play(parent+(4,relay),1)
        self.c.position.forced=parent+(4,)
        before=self.c.position.key()
        boards=len(self.c.position.root.children)
        result=self.c.snapshot(parent)
        self.assertEqual((result['slots'][0]['blue_progress'],result['slots'][0]['red_progress']),(0,2))
        self.assertEqual((result['slots'][4]['blue_progress'],result['slots'][4]['red_progress']),(2,0))
        self.assertEqual((result['slots'][8]['blue_progress'],result['slots'][8]['red_progress']),(0,0))
        self.assertTrue(all(s['owner']==0 for s in result['slots']))
        self.assertEqual([s['index'] for s in result['slots'] if s['legal']],[4])
        self.assertEqual(self.c.position.key(),before)
        self.assertEqual(len(self.c.position.root.children),boards)

    def test_continuity_facts_are_real_history_not_preview_activity(self):
        self.action('new', mode='human-human')
        self.action('play', path=[0] * 10)
        self.action('play', path=[0] * 9 + [4])
        saved, key = self.c.export(), self.c.position.key()
        records = self.c.fronts()['fronts']
        for record in records:
            state = self.c.snapshot(record['path'])
            self.assertEqual(record['blue_claims'], sum(s['owner'] == 1 for s in state['slots']))
            self.assertEqual(record['red_claims'], sum(s['owner'] == -1 for s in state['slots']))
            self.assertEqual(record['orders'], sum(state['activity_totals'].values()))
        prefix = self.c.focus()
        hints = self.action('choices', prefix=list(prefix))['choices']
        for hint in hints:
            self.assertEqual(hint['prior_orders'], self.c.activity.get(tuple(hint['destination']), 0))
        self.assertEqual(self.c.export(), saved)
        self.assertEqual(self.c.position.key(), key)

    def test_worked_example_is_a_legal_recording_separate_from_live_play(self):
        from relay_example import WorkedExample
        example = WorkedExample()
        self.action('play', path=[0] * 10)
        before, key = self.c.export(), self.c.position.key()
        steps = [example.snapshot(i) for i in range(5)]
        self.assertEqual([s['recorded_ply'] for s in steps], list(range(150, 155)))
        self.assertTrue(all(s['live_game_unchanged'] for s in steps))
        self.assertEqual(steps[2]['view']['result'], -1)
        self.assertEqual(steps[3]['view']['result'], 1)
        self.assertTrue(steps[2]['effect']['gains'])
        self.assertTrue(steps[3]['effect']['gains'])
        # Callers cannot mutate the cached replay or another visitor's view.
        steps[3]['view']['slots'].clear()
        self.assertEqual(len(example.snapshot(3)['view']['slots']), 9)
        with self.assertRaises(ValueError):
            example.snapshot(5)
        self.assertEqual(self.c.export(), before)
        self.assertEqual(self.c.position.key(), key)

    def test_undo_label_and_capture_warning_match_actual_operations(self):
        self.assertEqual(self.c.snapshot()['undo_plies'], 0)
        self.action('play', path=[0] * 10)
        self.assertEqual(self.c.snapshot()['undo_plies'], 1)
        self.action('ai')
        count = self.c.snapshot()['undo_plies']
        self.assertEqual(count, 2)
        self.action('undo')
        self.assertEqual(self.c.position.ply, 0)
        self.test_choice_hints_check_actual_opponent_capture_and_restore()
        hints = self.action('choices', prefix=list(self.c.focus()))['choices']
        for hint in hints:
            self.assertEqual(hint['opponent_capture'], hint['capture_reply'] is not None)
            if hint['capture_reply']:
                self.assertTrue(hint['capture_reply']['effect']['gains'])

    def test_landmarks_replay_and_undo_without_speculative_numbers(self):
        self.action('new', mode='human-human')
        self.action('play', path=[0] * 10)
        self.assertEqual(self.c.snapshot([0] * 9)['place']['number'], 1)
        numbers = dict(self.c.place_numbers)
        self.action('preview', path=[0] * 9 + [4])
        self.assertEqual(self.c.place_numbers, numbers)
        self.action('play', path=[0] * 9 + [4])
        self.action('play', path=[0] * 8 + [4, 0])
        save = self.c.export()
        replay = Campaign()
        replay.restore(save, persist=False)
        self.assertEqual(replay.place_numbers, self.c.place_numbers)
        self.assertEqual(self.c.snapshot([0] * 8 + [4])['place']['number'], 2)
        self.action('undo')
        self.assertNotIn(tuple([0] * 8 + [4]), self.c.place_numbers)
        self.action('new', mode='human-human')
        self.assertEqual(self.c.place_numbers, {})

    def test_opening_example_reaches_a_second_claim_via_original_moves(self):
        from relay_example import WorkedExample
        example = WorkedExample()
        first = example.snapshot(0, 'opening')
        self.assertEqual(first['recorded_ply'], 0)
        self.assertTrue(all(s['owner'] == 0 for s in first['view']['slots']))
        last = example.snapshot(6, 'opening')
        self.assertEqual(last['recorded_ply'], 15)
        self.assertTrue(any(o['azure_open'] and o['azure'] == 2 for o in last['view']['objectives']))
        self.assertEqual(last['effect']['path'][:-1], example.snapshot(4, 'opening')['effect']['path'][:-1])

    def test_naturally_played_countercapture_matches_original_rules(self):
        # Recorded through visible controls from an empty L10 world. Unlike
        # the prepared cascade, both local captures arose in normal play.
        save=json.loads((Path(__file__).parent/'fixtures'/'relay-countercapture.json').read_text())
        moves=[tuple(i-1 for i in move) for move in save['moves']]
        start={**save,'mode':'human-human','moves':save['moves'][:150]}
        self.c.restore(start)
        reference=GameState(levels=10)
        for path in moves[:150]:
            reference.play(path)
        self.assertSame(reference)
        for index,path in enumerate(moves[150:],start=150):
            before=self.c.position.key()
            preview=self.action('preview',path=list(path))
            self.assertEqual(self.c.position.key(),before)
            reference.play(path)
            self.assertEqual(preview['destination'],reference.forced)
            if index in (151,152):
                self.assertEqual(preview['gains'],[{'path':path[:-1],'owner':-1 if index==151 else 1}])
            self.action('play',path=list(path))
            self.assertSame(reference)
        self.assertEqual(self.c.captured,{1:1,-1:2,0:0})

    def test_hypothetical_explorer_uses_post_move_permissions(self):
        before=self.c.position.key()
        result=self.action('preview',path=[4]*10,inspect=[4]*8)
        self.assertFalse(result['next_view']['leaf'])
        self.assertEqual([s['legal'] for s in result['next_view']['slots']],
                         [False]*4+[True]+[False]*4)
        result=self.action('preview',path=[4]*10,inspect=[4]*9)
        self.assertFalse(result['next_view']['slots'][4]['legal'])
        self.assertEqual(self.c.position.key(),before)
        with self.assertRaises(ValueError):
            self.action('preview',path=[4]*10,inspect=[9])
        self.assertEqual(self.c.position.key(),before)

    def test_choice_hints_check_actual_opponent_capture_and_restore(self):
        prefix=(4,)*9
        target=(4,)*8+(0,)
        for i in (0,1):
            self.c.position.root.play(target+(i,),-1)
        self.c.position.forced=prefix
        before=self.c.position.key()
        result=self.action('choices',prefix=list(prefix))
        self.assertTrue(next(c for c in result['choices'] if c['index']==0)['opponent_capture'])
        self.assertFalse(next(c for c in result['choices'] if c['index']==1)['opponent_capture'])
        self.assertEqual(self.c.position.key(),before)
        self.assertEqual(self.c.position.ply,0)

    def test_ten_move_planner_matches_rules_and_restores_failures(self):
        ref=GameState(levels=10)
        moves=[]
        for _ in range(10):
            path=next(ref.legal_moves())
            moves.append(list(path))
            ref.play(path)
        before,save=self.c.position.key(),self.c.export()
        plan=self.action('plan',moves=moves)
        self.assertEqual(plan['destination'],ref.forced)
        self.assertEqual(plan['turn'],ref.turn)
        self.assertEqual(len(plan['effects']),10)
        node=ref.board_at(tuple(plan['view']['prefix']))
        self.assertEqual([s['owner'] for s in plan['view']['slots']],node.board if node else [0]*9)
        self.assertEqual(self.c.position.key(),before)
        self.assertEqual(self.c.export(),save)
        with self.assertRaises(ValueError):
            self.action('plan',moves=[moves[0],[9]*10])
        self.assertEqual(self.c.position.key(),before)
        with self.assertRaises(ValueError):
            self.action('plan',moves=moves,inspect=[9])
        self.assertEqual(self.c.position.key(),before)

    def test_all_levels_cascade_uses_original_rule_and_one_move(self):
        # Prepared endgame fixture: setup is not offered as gameplay. At each
        # level seed two original winning children and leave the third short
        # by exactly the one leaf the UI will preview and commit.
        triple = tuple(MAGIC_BOARD.index(v) for v in next(winning_triples(MAGIC_BOARD)))
        leaf = (triple[-1],)*10

        def prepare(prefix, levels, incomplete):
            for child in triple:
                pending = incomplete and child == triple[-1]
                if levels == 1:
                    if not pending:
                        self.c.position.root.play(prefix+(child,), 1)
                else:
                    prepare(prefix+(child,), levels-1, pending)
        prepare((),10,True)
        self.c.position.forced=leaf[:-1]
        before=self.c.position.root.key()
        preview=self.action('preview',path=list(leaf))
        self.assertEqual(len(preview['gains']),10)
        self.assertEqual(preview['outcome'],1)
        self.assertEqual(self.c.position.root.key(),before)
        self.action('play',path=list(leaf))
        self.assertEqual(self.c.position.ply,1)
        self.assertEqual(self.c.position.outcome(),1)
        self.action('undo')
        self.assertEqual(self.c.position.root.key(),before)

    def test_closed_target_releases_nearest_parent_and_draws(self):
        prefix=(4,)*9
        # Original draw sequence; no UI-defined completion rule.
        for i,mark in enumerate((1,1,-1,-1,-1,1,1,-1,1)):
            self.c.position.root.play(prefix+(i,),mark)
        self.assertEqual(self.c.position.board_at(prefix).result,0)
        self.c.position.forced=(0,)+(4,)*8
        path=(0,)+(4,)*9
        preview=self.action('preview',path=list(path))
        self.assertEqual(preview['destination'],(4,)*8)
        plan=self.action('plan',moves=[list(path)])
        self.assertEqual(plan['view']['prefix'],(4,)*8)
        self.assertFalse(plan['view']['slots'][4]['legal'])
        self.action('play',path=list(path))
        self.assertEqual(self.c.position.forced,(4,)*8)
        view=self.c.snapshot((4,)*8)
        self.assertFalse(view['slots'][4]['legal'])
        self.assertIsNone(view['slots'][4]['owner'])

    def test_save_replay_ai_and_failed_import_preserve_state(self):
        self.assertFalse(self.c.snapshot()["save_enabled"])
        with tempfile.TemporaryDirectory() as folder:
            self.c=Campaign(Path(folder)/'save.json')
            self.assertTrue(self.c.snapshot()["save_enabled"])
            self.action('play',path=[4]*10)
            self.action('ai')
            self.assertEqual(self.c.position.ply,2)
            restored=Campaign(self.c.save_path)
            self.assertEqual(restored.position.key(),self.c.position.key())
            original=self.c.position.key()
            invalid=self.c.export();invalid['moves'].append([0]*10)
            with self.assertRaises(ValueError):
                self.action('import',save=invalid)
            self.assertEqual(self.c.position.key(),original)
            self.action('undo')
            self.assertEqual(self.c.position.ply,0)
            self.assertEqual(len(self.c.position.root.children),0)

    def test_link_sets_and_all_navigation_permissions_are_authoritative(self):
        self.assertEqual(CIRCUITS,tuple(tuple(MAGIC_BOARD.index(v) for v in t)
                                     for t in winning_triples(MAGIC_BOARD)))
        self.action('play',path=[4]*10)
        for depth in range(10):
            for prefix in ((4,)*depth,(8,)*depth):
                view=self.c.snapshot(prefix)
                self.assertEqual([s['legal'] for s in view['slots']],
                                 [self.c.position.allows_prefix(prefix+(i,)) for i in range(9)])

    def test_world_activity_tracks_real_moves_replay_undo_and_reset(self):
        self.action('new',mode='human-human')
        for path in ([4]*10,[4]*9+[0],[4]*8+[0,2]):
            self.action('play',path=path)
        world=self.c.snapshot(())
        self.assertEqual(world['activity_totals'],{'blue':2,'red':1})
        self.assertEqual((world['slots'][4]['blue_orders'],world['slots'][4]['red_orders']),(2,1))
        self.assertEqual(world['slots'][4]['owner'],0)
        before={p:dict(counts) for p,counts in self.c.activity_by_side.items()}
        path=next(self.c.position.legal_moves())
        self.action('preview',path=list(path))
        self.action('plan',moves=[list(path)])
        self.assertEqual(self.c.activity_by_side,before)
        restored=Campaign()
        restored.restore(self.c.export(),persist=False)
        self.assertEqual(restored.activity_by_side,before)
        self.action('undo')
        self.assertEqual(self.c.snapshot(())['activity_totals'],{'blue':1,'red':1})
        self.action('new',mode='human-x')
        self.assertEqual(self.c.activity_by_side,{})
        self.assertEqual(self.c.snapshot(())['activity_totals'],{'blue':0,'red':0})

    def test_latest_capture_stays_discoverable_and_reset_clears_it(self):
        self.action('new',mode='human-human')
        # Prepared local endgame; later moves still use original routing.
        prefix=(4,)*9
        triple=CIRCUITS[0]
        for index in triple[:-1]:
            self.c.position.root.play(prefix+(index,),1)
        self.c.position.forced=prefix
        hint=next(h for h in self.action('choices',prefix=list(prefix))['choices'] if h['index']==triple[-1])
        self.assertEqual(hint['captures'],[{'path':prefix,'owner':1}])
        self.assertEqual(self.c.position.ply,0)
        self.action('play',path=list(prefix+(triple[-1],)))
        self.assertTrue(self.c.snapshot(prefix)['closed'])
        self.assertTrue(self.c.operation_view(prefix)['closed'])
        self.assertIsNotNone(self.c.snapshot(())['latest_capture'])
        for _ in range(8):
            self.action('play',path=list(next(self.c.position.legal_moves())))
        expected=next(event for event in reversed(self.c.events) if event['gains'])
        before=self.c.position.key()
        self.assertEqual(self.c.snapshot(())['latest_capture'],expected)
        self.assertEqual(self.c.position.key(),before)
        self.action('new',mode='human-x')
        self.assertIsNone(self.c.snapshot(())['latest_capture'])

    def test_watch_list_retains_remote_progress_without_overriding_routing(self):
        fixture=Path(__file__).parent/'fixtures'/'relay-campaign.json'
        self.c.restore(json.loads(fixture.read_text()),persist=False)
        target=(4,)*7+(0,4)
        recent=self.c.snapshot(())['history']
        self.assertNotIn(target,[tuple(h['event']['path'][:-1]) for h in recent])
        before=self.c.position.key()
        fronts=deepcopy(self.c.fronts())
        self.assertLessEqual(len(fronts['fronts']),6)
        entry=next(f for f in fronts['fronts'] if f['path']==target)
        self.assertEqual((entry['blue'],entry['red']),(2,0))
        self.assertFalse(entry['available'])
        with self.assertRaises(ValueError):
            self.action('play',path=list(target+(5,)))
        with self.c.hypothetical_move(next(self.c.position.legal_moves())):
            with self.assertRaises(ValueError):
                self.c.fronts()
        self.assertEqual(self.c.position.key(),before)
        self.assertEqual(self.c.fronts(),fronts)
        self.action('new',mode='human-x')
        self.assertEqual(self.c.fronts()['fronts'],[])

    def test_place_identities_are_stable_and_do_not_change_game_state(self):
        paths={()}
        for depth in range(1,10):
            paths.update({(0,)*depth,(8,)*depth,tuple(i%9 for i in range(depth))})
        identities=[place_identity(path) for path in paths]
        self.assertEqual(len({p['reference'] for p in identities}),len(paths))
        self.assertNotEqual(place_identity((0,))['reference'],place_identity((0,0))['reference'])
        for path in paths:
            self.assertEqual(place_identity(path),place_identity(list(path)))
        before=self.c.position.key()
        view=self.c.snapshot((4,)*9)
        preview=self.action('preview',path=[4]*10)
        self.assertEqual(view['place']['reference'],preview['effect']['location']['reference'])
        self.assertEqual(preview['effect']['destination_place'],place_identity((4,)*9,compact=True))
        self.assertEqual(self.c.position.key(),before)


class RelayHTTPTests(unittest.TestCase):
    def test_assets_and_real_turn_boundary(self):
        server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
        server.game_lock=threading.RLock()
        server.campaign=Campaign()
        thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
        base=f'http://127.0.0.1:{server.server_port}'
        try:
            for path in ('/','/relay/','/relay.js','/relay.css','/relay-transport.js'):
                with urlopen(base+path) as r:
                    self.assertEqual(r.status,200)
                    self.assertIn('no-store',r.headers.get('Cache-Control'))
            with urlopen(base+'/relay/') as r:
                self.assertIn('data-transport="http"', r.read().decode())
            payload={'action':'play','revision':0,'path':[4]*10}
            req=Request(base+'/api/action',data=json.dumps(payload).encode(),headers={'Content-Type':'application/json'})
            with urlopen(req) as r:
                result=json.load(r)
            self.assertEqual(result['ply'],1)
            self.assertTrue(result['computer_turn'])
            with urlopen(base+'/api/export') as r:
                self.assertEqual(json.load(r)['moves'],[[5]*10])
            with urlopen(base+'/api/fronts') as r:
                watch=json.load(r)
            self.assertEqual(watch['ply'],1)
            self.assertLessEqual(len(watch['fronts']),6)
        finally:
            server.shutdown();server.server_close();thread.join()
