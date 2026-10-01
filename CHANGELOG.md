# Changelog

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
