# Fifteen

Tic-tac-toe with recursive boards, for the browser and terminal, using a Python alpha-beta engine.

Version `0.1.0-dev` adds recursive boards with Levels 1, 2, and 3 in the
browser and terminal, using the shared Python rules and search engine.

The board stores this magic square internally:

```text
6 1 8
7 5 3
2 9 4
```

Every winning row, column, or diagonal sums to **15**. Each player records the numbers behind their chosen squares; the game checks whether three of those numbers sum to 15.

## Recursive boards

The UI offers **Level 1** (the original game), **Level 2** (nine small boards
within one parent), and **Level 3** (729 squares across three layers).
All three levels show the complete playable board. A single sidebar holds the
X and O Human/Computer toggles, level buttons, New game, status, and move history.
The two toggles provide all four player combinations. Changing a player or level
starts a new game. On narrow screens, the controls sit above the board.
The Python model and AI adapter accept any positive `levels` value; practical
depth is limited by resources and Python's recursion limit.

Each board is a recursive `Board` object. Empty descendants are created on the
first move into them. Every level uses the same original magic-square rule:
winning a child credits its hidden number to the winner in the parent. A drawn
child closes its slot without crediting either player. Wins and draws propagate
upward, and the game ends when the root board is won or drawn.

A move is a path from the outer board to a leaf square. Drop the first position
to find the next player's destination: at two levels, playing board 3, square 7
sends the opponent to board 7. At three levels, `[3, 7, 2]` directs the next move
to `[7, 2]`. These examples use display positions 1–9; Python paths use 0–8.
If a destination is finished, freedom expands only to its nearest unfinished
parent. Finished boards are never playable. The browser highlights the allowed
boards and disables squares outside them, using permissions supplied by Python.

`DEFAULT_LEVELS` in `fifteen.py` is the shared default. `UI_LEVELS` in `ui.py`
limits the currently exposed choices without limiting the game model. For
programmatic play at another depth:

```python
from fifteen import GameSession

session = GameSession("human-human", levels=3)
session.play((2, 6, 1))
assert session.position.forced == (6, 1)
```

## Run

### Play online

