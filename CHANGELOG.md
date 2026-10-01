# Changelog

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
