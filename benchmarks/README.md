# AI benchmark notes

## Variety versus improved deterministic selection

Historical results from the variety experiment, which has now been removed.
`benchmarks/variety-results.json` retains the completed games and search statistics.
The comparison used the then-current engine with a score margin of 48 against
its improved deterministic mode. Both used the same evaluation, pruning,
extensions, cache capacity, proof bookkeeping, and resource policy. It was a
selection-policy comparison, not a byte-for-byte historical engine comparison.
The temporary harness and variety-only tests were removed with that experiment.

Two seeded eight-move openings at each recursive level are each played with
sides swapped. Level 1 starts empty. Engines have separate caches, and searches
run sequentially to avoid competing for CPU time. Positions with at most nine
remaining squares are solved exactly by both modes; other searches get the same
0.5-second budget. Seeded randomness is repeatable, but timed search results can
still vary with machine load. This is a small match sample, not a rating estimate.

Completed local run (2026-10-05), results from the varied bot's perspective:

| Level | Wins | Draws | Losses |
| --- | ---: | ---: | ---: |
| 1 | 0 | 4 | 0 |
| 2 | 1 | 1 | 2 |
| 3 | 0 | 0 | 4 |

Across the recursive levels, variety scored one win, one draw, and six losses.
The experimental variety implementation was weaker in this sample. The comparison
bundles the cost of comparing multiple root candidates with the effect of
allowing a lower score; it does not isolate which contributes more to the losses.
No engine settings or game code were changed during the run.

## Earlier deterministic-engine benchmarks

Local Windows/Python run against the published `c04573f` engine. Both engines
use the same current game rules. Timings vary by machine and system load.

The match and ablation results below predate outcome-protected variety and
describe deterministic best-score search. The benchmark script still measures
that analysis mode; these results do not establish the varied bot's strength.

For the discarded variety policy, a local 0.5-second spot check after a central opening
completed depth 5 at both Levels 2 and 3, versus depth 6 with deterministic
selection. Both stayed within the cooperative time budget and returned legal
moves. Comparing multiple root candidates has a search cost; this small timing
check is not a playing-strength measurement.

## Equal-time matches

Command: `python benchmarks/ai_benchmark.py --seconds 0.05 --pairs 2 --ablations`

Two seeded openings per level, each with sides swapped: the revised bot won
7 of 8 games (Level 2: 3/4; Level 3: 4/4). No draws. This is a small regression
sample at 50 ms per move, not a rating estimate or proof of optimal play.

## Fixed-depth comparisons

Totals across three seeded positions per level, depth 4 with the same evaluation
and extension policy. Every variant returned identical scores.

| Level | Variant | Nodes | Seconds |
| --- | --- | ---: | ---: |
| 2 | current | 8056 | 0.3212 |
| 2 | no_pvs | 13119 | 0.4985 |
| 2 | no_ordering | 8290 | 0.2554 |
| 2 | full_tree_keys | 8056 | 0.3971 |
| 3 | current | 1139 | 0.0487 |
| 3 | no_pvs | 1219 | 0.0499 |
| 3 | no_ordering | 977 | 0.0371 |
| 3 | full_tree_keys | 1139 | 0.0885 |

PVS reduced node counts in this sample. Cached tree keys reduced elapsed time
without changing the searched nodes. Tactical ordering did not consistently
save time here: its scoring overhead outweighed the reduction in Level 2 nodes,
and it searched more nodes in these Level 3 positions. It is retained to prioritize
immediate wins/threats and provide a tactical fallback under tight deadlines;
quiet positions keep the original static order. This remains a tuning opportunity.

At the normal 0.5-second budget on the same three sampled positions, the revised
engine reached depths 5 at Level 2 and 6-7 at Level 3. The baseline reached
depths 6-9 and 7 respectively. These depth numbers are not strength comparisons:
the revised engine performs nonzero evaluation and up to two tactical extension
plies, while the baseline treats all unfinished horizon positions as equal.
Raw node throughput was lower in that sample, especially at Level 2.

Profiling guided removal of unchanged-parent outcome checks and repeated full
parent analysis. Incremental summaries and exact cached-hash keys preserve the
recursive objects and reuse the authoritative rules.