[Play Fifteen](https://etothetaui.github.io/Fifteen/) in your browser.
Choose two players, play as X or O against the computer, or watch two computers.
The first visit downloads the Python runtime and may take a moment.

### Local web preview

From this directory, start a static server:

```sh
python -m http.server 8000 --bind 127.0.0.1
```

Open http://127.0.0.1:8000 in a modern browser. Do not open `index.html` directly
as a file: the Python loader needs HTTP. The four modes are two humans, human X
versus computer O, human O versus computer X, and two computers. Changing either player toggle or pressing **New game** starts a new game, including during AI play.

`fifteen.py` owns the shared rules, board state, modes, and turn progression.
`ui.py` handles browser snapshots, status messages, and terminal input/output.
Both interfaces use the same game session; the AI adapter inherits the shared
state and reuses the original move handling and sum-to-15 win rule. The magic-square values stay internal; they are not shown in the UI.
`web.js` renders snapshots and forwards input; `python-worker.js` runs Python
and the existing engine through Pyodide 0.28.1 in a background worker. `web.css`
contains presentation styles. An internet connection is required to download
the pinned Python runtime from jsDelivr on first use; fonts load from Google
Fonts with local fallbacks. No game data is sent to a Python server.

The page uses relative paths and `.nojekyll` for GitHub Pages hosting from the
`main` branch's root directory. No backend server is needed.

### Terminal game

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
python fifteen.py --levels 2      # Two humans on a two-level board.
```

At Level 1, the AI uses full-depth alpha-beta search and prefers faster wins.
At higher levels, the same engine uses iterative deepening with a cooperative
0.5-second deadline per move (`MULTILEVEL_AI_SECONDS` in `fifteen.py`). Its current
horizon evaluation is neutral; larger-board play is legal but not guaranteed
optimal. The engine remains replaceable through the existing `Position` protocol.
For terminal Level 2, enter the board and square separated by a space, such as
`3 7`. All four browser modes work at all three exposed levels.
`python fifteen.py` still starts the two-human mode. Use `--help` for options
and `--version` to display the current version. `--human` requires `--ai`.

## Files

| File | Purpose |
| --- | --- |
| `fifteen.py` | Shared magic-square rules, state, and game sessions; terminal entry point. |
| `index.html`, `web.css`, `web.js` | Browser page, styling, and input/rendering bridge. |
| `ui.py` | Browser presentation and JSON interface; terminal prompts, printing, and arguments. |
| `python-worker.js` | Loads Python and runs the controller in a background browser worker. |
| `outdated-experiments/tictactoe.py` | Two-player variant organized into Game and Player classes. |
| `outdated-experiments/fifteen_ai_experimental.py` | **Experimental:** computer opponent using minimax; the computer plays X and opens randomly. |
| `outdated-experiments/meta_board.py` | Experimental recursive boards with configurable levels and navigation between subboards. |
| `outdated-experiments/print_squares.py` | Standalone demonstration of flattening and printing nested square arrays. |
| `alpha_beta_engine.py` | Reusable alpha-beta search engine with a standard-game adapter and opening-move demonstration. |
| `version.py` | Shared application version. |
| `tests/test_alpha_beta_engine.py` | Exhaustive search-correctness and interruption-safety checks. |
| `tests/test_fifteen.py` | AI integration, command-line, input validation, and gameplay checks. |
| `tests/test_ui.py` | Browser-controller modes, restart, validation, and computer-play checks. |
| `tests/test_recursive.py` | Recursive outcomes, routing, undo, AI, level choices, and terminal paths. |

Run the terminal game scripts directly with Python, or use the web preview instructions above.

## Search engine

`alpha_beta_engine.py` searches through an adapter backed by the original
magic-square board and players in `fifteen.py`. It has no separate row, column,
or diagonal win rules. Winning highlights also come from sum-to-15 triples.
Archived scripts live in `outdated-experiments/` and are not loaded by the game. Run `python alpha_beta_engine.py` for an opening-move
demonstration, or import it:

```python
from alpha_beta_engine import AlphaBetaEngine, FifteenPosition

position = FifteenPosition()  # 0 = empty, 1 = X, -1 = O
engine = AlphaBetaEngine(cache_size=100_000)
result = engine.search(position, max_depth=9)
print(result.move + 1)  # Engine moves use indices 0–8; display positions 1–9.
```

For a nonterminal Level 1 board, search `position.remaining` plies for optimal
play. At greater depths, `remaining` is an upper bound that includes unused
squares inside finished boards; a deadline is needed for interactive play. The adapter prefers faster wins and delays forced
losses. It assumes supplied boards are legal, reachable positions.

The engine uses negamax alpha-beta, preferred move order from the game adapter,
cached-best-move ordering, and a bounded transposition table that distinguishes
exact scores from bounds. It makes and undoes moves instead of copying game
objects. Cache entries are shared between iterative passes and cleared between
search calls. Disable caching with `cache_size=0` when its overhead is unwanted.

Optional `iterative=True` searches progressively deeper. With `time_limit=1.0`,
it returns the last completed depth on timeout; if none completed, it returns a
legal fallback with `score=None`. Time limits are cooperative. Limited-depth
results are heuristic, not guaranteed optimal. The adapter's horizon estimate is neutral; full-depth search is used for Level 1.

Other games can implement the documented `Position` protocol without changing
the engine. Keys must include side to move and any rule-relevant history.
The engine assumes alternating turns, zero-sum scores, and finite search depth;
it is not thread-safe. There is no universally fastest configuration. PVS and
additional search heuristics are deferred until measurements justify them.

Run all engine and game checks with `python -m unittest discover -v`.

## Project status

For each publication to GitHub, increment the patch (last numeric) component
of the version and retain `-dev`. Change larger components only when explicitly
requested. Keep [CHANGELOG.md](CHANGELOG.md), the README, relevant code comments,
and the commit description current. The executable version stays defined only
in `version.py`.

This is a development version. The application version is defined once as
`__version__` in [version.py](version.py), using semantic versioning with a
`-dev` prerelease label for development versions. Version `0.0.4` uses the
exact release label requested for this correction. To display it without starting a game, run:

```sh
python fifteen.py --version
```

The same flag works with the archived `tictactoe.py`, `fifteen_ai_experimental.py`,
and `meta_board.py` scripts in `outdated-experiments/`. For example, run
`python outdated-experiments/tictactoe.py --version`. For future versions, update only `version.py`; the game
commands read that shared value. Source filenames and the project directory
do not include version numbers.

This repository originated from the five scripts in `15gamePython` in [Etothetaui/dumb_stuff](https://github.com/Etothetaui/dumb_stuff/tree/main/15gamePython), as viewed at source commit `ab5d6b830ec072b7657c961aaf0e1dea39286da6`. The original `fifteen2.py` is now named `fifteen_ai_experimental.py` to identify its purpose and status.

The main game rejects positions outside 1–9 and occupied squares. Scripts in `outdated-experiments/`
remain learning experiments: their input validation can accept zero or negative
positions through Python's negative indexing. The old minimax variant is
experimental and should not be treated as an unbeatable opponent. The
recursive-board experiment does not yet detect wins or ties and runs until
interrupted. Large level counts grow the board rapidly.

## License

Licensed under the GNU Affero General Public License, version 3.0 only (`AGPL-3.0-only`). See [LICENSE](LICENSE) for the full text.
