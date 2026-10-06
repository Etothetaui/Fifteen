# Experimental AI design

The complete 126-turn log in `assistant-level3-match.md` was reviewed, including
the routes and replies, not just the final blunder. The JSON is a regression
fixture; all 251 original moves were replayed through the authoritative rules.

## Observations from the log

- Turns 1-38: centers and local threats accumulate, but a child's value depends
  on the parent combinations it can complete.
- Turns 39-85: the current bot often correctly refuses a local block whose
  destination would concede a capture. Keep routing inside the shared search;
  do not introduce a rule to always block or always take a local win.
- Turns 86-104: captures can be exchanged with compensation. Counting captures
  without their parent context misses the difference between these exchanges.
- Turns 105-113: O combines local threats into a forced outer-board capture.
  Preserve the existing local threat analysis and reversible search.
- Turns 114-124: closed regions grant freedom, letting prepared threats convert
  into larger captures. Evaluate opportunities within the permitted region.
- Turns 125-126: a local block concedes an immediate terminal cascade. Check
  whole-game threats before relying on the local fallback.

## Reproduction

Replaying 249 plies and searching with the current adapter at 10 ms or 50 ms
returned depth 0, no score, and move 871. The opponent then has the verified
terminal move 215. At 500 ms native Python completed depth 1 and avoided the
loss in that probe. This reproduces the observed fallback failure, though it
does not establish the exact browser runtime cost.

## Final candidate

`experimental_ai.py` imports the existing position, incremental analysis,
magic-square-derived combinations, and alpha-beta/PVS engine. It does not
implement moves, routing, board ownership, or game outcomes.

A root tactical pass finds verified immediate wins and excludes moves allowing
an immediate loss when at least one safe alternative exists. It applies and
undoes real game moves to verify candidate outcomes. The pass ranks other moves
using the existing evaluation plus a recursive-potential feature. Child
opportunities propagate through parent combinations, with drawn children unable
to contribute a win. It estimates one available capture inside the routed
region; freedom does not make every stored threat realizable at once.

This feature is a heuristic, not a calibrated probability. It is used only for
starting-move order and fallback selection. The frequently visited search
leaves retain the existing evaluation. Bounded memoization reuses immutable
subtrees from the existing incremental analysis. The experimental engine uses
zero extension plies so broad positions can complete full search depths. The
existing Computer option remains unchanged.

The tactical pass finishes even if the nominal time has run out, and its time
is deducted from the remaining search budget. This trades possible deadline
overrun for a verified safe fallback. It does not prove safety beyond the
opponent's next move. Full-depth Level 1 search still has no deadline.

## Development evidence

`experimental-development.json` retains full records of discarded variants,
including their losses. These are not wins attributed to the final candidate.

- Static potential with tactical safety won its first 500 ms pair (263 plies
  as X, 302 as O), then lost both games on repeat (330 and 285 plies).
- Routed-potential evaluation won both 50 ms games (281 and 246 plies), then
  lost both 500 ms games (352 and 275 plies).
- A smaller additive feature inside search won as X and drew as O at 50 ms.
- Moving the extra feature to root ordering/fallback while retaining extensions
  lost as X and drew as O at 500 ms.
- Disabling extensions in that lighter candidate won both 50 ms games: X in
  289 plies and O in 280 (`experimental-root-light-trial.json`).

Final-source normal-budget results are in `experimental-results.json`: X won
in 329 plies and O lost in 309. The fixed-opening follow-up is recorded
separately in `experimental-opening-results.json`: X won in 391 plies and O
drew in 378. An O-only follow-up batch specified seeds 102-104 and stopped on
its first win: O won seed 102 in 242 plies (`experimental-o-102.json`). All final
reports match the same experimental source fingerprint. This demonstrates wins
with both letters at 500 ms, not guaranteed superiority in every game.
A small sample is not a rating estimate or a guarantee against other opponents.

## Unattended testing

`python benchmarks/experimental_match.py --seconds 0.5` runs both seats from
an empty Level 3 board without browser interaction or agent decisions. Each bot
has its own position and cache. JSON records every move, search statistics,
elapsed time, outcomes, and source fingerprints. The harness independently
replays each completed game through `GameState` before saving it. Use `--seed`
for a reproducible eight-move opening. Timed searches still vary with load.
