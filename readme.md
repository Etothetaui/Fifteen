# Fifteen

Python terminal games and experiments connecting tic-tac-toe with the numbers 1–9 and a magic square.

The board stores this magic square internally:

```text
6 1 8
7 5 3
2 9 4
```

Every winning row, column, or diagonal sums to **15**. Each player records the numbers behind their chosen squares; the game checks whether three of those numbers, including the latest move, sum to 15.

## Run

Requires Python 3.10 or newer and a terminal that can display Unicode. There are no third-party dependencies.

```sh
python fifteen.py
```

On Windows, `py fifteen.py` also works when the Python launcher is installed. On systems where Python 3 is named `python3`, use `python3 fifteen.py`.

Two players take turns as **X** and **O**. Enter a board position from 1 through 9:

```text
1 2 3
4 5 6
7 8 9
```

These are position numbers, not the internal magic-square values. Get three marks in a row to win; a full board without a winner is a tie. Press Ctrl+C to exit.

### Play against the AI

```sh
python fifteen.py --ai            # You are X and go first.
python fifteen.py --ai --human O  # AI is X and goes first.
```

The main game's AI uses full-depth alpha-beta search. It takes forced wins and
otherwise secures a draw; it never deliberately chooses a weaker move. Wins are
scored to prefer finishing sooner. There is no random opening or time limit.
`python fifteen.py` still starts the two-human mode. Use `--help` for options
and `--version` to display the current version. `--human` requires `--ai`.

## Files

| File | Purpose |
| --- | --- |
| `fifteen.py` | Main terminal game: two humans or human versus alpha-beta AI. |
| `tictactoe.py` | Two-player variant organized into Game and Player classes. |
| `fifteen_ai_experimental.py` | **Experimental:** computer opponent using minimax; the computer plays X and opens randomly. |
| `meta_board.py` | Experimental recursive boards with configurable levels and navigation between subboards. |
| `print_squares.py` | Standalone demonstration of flattening and printing nested square arrays. |
| `alpha_beta_engine.py` | Reusable alpha-beta search engine with a standard-game adapter and opening-move demonstration. |
| `version.py` | Shared application version and command-line version reporting. |
| `test_alpha_beta_engine.py` | Exhaustive search-correctness and interruption-safety checks. |
| `test_fifteen.py` | AI integration, command-line, input validation, and gameplay checks. |

Run any script directly with Python to try it.

## Search engine

`alpha_beta_engine.py` powers the main game's AI mode through a small board adapter.
The old experimental script remains separate. Run `python alpha_beta_engine.py` for an opening-move
demonstration, or import it:

```python
from alpha_beta_engine import AlphaBetaEngine, FifteenPosition

position = FifteenPosition()  # 0 = empty, 1 = X, -1 = O
engine = AlphaBetaEngine(cache_size=100_000)
result = engine.search(position, max_depth=9)
print(result.move + 1)  # Engine moves use indices 0–8; display positions 1–9.
```

For an existing nonterminal standard board, search `position.board.count(0)`
plies to obtain optimal play. The adapter prefers faster wins and delays forced
losses. It assumes supplied boards are legal, reachable positions.

The engine uses negamax alpha-beta, preferred move order from the game adapter,
cached-best-move ordering, and a bounded transposition table that distinguishes
exact scores from bounds. It makes and undoes moves instead of copying game
objects. Cache entries are shared between iterative passes and cleared between
search calls. Disable caching with `cache_size=0` when its overhead is unwanted.

Optional `iterative=True` searches progressively deeper. With `time_limit=1.0`,
it returns the last completed depth on timeout; if none completed, it returns a
legal fallback with `score=None`. Time limits are cooperative. Limited-depth
results are heuristic, not guaranteed optimal. The standard adapter's horizon
estimate is neutral; full-depth search is recommended for this game.

Other games can implement the documented `Position` protocol without changing
the engine. Keys must include side to move and any rule-relevant history.
The engine assumes alternating turns, zero-sum scores, and finite search depth;
it is not thread-safe. There is no universally fastest configuration. PVS and
additional search heuristics are deferred until measurements justify them.

Run all engine and game checks with `python -m unittest discover -v`.

## Project status

This is a development version. The application version is defined once as
`__version__` in [version.py](version.py), using semantic versioning with a
`-dev` prerelease label. To display it without starting a game, run:

```sh
python fifteen.py --version
```

The same flag works with `tictactoe.py`, `fifteen_ai_experimental.py`, and
`meta_board.py`. For future versions, update only `version.py`; the game
commands read that shared value. Source filenames and the project directory
do not include version numbers.

This repository originated from the five scripts in `15gamePython` in [Etothetaui/dumb_stuff](https://github.com/Etothetaui/dumb_stuff/tree/main/15gamePython), as viewed at source commit `ab5d6b830ec072b7657c961aaf0e1dea39286da6`. The original `fifteen2.py` is now named `fifteen_ai_experimental.py` to identify its purpose and status.

The main game rejects positions outside 1–9 and occupied squares. Older scripts
remain learning experiments: their input validation can accept zero or negative
positions through Python's negative indexing. The old minimax variant is
experimental and should not be treated as an unbeatable opponent. The
recursive-board experiment does not yet detect wins or ties and runs until
interrupted. Large level counts grow the board rapidly.

## License

Licensed under the GNU Affero General Public License, version 3.0 only (`AGPL-3.0-only`). See [LICENSE](LICENSE) for the full text.
