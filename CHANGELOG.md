# Changelog

## 0.2.3-dev

- Add a rectangular viewer with a width-to-height ratio of 1.618.
- Add Navigation Controls with a full zoom-out button and an optional
  cursor-centered wheel zoom toggle, disabled by default.
- Start with the entire board visible; constrain zoom and retain keyboard access
  to cropped positions while reusing the existing board and winning-line renderer.
- Position navigation controls beside the viewer on desktop and below it on narrow screens.
- Document camera-navigation research and test zoom anchoring, limits, reset,
  input defaults, resizing, and keyboard focus.

## 0.2.2-dev

- Draw square-ended winning lines through Python's winning positions at every board layer.
- Match line thickness to the existing X stroke and extend each endpoint by its
  center-to-tip distance, measured from the font without changing X or O styling.
- Keep each line above its smaller boards and beneath its larger winner symbol,
  with the same completed-board fading as the smaller marks.
- Recalculate line placement after resizing and font loading; omit lines for draws.
- Test row, column, and diagonal endpoints and verify recursive display on desktop and mobile.

## 0.2.1-dev

- Mark drawn boards with a diamond (◆) in the board and position picker.
- Size board marks and completed-board symbols at 61.8% of their square width.
- Add single-entry keyboard board navigation and retain focus across Python updates.
- Include the last move in accessible position labels and announce routing with turn status.
- Confirm New game, player, and level changes before discarding an unfinished match;
  cancellation preserves settings and resumes any pending computer turn.
- Add optional larger position controls that reuse the full board's Python move path.
- Add collapsed rules and keyboard help in the existing sidebar.
- Report actual loading stages and stage-specific failures; ignore obsolete worker replies.
- Preserve the approved palette, complete Level 3 board, Python magic-square rules,
  and both AI implementations.
- Record 15 research sources, classified tickets, independent reviews, and interaction tests.

## 0.1.2-dev

- Add a separate experimental opponent that reuses the shared Python rules,
  incremental board analysis, and alpha-beta/PVS engine.
- Rank starting moves and fallback choices using parent winning combinations
  and the region where the next player is allowed to move.
- Check immediate whole-game wins and losing replies before timed search.
- Reuse the current evaluation inside search; disable tactical extensions in
  the experimental engine so broad positions can complete search depths.
- Add independent Human/Computer/Experimental controls for X and O while
  preserving the existing board layout and palette.
- Keep the current Computer opponent available and unchanged.
- Add unattended two-seat matches, complete move records, and regression checks
  for the logged endgame, state restoration, and player combinations.

## 0.1.1-dev

- Add recursive position evaluation and tactical/destination-aware move ordering.
- Keep deterministic best-score selection; discard the weaker variety experiment.
- Update analysis and exact cached-hash tree keys only along the changed branch;
  restore them with move undo, including on timeouts and errors.
- Reuse compatible bounded search-cache entries across turns.
- Add principal variation search and at most two extra plies for playable threats,
  preserving all legal replies and exact Level 1 play.
- Load the shared evaluation module in the Python browser worker; preserve the UI.
- Add reference-search, incremental-state, and cache-safety tests plus a repeatable
  equal-time match and profiling benchmark.

## 0.1.0-dev

- Add recursive board objects with shared magic-square rules at every level.
- Propagate won/drawn children and route moves to the nearest unfinished parent.
- Support arbitrary positive depths in the model and AI adapter, while exposing
  Levels 1, 2, and 3 in the browser and terminal controls.
- Reuse alpha-beta search with reversible recursive moves and lazy move generation.
  Keep exact Level 1 search; use timed iterative search for larger games.
- Add nested-board rendering, legal-region highlighting, and recursive tests.
- Use the selected single-sidebar layout with independent X/O player toggles
  and level buttons. Show the full Level 3 board without focus navigation.
- Preserve the original cream, pale sage, and dark green palette in the new layout.

## 0.0.5-dev

- Separate shared game rules, state, and sessions from browser and terminal UI.
- Reuse the shared game state in the alpha-beta adapter; keep winning-highlight
  ordering in the UI. Preserve the original magic-square rules and web interface.
- Move older scripts into `outdated-experiments/` and automated checks into `tests/`.
- Keep local agent instructions out of Git tracking.

## 0.0.4

- Replace separate geometric win checks with the original Python magic-square
  move handling and sum-to-15 rule in the browser and AI adapter.
- Load `fifteen.py` in the browser worker; derive winning highlights from the
  same magic-square rule. Keep the web layout, controls, and game modes unchanged.
- Check all 5,478 reachable positions and verify search restores player state.

## 0.0.3-dev

- Remove the superscript 15 from the header title.
- Remove the magic-square explanation from the game interface.
- Remove slogans and promotional text from the browser interface.
- Use direct labels for modes, loading, moves, and game results.
- Simplify the README introduction and AI description.

## 0.0.2-dev

- Add the responsive browser game with four modes: two humans, human X,
  human O, and computer versus computer.
- Run the existing Python engine in a Pyodide worker, with `ui.py` managing
  turns, validation, game status, winning lines, and move history.
- Add mid-game restart, safe handling of outdated worker replies, loading
  feedback, retry controls, and keyboard-accessible board buttons.
- Prepare root-based GitHub Pages hosting and document online and local play.
- Add UI-controller tests; all 14 automated tests pass.
- Record the release policy: increment the patch version on each publication,
  retain `-dev`, and update change descriptions and documentation.

## 0.0.1-dev

- Add `--ai` mode to the main game, with `--human X` or `--human O`.
- Introduce the reusable alpha-beta engine with bounded caching and optional
  iterative deepening. Main-game AI searches to terminal positions without a deadline.
- Validate human moves before indexing the board; handle interrupted input cleanly.
- Add exhaustive engine verification and game integration tests.
- Document controls, engine integration, and Python 3.10+ requirements.

## 0.0.0-dev

- Extract the original game scripts into a standalone AGPL-3.0 repository.
- Centralize version reporting and label the original AI experiment explicitly.
