"""The static-site transport must preserve the existing adapter's semantics."""
import json
import unittest
from copy import deepcopy

from campaign import Campaign
from relay_api import request
from relay_browser import BrowserRelay


class BrowserRelayTests(unittest.TestCase):
    def setUp(self):
        self.browser = BrowserRelay()

    def call(self, url='/api/view', data=None, save=None, persistent=True):
        return self.browser.dispatch(dict(url=url, data=data, save=save, persistent=persistent))

    def test_shared_api_and_browser_preview_do_not_change_live_game(self):
        initial = self.call()['result']
        self.assertEqual(initial['levels'], 10)
        self.assertTrue(initial['save_enabled'])
        data = dict(action='preview', revision=0, path=[4]*10)
        before = self.browser.game.export()
        direct = request(self.browser.game, '/api/action', data)
        self.assertEqual(self.call('/api/action', data)['result'], direct)
        self.assertEqual(self.browser.game.export(), before)
        self.assertIsNone(self.call('/api/action', data)['save'])

    def test_browser_round_trip_and_cross_tab_stale_guard(self):
        first = self.call('/api/action', dict(action='play', revision=0, path=[4]*10))
        saved = json.loads(json.dumps(first['save']))
        second = BrowserRelay()
        view = second.dispatch(dict(url='/api/view', save=saved, persistent=True))['result']
        self.assertEqual(view['ply'], 1)
        self.assertEqual(view['revision'], saved['revision'])
        stale = second.dispatch(dict(url='/api/action', save=saved,
                                    data=dict(action='play', revision=0, path=[4]*9+[0])))
        self.assertTrue(stale['failed'])
        self.assertIn('campaign changed', stale['result']['error'])
        self.assertEqual(second.game.export(), first['save']['game'])

    def test_unsaved_session_continues_and_export_still_works(self):
        result = self.call('/api/action', dict(action='new', revision=0, mode='human-human'), persistent=False)
        self.assertFalse(result['result']['save_enabled'])
        revision = result['result']['revision']
        self.call('/api/action', dict(action='play', revision=revision, path=[4]*10), persistent=False)
        self.assertEqual(self.call('/api/export', persistent=False)['result']['moves'], [[5]*10])
        self.assertEqual(self.call(persistent=False)['result']['ply'], 1)

    def test_failed_import_and_corrupt_storage_never_replace_game(self):
        saved = self.call('/api/action', dict(action='play', revision=0, path=[4]*10))['save']
        before = deepcopy(self.browser.game.export())
        invalid = deepcopy(saved)
        invalid['game']['moves'].append([0]*10)
        self.assertTrue(self.call(save=invalid)['failed'])
        self.assertEqual(self.browser.game.export(), before)
        failed = self.call('/api/action', dict(action='import', revision=1, save={}))
        self.assertTrue(failed['failed'])
        self.assertEqual(self.browser.game.export(), before)

    def test_new_and_undo_use_original_adapter_and_persist_revision(self):
        direct = Campaign()
        for data in (dict(action='new', mode='human-human'),
                     dict(action='play', path=[4]*10), dict(action='undo')):
            data['revision'] = direct.revision
            expected = direct.action(data)
            actual = self.call('/api/action', data)
            self.assertFalse(actual.get('failed', False))
            self.assertEqual(actual['save'], dict(revision=direct.revision, game=direct.export()))
            actual['result']['save_enabled'] = expected['save_enabled']
            self.assertEqual(actual['result'], expected)

    def test_worked_examples_remain_separate(self):
        before = self.browser.game.export()
        response = self.call('/api/example?kind=opening&step=1')
        self.assertEqual(response['result']['recorded_ply'], 1)
        self.assertIsNone(response['save'])
        self.assertEqual(self.browser.game.export(), before)
