# Changelog

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
