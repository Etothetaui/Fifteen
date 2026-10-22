"""Local presentation adapter. All game rules and AI come from Fifteen.

No board is flattened: views contain nine immediate children, and previews use
the original reversible move operation. This keeps depth ten inexpensive.
"""
from __future__ import annotations

import argparse
import json
import hashlib
import os
from pathlib import Path
import sys
import threading
from contextlib import contextmanager, ExitStack
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

HERE = Path(__file__).resolve().parent
RULES = Path(os.environ.get("FIFTEEN_RULES", str(HERE.parent / "Fifteen")))
sys.path.insert(0, str(RULES))
from fifteen import GameSession, GameState, MAGIC_BOARD, winning_triples
from alpha_beta_engine import FifteenPosition

LEVELS = 10
NAMES = ("Aster", "Beacon", "Cinder", "Delta", "Ember", "Forge", "Grove", "Harbor", "Iris")
LAYERS = ("World", "Continent", "Province", "Region", "District", "Zone", "Sector", "Complex", "Installation", "Outpost")
PLACE_FIRST = ('Amber', 'Ash', 'Birch', 'Bright', 'Bracken', 'Cedar', 'Clear', 'Copper',
               'Dawn', 'Deep', 'East', 'Elm', 'Flint', 'Frost', 'Golden', 'Granite',
               'Green', 'High', 'Iron', 'Juniper', 'Long', 'Maple', 'Moss', 'North',
               'Oak', 'Pine', 'Quiet', 'River', 'Silver', 'Stone', 'West', 'Willow')
PLACE_LAST = ('Bay', 'Beacon', 'Bluff', 'Bridge', 'Brook', 'Cairn', 'Cove', 'Creek',
              'Crossing', 'Dale', 'Field', 'Ford', 'Gate', 'Glen', 'Grove', 'Harbor',
              'Haven', 'Hill', 'Landing', 'Marsh', 'Meadow', 'Pass', 'Point', 'Reach',
              'Ridge', 'Rock', 'Shore', 'Spire', 'Vale', 'Watch', 'Well', 'Wood')
# Objective membership is derived from the authoritative rule, never geometry.
CIRCUITS = tuple(tuple(MAGIC_BOARD.index(v) for v in triple)
                 for triple in winning_triples(MAGIC_BOARD))


class TrackedPosition(FifteenPosition):
    """Retain the original reversible token without duplicating session logic."""
    def play(self, move):
        token = super().play(move)
        self.last_token = token
        return token


class ObservedSession(GameSession):
    """Observe real orders at the existing session boundary, never AI search."""
    def _apply(self, move):
        path = self.position.move_path(move)
        board = self.position.board_at(path[:-1])
        before = list(board.board) if board else [0] * 9
        super()._apply(move)
        self.order_before = before


def game_session(mode):
    session = ObservedSession(mode, levels=LEVELS)
    session.position = TrackedPosition(levels=LEVELS)
    return session


def path_value(value, *, leaf=False):
    if not isinstance(value, list) or len(value) > (LEVELS if leaf else LEVELS - 1):
        raise ValueError("Invalid location.")
    if leaf and len(value) != LEVELS:
        raise ValueError("Select a site before issuing an order.")
    if any(type(i) is not int or not 0 <= i < 9 for i in value):
        raise ValueError("Invalid location.")
    return tuple(value)


