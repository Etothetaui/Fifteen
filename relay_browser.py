"""Browser transport and save synchronization around the existing Relay API."""
import json

from campaign import Campaign
from relay_api import request


class BrowserRelay:
    def __init__(self):
        self.game = Campaign()
        self.saved = None

    def dispatch(self, message):
        try:
            saved = message.get('save')
            if saved is not None and saved != self.saved:
                if not isinstance(saved, dict) or type(saved.get('revision')) is not int or saved['revision'] < 0:
                    raise ValueError('The browser save could not be opened. Export or back it up before replacing it.')
                # Campaign validates and replays the complete recording before
                # replacing state. Persist revision too, so other tabs retain
                # the same stale-preview protection as the HTTP interface.
                self.game.restore(saved.get('game'), persist=False)
                self.game.revision = saved['revision']
                self.game._front_revision = self.game._capture_revision = -1
                self.saved = saved
            data = message.get('data')
            result = request(self.game, message['url'], data)
            changed = data is not None and data.get('action') in ('play', 'ai', 'undo', 'new', 'import')
            envelope = None
            if changed:
                envelope = {'revision': self.game.revision, 'game': self.game.export()}
                self.saved = envelope
            if isinstance(result, dict) and 'save_enabled' in result:
                result['save_enabled'] = bool(message.get('persistent'))
            return {'result': result, 'save': envelope}
        except (ValueError, TypeError, KeyError) as error:
            return {'result': {'error': str(error)}, 'failed': True}


APP = BrowserRelay()


def dispatch(payload):
    return json.dumps(APP.dispatch(json.loads(payload)), separators=(',', ':'))
