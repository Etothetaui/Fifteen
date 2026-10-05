"""Compare search costs and equal-time games against a locally available Git revision.

Run: python benchmarks/ai_benchmark.py --seconds 0.05 --pairs 1
No network calls. Both engines use the current authoritative Fifteen rules.
"""

import argparse
import cProfile
import importlib.util
import io
import json
from pathlib import Path
import pstats
import random
import subprocess
import sys
import tempfile
from time import perf_counter

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from alpha_beta_engine import AlphaBetaEngine, FifteenPosition
from fifteen import GameState


class UnorderedPosition(FifteenPosition):
    def legal_moves(self):
        return GameState.legal_moves(self, self._order)


class FullTreeKeyPosition(FifteenPosition):
    def key(self):
        return self.levels, self.turn, self.forced, self.ply, self.root.key()


def ablations():
    """Isolate search features while holding evaluation and depth constant."""
    rows = []
    for levels in (2, 3):
        expected = None
        for name, cls, pvs in (
            ('current', FifteenPosition, True),
            ('no_pvs', FifteenPosition, False),
            ('no_ordering', UnorderedPosition, True),
            ('full_tree_keys', FullTreeKeyPosition, True),
        ):
            nodes, elapsed, scores = 0, 0, []
            for seed in (11, 29, 47):
                position = cls(levels=levels)
                for move in opening(levels, seed, 30): position.play(move)
                start = perf_counter()
                result = AlphaBetaEngine(pvs=pvs).search(position, 4)
                elapsed += perf_counter() - start
                nodes += result.nodes
                scores.append(result.score)
            if expected is None: expected = scores
            if scores != expected: raise AssertionError('Search features changed the reference scores')
            rows.append(dict(levels=levels, variant=name, seconds=round(elapsed, 4), nodes=nodes, scores=scores))
    return rows


def baseline_at(ref, directory):
    source = subprocess.check_output(['git', 'show', f'{ref}:alpha_beta_engine.py'], cwd=ROOT)
    path = Path(directory) / 'baseline_engine.py'
    path.write_bytes(source)
    spec = importlib.util.spec_from_file_location('baseline_engine', path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def opening(levels, seed, length=8):
    position = GameState(levels=levels)
    rng = random.Random(seed)
    moves = []
    for _ in range(length):
        if position.outcome() is not None:
            break
        move = rng.choice(list(position.legal_moves()))
        position.play(move)
        moves.append(move)
    return moves


def measure(engine, position, seconds):
    start = perf_counter()
    result = engine.search(position, position.remaining, iterative=True, time_limit=seconds)
    elapsed = perf_counter() - start
    return result, {'seconds': round(elapsed, 4), 'depth': result.depth,
                    'nodes': result.nodes, 'nodes_per_second': round(result.nodes / elapsed),
                    'cutoffs': result.cutoffs, 'cache_hits': result.cache_hits}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--baseline-ref', default='c04573f')
    parser.add_argument('--seconds', type=float, default=0.05)
    parser.add_argument('--pairs', type=int, default=1)
    parser.add_argument('--ablations', action='store_true', help='also compare individual search features')
    args = parser.parse_args()
    if args.seconds <= 0 or args.pairs < 0:
        parser.error('seconds must be positive and pairs nonnegative')
    report = {'baseline': args.baseline_ref, 'seconds_per_move': args.seconds,
              'searches': [], 'games': []}
    if args.ablations:
        report['ablations'] = ablations()
    with tempfile.TemporaryDirectory(prefix='fifteen-benchmark-') as directory:
        baseline = baseline_at(args.baseline_ref, directory)
        for levels in (2, 3):
            for seed in (11, 29, 47):
                moves = opening(levels, seed, 30)
                for name, cls, engine in (
                    ('baseline', baseline.FifteenPosition, baseline.AlphaBetaEngine()),
                    ('improved', FifteenPosition, AlphaBetaEngine()),
                ):
                    position = cls(levels=levels)
                    for move in moves: position.play(move)
                    _, metrics = measure(engine, position, args.seconds)
                    report['searches'].append(dict(levels=levels, seed=seed, engine=name, **metrics))
            for pair in range(args.pairs):
                moves = opening(levels, 101 + pair)
                for improved_mark in (1, -1):
                    current, old = FifteenPosition(levels=levels), baseline.FifteenPosition(levels=levels)
                    for move in moves:
                        current.play(move)
                        old.play(move)
                    engine, old_engine = AlphaBetaEngine(), baseline.AlphaBetaEngine()
                    while current.outcome() is None:
                        active_engine, active = (engine, current) if current.turn == improved_mark else (old_engine, old)
                        result, _ = measure(active_engine, active, args.seconds)
                        current.play(result.move)
                        old.play(result.move)
                    result = dict(levels=levels, pair=pair, improved_mark=improved_mark,
                                  outcome=current.outcome() * improved_mark, plies=current.ply)
                    report['games'].append(result)
                    print('Game:', json.dumps(result), flush=True)
        position = FifteenPosition(levels=3)
        for move in opening(3, 29, 40): position.play(move)
        profiler = cProfile.Profile()
        profiler.runcall(AlphaBetaEngine().search, position, 3)
        output = io.StringIO()
        pstats.Stats(profiler, stream=output).sort_stats('cumtime').print_stats(15)
        report['profile'] = output.getvalue()
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
