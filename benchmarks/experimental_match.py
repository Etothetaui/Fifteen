"""Unattended equal-time matches, recording every move and search result."""

import argparse
from dataclasses import asdict
import json
import hashlib
from pathlib import Path
import sys
from time import perf_counter

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from alpha_beta_engine import AlphaBetaEngine, FifteenPosition
from experimental_ai import ExperimentalEngine, ExperimentalPosition
from ai_benchmark import opening
from fifteen import GameState


def run(seconds, seed, output, marks=(1, -1)):
    source = Path(__file__).resolve().parents[1] / 'experimental_ai.py'
    report = dict(seconds=seconds, seed=seed, games=[],
                  experimental_sha256=hashlib.sha256(source.read_bytes()).hexdigest(),
                  baseline_sha256=hashlib.sha256(source.with_name('alpha_beta_engine.py').read_bytes()).hexdigest())
    for experimental_mark in marks:
        positions = {True: ExperimentalPosition(levels=3), False: FifteenPosition(levels=3)}
        engines = {True: ExperimentalEngine(), False: AlphaBetaEngine()}
        moves = opening(3, seed) if seed else []
        for move in moves:
            for position in positions.values():
                position.play(move)
        game = dict(experimental_mark=experimental_mark, opening=moves, moves=[])
        current = positions[True]
        while current.outcome() is None:
            experimental = current.turn == experimental_mark
            position = positions[experimental]
            start = perf_counter()
            result = engines[experimental].search(position, position.remaining,
                iterative=True, time_limit=seconds)
            game['moves'].append(dict(mark=current.turn, elapsed=perf_counter()-start,
                                      **asdict(result)))
            for position in positions.values():
                position.play(result.move)
            if current.ply % 50 == 0:
                print(f'Seat {experimental_mark}: {current.ply} plies', flush=True)
        game.update(outcome=current.outcome(), experimental_result=current.outcome()*experimental_mark,
                    plies=current.ply)
        # Independently replay the recorded moves through the domain class,
        # without either search adapter or its derived evaluation state.
        replay = GameState(levels=3)
        for move in moves:
            replay.play(move)
        for record in game['moves']:
            assert replay.turn == record['mark']
            replay.play(record['move'])
        assert replay.outcome() == game['outcome'] and replay.ply == game['plies']
        game['replay_verified'] = True
        report['games'].append(game)
        # Keep full machine-readable traces compact; the Markdown report holds
        # the human-readable comparison and interpretation.
        Path(output).write_text(json.dumps(report, separators=(',', ':')) + '\n', encoding='utf-8')
        print(f"Seat {experimental_mark}: result {game['experimental_result']} in {current.ply}", flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--seconds', type=float, default=.5)
    parser.add_argument('--seed', type=int, default=0)
    parser.add_argument('--seat', choices=('both', 'X', 'O'), default='both')
    parser.add_argument('--output', default='benchmarks/experimental-results.json')
    args = parser.parse_args()
    if args.seconds <= 0:
        parser.error('seconds must be positive')
    marks = (1, -1) if args.seat == 'both' else (1,) if args.seat == 'X' else (-1,)
    run(args.seconds, args.seed, args.output, marks)
