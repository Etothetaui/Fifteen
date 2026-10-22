"""One transport-independent Relay API for HTTP and the browser worker.

This boundary selects existing adapter operations; rules and AI remain owned
by Campaign and the original Fifteen modules.
"""
import json
from urllib.parse import urlparse, parse_qs

from campaign import path_value


def request(game, url, data=None):
    parsed = urlparse(url)
    query = parse_qs(parsed.query)
    if data is not None:
        if parsed.path != '/api/action' or not isinstance(data, dict):
            raise ValueError('Invalid command.')
        return game.action(data)
    if parsed.path == '/api/view':
        return game.snapshot(path_value(json.loads(query.get('path', ['[]'])[0])))
    if parsed.path == '/api/export':
        return game.export()
    if parsed.path == '/api/fronts':
        return game.fronts()
    if parsed.path == '/api/example':
        from relay_example import EXAMPLE
        return EXAMPLE.snapshot(int(query.get('step', ['0'])[0]),
                                query.get('kind', ['capture'])[0])
    raise ValueError('Unknown request.')
