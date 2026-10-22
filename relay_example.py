"""Read-only checkpoints from an actual legal L10 match.

The existing Campaign restore replays every preceding move through GameState.
This object never borrows a live campaign, runs AI, or writes a player's save.
"""
from copy import deepcopy
import json
from pathlib import Path
import threading

from campaign import Campaign


class WorkedExample:
    def __init__(self):
        self._steps = {}
        self._lock = threading.RLock()

    def snapshot(self, step, kind='capture'):
        counts = {'capture': [150, 151, 152, 153, 154], 'opening': [0, 1, 2, 10, 13, 14, 15]}
        if kind not in counts or type(step) is not int or not 0 <= step < len(counts[kind]):
            raise ValueError('Choose a valid example and step.')
        with self._lock:
            if kind not in self._steps:
                source = Path(__file__).parent / 'tests' / 'fixtures' / ('relay-countercapture.json' if kind == 'capture' else 'relay-opening.json')
                recording = json.loads(source.read_text(encoding='utf-8'))
                checkpoints = []
                for offset, count in enumerate(counts[kind]):
                    game = Campaign()
                    game.restore({**recording, 'moves': recording['moves'][:count]}, persist=False)
                    event = game.events[-1] if count and offset else None
                    # Show the location affected by this move, rather than
                    # silently jumping away from the result to the next field.
                    prefix = tuple(event['path'][:-1]) if event else game.focus()
                    checkpoints.append({
                        'step': offset, 'kind': kind, 'total_steps': len(counts[kind])-1, 'recorded_ply': count,
                        'sequence': game.events[counts[kind][offset-1]:count] if offset else [],
                        'view': game.snapshot(prefix), 'effect': event,
                        'parent_view': game.operation_view(prefix[:-1]) if prefix else None,
                        'next_place': game.snapshot(game.focus())['place'],
                        'next_view': game.operation_view(game.focus()),
                        'context_views': [game.operation_view(tuple(i - 1 for i in recording['moves'][n][:-1]))
                                          for n in (151, 152)] if kind == 'capture' and offset == 0 else [],
                        'live_game_unchanged': True,
                    })
                self._steps[kind] = checkpoints
            return deepcopy(self._steps[kind][step])


EXAMPLE = WorkedExample()