def place_identity(prefix, *, compact=False):
    """Stable presentation identity, independent of ownership and game rules.

    The full reference encodes the address injectively, including its length.
    Descriptive names can repeat in a huge world; the reference disambiguates
    them. No random generator is consumed, and previews allocate no game nodes.
    """
    prefix = path_value(list(prefix))
    if not prefix:
        identity = {'name': 'World', 'reference': 'WORLD', 'marker': {'color': 0, 'pattern': 0}}
        return identity if compact else {**identity, 'address': prefix, 'layer': LAYERS[0], 'level': LEVELS}
    value, reference = 1, ''
    for index in prefix:
        value = value * 9 + index
    alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    while value:
        value, digit = divmod(value, 36)
        reference = alphabet[digit] + reference
    digest = hashlib.blake2s(bytes(prefix), digest_size=2).digest()
    # Reuse the identity digest's remaining bits for visual recognition. Using
    # the address suffix directly made repeated relay choices share markers.
    identity = {'name': PLACE_FIRST[digest[0] % len(PLACE_FIRST)] + ' ' + PLACE_LAST[digest[1] % len(PLACE_LAST)],
                'reference': reference.rjust(6, '0'),
                'marker': {'color': digest[0] // 32, 'pattern': digest[1] // 32}}
    return identity if compact else {**identity, 'address': prefix, 'layer': LAYERS[len(prefix)],
                                     'level': LEVELS - len(prefix)}


def objective_view(cells):
    """Presentation counts for the original engine's magic-square triples."""
    result = []
    for index, circuit in enumerate(CIRCUITS):
        values = [cells[i] for i in circuit]
        result.append({"id": index, "sites": circuit,
                       "azure": values.count(1), "crimson": values.count(-1),
                       "azure_open": None not in values and -1 not in values,
                       "crimson_open": None not in values and 1 not in values})
    return result


class Campaign:
    def __init__(self, save_path=None):
        self.save_path = Path(save_path) if save_path else None
        self.session = game_session("human-x")
        self.revision = 0
        self.tokens = []
        self.events = []
        self.activity = {}
        self.place_numbers = {}
        self.activity_by_side = {}
        self._capture_revision = -1
        self._latest_capture = None
        self._front_revision = -1
        self._fronts = None
        self._hypothetical_depth = 0
        self.captured = {1: 0, -1: 0, 0: 0}
        self.warning = None
        if self.save_path and self.save_path.exists():
            try:
                self.restore(json.loads(self.save_path.read_text(encoding="utf-8")), persist=False)
            except (ValueError, KeyError, TypeError, OSError, json.JSONDecodeError):
                self.warning = "The saved campaign could not be opened. Its file has been preserved. Export your new campaign before closing."
                self.save_path = None

    @property
    def position(self):
        return self.session.position

    def export(self):
        return {"format": "territory-command", "schema": 1, "levels": LEVELS,
                "mode": self.session.mode,
                "moves": [entry["square"] for entry in self.session.history]}

    def persist(self):
        if self.save_path:
            try:
                temp = self.save_path.with_suffix(".tmp")
                temp.write_text(json.dumps(self.export(), separators=(",", ":")), encoding="utf-8")
                temp.replace(self.save_path)
                self.warning = None
            except OSError:
                self.warning = "Automatic save failed. Use Export save to keep this campaign."

    def restore(self, data, *, persist=True):
        # Replay through shared rules, and only replace the live campaign after
        # every move validates. Failed imports cannot partially change the game.
        if (not isinstance(data, dict) or data.get("format") != "territory-command"
                or data.get("schema") != 1 or data.get("levels") != LEVELS
                or data.get("mode") not in ("human-x", "human-human")
                or not isinstance(data.get("moves"), list)):
            raise ValueError("This is not a ten-level Territory Command save.")
        replacement = Campaign()
        replacement.session = game_session(data["mode"])
        for move in data["moves"]:
            if not isinstance(move, list) or any(type(i) is not int or not 1 <= i <= 9 for i in move):
                raise ValueError("The save contains an invalid order.")
            path = path_value([i - 1 for i in move], leaf=True)
            replacement.apply(path)
        self.session, self.tokens, self.captured, self.activity = replacement.session, replacement.tokens, replacement.captured, replacement.activity
        self.place_numbers = replacement.place_numbers
        self.events = replacement.events
        self.activity_by_side = replacement.activity_by_side
        self.revision += 1
        if persist:
            self.persist()

    def apply(self, path=None, *, human=False, computer=False):
        p = self.position
        # Delegate history and turn progression to the existing session. The
        # subclass records its original token so undo touches only ten ancestors.
        if human:
            self.session.play(path)
        elif computer:
            self.session.computer_move()
        else:
            # Replaying a saved legal order bypasses controller choice, while
            # still using the original session and position transitions.
            self.session._apply(path)
        path = p.move_path(self.session.last_move)
        token = p.last_token
        gains = []
        for depth in range(LEVELS):
            prefix = path[:depth]
            node = p.board_at(prefix)
            # The authoritative engine forbids play below a closed ancestor.
            # Therefore a completed ancestor on this just-played path is new.
            if node.result is not None:
                gains.append((prefix, node.result))
                self.captured[node.result] += 1
        self.tokens.append((token, gains))
        self.events.append(self.effect(path, self.session.order_before, gains))
        self.record_activity(path, self.events[-1]['mark'], 1)
        self.events[-1]['location'].update(self.identify(path[:-1], compact=True))
        self.revision += 1
        return gains

    def identify(self, prefix, *, compact=False):
        identity = place_identity(prefix, compact=compact)
        number = self.place_numbers.get(tuple(prefix))
        if number is not None:
            identity['number'] = number
        return identity

    def record_activity(self, path, mark, delta):
        """Presentation counts observed at the real session boundary only.

        Previews never call this. Replay and undo share this bookkeeping, so
        aggregate activity cannot become an alternative ownership or win rule.
        """
        for depth in range(LEVELS):
            prefix = path[:depth]
            self.activity[prefix] = self.activity.get(prefix, 0) + delta
            sides = self.activity_by_side.setdefault(prefix, {1: 0, -1: 0})
            sides[mark] += delta
            if not self.activity[prefix]:
                del self.activity[prefix]
                del self.activity_by_side[prefix]

        # Only real first claims assign a human-readable landmark number.
        # Replays reconstruct these in order; previews never create landmarks.
        leaf = tuple(path[:-1])
        if delta > 0 and leaf not in self.place_numbers:
            self.place_numbers[leaf] = len(self.place_numbers) + 1
        elif delta < 0 and leaf not in self.activity:
            self.place_numbers.pop(leaf, None)

    def effect(self, path, before, gains):
        """Exact before/after evidence; network membership comes from the rule."""
        after = list(self.position.board_at(path[:-1]).board)
        mark = -self.position.turn
        networks = []
        for i, sites in enumerate(CIRCUITS):
            if path[-1] in sites:
                networks.append({"id": i, "sites": sites,
                                 "before": sum(before[s] == mark for s in sites),
                                 "after": sum(after[s] == mark for s in sites),
                                 "open": all(after[s] not in (None, -mark) for s in sites)})
        return {"path": path, "mark": mark, "before": before, "after": after,
                "destination": self.position.forced, "outcome": self.position.outcome(),
                "location": self.identify(path[:-1], compact=True),
                "destination_place": self.identify(self.position.forced, compact=True),
                **({'capture_places': [{'place': place_identity(p), 'parent': place_identity(p[:-1]) if p else None}
                                      for p, _ in gains]} if gains else {}),
                "networks": networks,
                "gains": [{"path": p, "owner": o} for p, o in gains]}

    def operation_view(self, prefix):
        view = self.snapshot(prefix)
        return {key: view[key] for key in ('prefix', 'slots', 'objectives', 'result', 'leaf', 'closed', 'place')}

    def focus(self, prefix=None):
        # Stream one legal path, never materialize 9**10 locations. Presentation
        # uses neutral ordering; the unchanged AI chooses its own ranked moves.
        if prefix is None:
            return next(GameState.legal_moves(self.position), ())[:-1]
        prefix = path_value(list(prefix))
        if not self.position.allows_prefix(prefix):
            return ()
        # The existing generator supports ordering callbacks. Prefer a chosen
        # permitted branch without scanning the billions of preceding leaves.
        def rank(node, branch, order):
            if len(branch) < len(prefix) and branch == prefix[:len(branch)]:
                first = prefix[len(branch)]
                return (first,) + tuple(i for i in order if i != first)
            return order
        return next(GameState.legal_moves(self.position, rank=rank), ())[:-1]

    def snapshot(self, prefix=()):
        prefix = path_value(list(prefix))
        p = self.position
        node = p.board_at(prefix)
        cells = node.board if node else [0] * 9
        result = node.result if node else None
        slots = []
        for i, owner in enumerate(cells):
            child = p.board_at(prefix + (i,)) if len(prefix) < LEVELS - 1 else None
            slots.append({"index": i, "name": NAMES[i], "owner": owner,
                          "legal": p.allows_prefix(prefix + (i,)),
                          "activity": sum(v != 0 for v in child.board) if child else 0,
                          "orders": self.activity.get(prefix + (i,), 0),
                          "visited": bool(child),
                          "last": self.session.last_move is not None and tuple(self.session.last_move[:len(prefix) + 1]) == prefix + (i,)})
            if len(prefix) < LEVELS - 1:
                slots[-1].update({'blue_orders': self.activity_by_side.get(prefix + (i,), {}).get(1, 0),
                                  'red_orders': self.activity_by_side.get(prefix + (i,), {}).get(-1, 0),
                                  'place': self.identify(prefix + (i,))})
            if len(prefix) == LEVELS - 2 and owner == 0:
                # Only the nine immediate leaf contests are summarized. This
                # never descends recursively or awards partial ownership.
                sets = objective_view(child.board if child else [0] * 9)
                slots[-1].update({
                    'blue_progress': max((s['azure'] for s in sets if s['azure_open']), default=0),
                    'red_progress': max((s['crimson'] for s in sets if s['crimson_open']), default=0)})
        objectives = objective_view(cells)
        ancestry = []
        for depth in range(len(prefix) + 1):
            parent = p.board_at(prefix[:depth])
            ancestry.append({"path": prefix[:depth], "place": self.identify(prefix[:depth]), "layer": LAYERS[depth],
                             "name": "World" if depth == 0 else NAMES[prefix[depth - 1]],
                             "owner": parent.result if parent else None})
        recent = []
        for i in range(max(0, len(self.session.history) - 8), len(self.session.history)):
            recent.append({**self.session.history[i], "captures": len(self.tokens[i][1]), "event": self.events[i]})
        captures = [{"path": path, "owner": owner} for _, gains in self.tokens[-2:] for path, owner in gains]
        # Cache history-derived presentation once per real change. A capture
        # remains discoverable after later moves without scanning on every
        # hypothetical preview or every level of navigation.
        if self._capture_revision != self.revision:
            self._latest_capture = next((event for event in reversed(self.events) if event['gains']), None)
            self._capture_revision = self.revision
        return {"revision": self.revision, "levels": LEVELS, "prefix": prefix,
                "place": self.identify(prefix),
                "layer": LAYERS[len(prefix)], "leaf": len(prefix) == LEVELS - 1,
                "slots": slots, "objectives": objectives, "ancestry": ancestry,
                "result": result, "outcome": p.outcome(), "turn": p.turn,
                "closed": any(item['owner'] is not None for item in ancestry),
                "computer_turn": self.session.computer_turn, "mode": self.session.mode,
                "forced": p.forced, "focus": self.focus(), "local_focus": self.focus(prefix), "ply": p.ply,
                "captured": self.captured, "last_move": self.session.last_move,
                "activity_totals": {"blue": self.activity_by_side.get(prefix, {}).get(1, 0),
                                    "red": self.activity_by_side.get(prefix, {}).get(-1, 0)},
                "history": recent, "recent_captures": captures, "warning": self.warning,
                "save_enabled": self.save_path is not None,
                "latest_capture": self._latest_capture,
                "can_undo": bool(self.tokens), "undo_plies": self.undo_count()}

    @contextmanager
    def hypothetical_move(self, path):
        """One authoritative preview boundary, also used for longer plans.

        Captures, evaluation and routing are restored even if formatting,
        inspection or a later hypothetical move raises an exception.
        """
        p = self.position
        path = p.move_path(path)
        prefix = path[:-1]
        board = p.board_at(prefix)
        before_cells = list(board.board) if board else [0] * 9
        before = {path[:i]: p.board_at(path[:i]).result if p.board_at(path[:i]) else None for i in range(LEVELS)}
        token = p.play(path)
        self._hypothetical_depth += 1
        try:
            gains = [{"path": key, "owner": p.board_at(key).result} for key, result in before.items()
                     if result is None and p.board_at(key).result is not None]
            node = p.board_at(prefix)
            yield {"cells": node.board, "gains": gains,
                   "effect": self.effect(path, before_cells, [(g['path'], g['owner']) for g in gains])}
        finally:
            try:
                p.undo(token)
            finally:
                self._hypothetical_depth -= 1

    def preview(self, path, reply=None, inspect=None):
        if self.session.computer_turn:
            raise ValueError("Wait for Crimson's order.")
        p = self.position
        with self.hypothetical_move(path) as first:
            inspected = self.focus() if inspect is None else path_value(inspect)
            result = {"revision": self.revision, "path": path, "destination": p.forced,
                    "destination_focus": self.focus(), "outcome": p.outcome(),
                    **first,
                    "next_view": self.operation_view(inspected)}
            if reply is not None:
                reply = path_value(reply, leaf=True)
                with self.hypothetical_move(reply) as second:
                    result['reply'] = second['effect']
                    result['reply_view'] = self.operation_view(self.focus())
            return result

    def preview_line(self, moves, inspect=None):
        """Explore up to ten individual moves without committing any of them."""
        if self.session.computer_turn:
            raise ValueError("Wait for Crimson's order.")
        if not isinstance(moves, list) or not 1 <= len(moves) <= LEVELS:
            raise ValueError('Explore between one and ten hypothetical moves.')
        with ExitStack() as stack:
            effects = []
            for move in moves:
                step = stack.enter_context(self.hypothetical_move(path_value(move, leaf=True)))
                effects.append(step['effect'])
            # A released destination exposes its whole permitted scope. Picking
            # its first leaf would conceal the new choice of child location.
            inspected = (self.position.forced if len(self.position.forced) < LEVELS - 1
                         else self.focus()) if inspect is None else path_value(inspect)
            return {"revision": self.revision, "effects": effects,
                    "turn": self.position.turn, "outcome": self.position.outcome(),
                    "destination": self.position.forced, "focus": self.focus(),
                    "view": self.operation_view(inspected)}

    def action(self, data):
        action = data.get("action")
        if data.get("revision") != self.revision:
            raise ValueError("The campaign changed. Refresh the map before issuing an order.")
        if action == "preview":
            return self.preview(path_value(data.get("path"), leaf=True), data.get('reply'), data.get('inspect'))
        if action == "choices":
            return self.choice_summaries(path_value(data.get('prefix')))
        if action == "plan":
            return self.preview_line(data.get('moves'), data.get('inspect'))
        if action == "play":
            self.apply(path_value(data.get("path"), leaf=True), human=True)
        elif action == "ai":
            if self.session.computer_turn:
                # Reuse the original controller, AI and 0.5-second budget.
                self.apply(computer=True)
        elif action == "undo":
            if not self.tokens:
                raise ValueError("There are no orders to undo.")
            # Undo back to the previous human decision, including an AI reply.
            count = self.undo_count()
            for _ in range(count):
                token, gains = self.tokens.pop()
                self.position.undo(token)
                self.events.pop()
                path = tuple(i - 1 for i in self.session.history.pop()['square'])
                self.record_activity(path, self.position.turn, -1)
                for _, owner in gains:
                    self.captured[owner] -= 1
            self.session.last_move = tuple(i - 1 for i in self.session.history[-1]["square"]) if self.session.history else None
            self.revision += 1
        elif action == "new":
            mode = data.get("mode")
            if mode not in ("human-x", "human-human"):
                raise ValueError("Choose a valid player mode.")
            self.session = game_session(mode)
            self.tokens.clear()
            self.events.clear()
            self.activity.clear()
            self.place_numbers.clear()
            self.activity_by_side.clear()
            self.captured = {1: 0, -1: 0, 0: 0}
            self.revision += 1
        elif action == "import":
            self.restore(data.get("save"))
        else:
            raise ValueError("Unknown command.")
        self.persist()
        return self.snapshot(self.focus())

    def undo_count(self):
        """The same existing human-decision boundary for Undo and its label."""
        if not self.tokens:
            return 0
        if self.session.mode == 'human-x' and self.position.turn == 1 and len(self.tokens) >= 2:
            return 2
        return 1

    def choice_summaries(self, prefix):
        """Bounded presentation facts, using the same reversible previews.

        This never ranks or selects moves for either controller. In a forced
        leaf destination, an immediate opponent capture is verified by playing
        each legal reply through the original engine, not by a UI win rule.
        Released regions are explicitly left for inspection rather than calling
        their first leaf representative of every legal reply.
        """
        if len(prefix) != LEVELS - 1:
            raise ValueError('Choose a relay location first.')
        choices = []
        for slot in self.snapshot(prefix)['slots']:
            if not slot['legal']:
                continue
            path = prefix + (slot['index'],)
            preview = self.preview(path)
            next_view = preview['next_view']
            can_capture = False
            capture_reply = None
            if len(preview['destination']) == LEVELS - 1:
                for reply in next_view['slots']:
                    if reply['legal']:
                        result = self.preview(path, list(next_view['prefix']) + [reply['index']])
                        if any(g['path'] == tuple(next_view['prefix']) and
                               g['owner'] == -self.position.turn for g in result['reply']['gains']):
                            can_capture = True
                            capture_reply = {'index': reply['index'], 'effect': result['reply']}
                            break
            choices.append({'index': slot['index'], 'destination': preview['destination'],
                            'destination_place': self.identify(preview['destination'], compact=True),
                            'outcome': preview['outcome'], 'opponent_capture': can_capture,
                            'prior_orders': self.activity.get(tuple(preview['destination']), 0),
                            'capture_reply': capture_reply,
                            'captures': preview['gains'],
                            'blue': sum(s['owner'] == 1 for s in next_view['slots']),
                            'red': sum(s['owner'] == -1 for s in next_view['slots'])})
        return {'revision': self.revision, 'prefix': prefix, 'choices': choices}

    def fronts(self):
        """A bounded watch list derived from real, sparse campaign locations.

        Reuse snapshot's canonical linked-set facts. This read is kept outside
        hypothetical contexts so a temporary move cannot enter the real watch
        list. Cache by the real revision, independently of inspection/previews.
        """
        if self._hypothetical_depth:
            raise ValueError('Read the watch list outside a hypothetical plan.')
        if self._front_revision == self.revision:
            return self._fronts

        def describe(prefix):
            node = self.position.board_at(prefix)
            if node is None or node.result is not None:
                return None
            view = self.snapshot(prefix)
            if view['closed']:
                return None
            blue = max((s['azure'] for s in view['objectives'] if s['azure_open']), default=0)
            red = max((s['crimson'] for s in view['objectives'] if s['crimson_open']), default=0)
            return {'path': prefix, 'blue': blue, 'red': red,
                    'place': view['place'],
                    'blue_claims': sum(s['owner'] == 1 for s in view['slots']),
                    'red_claims': sum(s['owner'] == -1 for s in view['slots']),
                    'orders': sum(view['activity_totals'].values()),
                    'available': not self.session.computer_turn and any(s['legal'] for s in view['slots'])}

        records = []
        for prefix, counts in self.activity_by_side.items():
            if len(prefix) == LEVELS - 1 and max(counts.values()) >= 2:
                record = describe(prefix)
                if record and max(record['blue'], record['red']) >= 2:
                    records.append(record)
        records.sort(key=lambda item: (-max(item['blue'], item['red']), not item['available'], item['path']))
        close_count = len(records)
        # Fresh games can have no near-complete sets. Keep a few recent known
        # locations visible, rather than expanding the untouched world.
        if not records:
            seen = set()
            for event in reversed(self.events[-64:]):
                prefix = tuple(event['path'][:-1])
                if prefix in seen:
                    continue
                seen.add(prefix)
                record = describe(prefix)
                if record:
                    records.append(record)
                if len(records) == 6:
                    break
        self._fronts = {'revision': self.revision, 'ply': self.position.ply,
                        'fronts': records[:6], 'close_count': close_count}
        self._front_revision = self.revision
        return self._fronts


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(HERE), **kwargs)

    def log_message(self, format, *args):
        pass

    def send_json(self, value, status=200):
        body = json.dumps(value, separators=(",", ":")).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        url = urlparse(self.path)
        if url.path in ("/api/view", "/api/export", "/api/fronts", "/api/example"):
            try:
                with self.server.game_lock:
                    from relay_api import request
                    return self.send_json(request(self.server.campaign, self.path))
            except (ValueError, TypeError) as error:
                return self.send_json({"error": str(error)}, 400)
        # Only serve application assets, never campaign data or Python files.
        if url.path not in ("/", "/index.html", "/command.css", "/command.js", "/client.js", "/favicon.svg"):
            return self.send_error(404)
        super().do_GET()

    def do_POST(self):
        if self.path != "/api/action":
            return self.send_error(404)
        if self.headers.get("Content-Type", "").split(";")[0] != "application/json":
            return self.send_json({"error": "Send a JSON command."}, 415)
        origin = self.headers.get("Origin")
        if origin and origin != "http://" + self.headers.get("Host", ""):
            return self.send_json({"error": "Use the local game window."}, 403)
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if not 0 < size <= 8_000_000:
                raise ValueError("The save is too large or the command is empty.")
            data = json.loads(self.rfile.read(size))
            if not isinstance(data, dict):
                raise ValueError("Invalid command.")
            with self.server.game_lock:
                from relay_api import request
                self.send_json(request(self.server.campaign, self.path, data))
        except (ValueError, TypeError, KeyError) as error:
            self.send_json({"error": str(error)}, 400)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8091)
    parser.add_argument("--no-save", action="store_true", help="Temporary campaign for testing")
    parser.add_argument("--open", action="store_true", help="Open the local game in your browser")
    args = parser.parse_args()
    server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    server.game_lock = threading.RLock()
    server.campaign = Campaign(None if args.no_save else HERE / "campaign.json")
    print(f"Territory Command: http://127.0.0.1:{args.port}", flush=True)
    if args.open:
        import webbrowser
        webbrowser.open(f"http://127.0.0.1:{args.port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
