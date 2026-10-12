# Possible future ideas

This list records possibilities for discussion. An entry is not approval to
implement it. Get the user's approval before starting work or expanding its scope.

## Entry format

Use a descriptive heading and the following fields for each idea:

- **Status:** Proposed, Deferred, Approved, In progress, Completed, or Rejected.
- **Problem / evidence:** Describe the observed issue. Separate verified facts
  from suspected effects and identify any measurements or supporting files.
- **Possible approach:** Describe the proposed work and alternatives worth considering.
- **Affected behavior / tradeoffs:** Explain what could change, what must be
  preserved, and relevant costs or risks.
- **Validation required:** State how to test the benefit and preserved behavior
  before accepting the change.
- **Decision / next step:** Record the user's decision and what must happen next.

## Experimental bot

Ideas in this section are proposals, not authorization to change the bot.
Preserving or improving playing strength is a requirement; faster search alone
does not justify a weaker candidate.

### Preparation and worker isolation

- **Status:** Deferred.
- **Problem / evidence:** Experimental AI collects all legal root moves and
  checks their tactical consequences before its main search. This preparation
  does not honor the nominal 0.5-second deadline. An empty Level 4 board has
  6,561 legal moves; Level 6 has 531,441. A controlled Level 4 test confirmed
  that preparation visited all opening moves despite a short deadline. This
  behavior runs only when Experimental AI is selected for the player whose
  turn it is. Regular Computer AI streams moves and checks its search deadline.
  See `ExperimentalEngine.search` in `experimental_ai.py`. The browser runs
  search and board-detail requests in the same Python worker, so detail requests
  can wait behind a long search. This is distinct from browser rendering lag;
  its contribution to perceived board lag needs measurement.
- **Possible approach:** Evaluate a dedicated Experimental AI worker that
  receives the current position and returns a proposed move for the authoritative
  game to validate and apply. Separately consider streaming and time-bounding
  tactical preparation, only if strength testing supports that change.
- **Affected behavior / tradeoffs:** Worker isolation could preserve the existing
  AI search behavior while preventing it from blocking the board-detail queue.
  Another Python runtime adds startup work, memory use, and synchronization;
  its CPU and memory demands could still affect browser responsiveness.
  Time-bounding preparation could change move choices and miss safer or stronger
  candidates. Game rules and regular Computer AI must remain unchanged.
- **Validation required:** Measure board responsiveness, detail-request latency,
  startup time, CPU use, and memory with and without a dedicated worker.
  Verify position synchronization, move validation, and rejection of stale
  results after restarts. Any change to Experimental AI search behavior must
  be tested against the unchanged Experimental AI over several games with
  sides swapped, comparable conditions, and recorded outcomes. The user
  requires maintained or improved strength; a small sample alone does not
  establish that. Review the evidence with the user before accepting a change.
- **Decision / next step:** The user does not want to pursue this work now.
  Experimental AI remains unchanged; the proposed preparation changes were
  undone. Present findings and tradeoffs and obtain explicit approval before
  implementing either approach.

### Routing, access and cascading opportunities from the Level 4 study

- **Status:** Proposed.
- **Problem / evidence:** Two completed Level 4 games against regular Computer
  AI exposed the importance of legal access to distant threats, the outgoing
  consequences of local captures, long-lived opportunities, and multi-level
  cascades. Assistant X lost at ply 1478; assistant O won at ply 1616. Both
  endings were four-level cascades. These were not games against Experimental
  AI and therefore do not establish an Experimental AI defect or a side
  advantage. Learning and different inspection methods confound the comparison.
  See [combined analysis](research/level4-playstudy-analysis.md), the linked
  complete diaries, and their authoritative replay audit.
  Useful cases include O1134 (defer a local win to avoid a remote parent loss),
  O1542–1544 (a routing sequence guarantees access to a prepared three-level
  capture regardless of the opponent's reply), O1578–1586 (prepared capture
  remains inaccessible until routing releases root2), O1609–1616 (contested
  parent target and switch to another winning line), and X1470–1478 (known
  terminal danger cannot be defended from the available legal regions).
- **Possible approach:** First preserve selected pre-move positions as a
  regression/benchmark collection using the existing game replay and rules.
  Explore improved recognition of guaranteed return-access sequences and
  longer forcing cascades, and search ordering or selective search attention
  for strategically important routing choices. Investigate whether the
  Experimental AI's additional access/potential evaluation should inform
  ordinary searched leaf positions as well as initial move ordering and
  fallback selection. Compare alternatives individually rather than bundling
  several heuristic changes.
  The current implementation already estimates an available capture within
  the routed scope, propagates child potential through parent winning
  combinations, and verifies immediate whole-game wins and losing replies.
  Reuse those mechanisms rather than independently rewriting them. Its extra
  access/potential evaluation currently influences initial ordering/fallback;
  ordinary search leaves retain the established evaluation.
- **Affected behavior / tradeoffs:** Changes could alter move selection, search
  depth, evaluation cost and deadline behavior. A locally ready threat is not
  necessarily reachable; regional freedom allows choosing an opportunity, not
  collecting every stored threat simultaneously. Potential values are
  heuristics, not calibrated win probabilities. Completed ancestors make
  descendant opportunities obsolete. Avoid rules that always take a local win
  or always block: the real destination and ancestor contribution matter.
  Keep game rules authoritative and regular Computer AI unchanged. This is
  separate from board rendering/navigation performance and worker isolation.
- **Validation required:** Verify fixture legality, actual target fallback,
  captures and outcomes with the existing authoritative game implementation.
  Run candidate versus unchanged Experimental AI across multiple games with
  sides swapped, comparable computing budgets and conditions, and recorded
  outcomes and search costs. Preserve the baseline and account for variation
  in completed depth under time limits. Include broader positions and other
  levels; passing selected tactical fixtures is not sufficient evidence of
  maintained overall strength. Review all results, including losses, with the
  user before accepting a candidate. The user requires maintained or improved
  strength and has not approved a tradeoff that weakens play for speed.
- **Decision / next step:** The user authorized recording these ideas and their
  context only. No bot implementation or benchmark run is authorized by this
  entry. Discuss a specific candidate, its affected behavior and testing plan
  before beginning. The playstudy's human/robot interpretations are hypotheses;
  search intentions and principal variations were not recorded.

## Export final game board as an image

- **Status:** Proposed.
- **Problem / evidence:** The user wants a button to save the final game board
  as an image after a game finishes.
- **Possible approach:** Add an “Export final board as image” button for a
  completed game. Reuse the existing board presentation and authoritative game
  state to produce a downloadable image of the whole final board.
  Use the reviewed SVG presentation as the reference: large, centered X/O
  symbols for won subboards and a filled diamond for drawn subboards. Scale
  result symbols to 61.8% of their board's width. Keep result symbols solid,
  with the board-paper overlay behind them at **38.2% transparency (61.8%
  opacity)** so underlying moves and smaller board results remain visible.
  Apply overlays from smaller to larger concluded subboards, preserving the
  recursive hierarchy. Do not overlay the entire root board with its winner;
  show the overall result separately so the whole position remains readable.
  Preserve the app's X/O colors and retain all recorded marks beneath overlays.
  Reference: `research/level4-game-x-final-board-transparent-comparison.svg`;
  the standalone replay/export example is `research/export-recorded-board-svg.py`.
- **Affected behavior / tradeoffs:** Adds an export action without changing game
  rules, AI behavior, or the final position. Deep boards may require decisions
  about image size and how to keep marks and won-board results readable.
- **Validation required:** Verify exports for wins and draws at different levels,
  including a board viewed while zoomed or panned. Confirm the image represents
  the whole final board, preserves its marks and results, and does not alter the
  game or camera position.
  Compare the result overlays with the approved 38.2%-transparent SVG, including
  nested concluded boards, large X/O symbols, and drawn-board diamonds. Any
  replay must use the existing authoritative game rules rather than duplicate
  them in the exporter.
- **Decision / next step:** Record as a future idea. Agree on image format,
  resolution, and presentation for deep boards before implementing.
  The user preferred the 38.2%-transparent comparison over the 25% version;
  that presentation choice is settled. The export button remains a future
  proposal, not an approved app implementation.
