# Fifteen

Tic-tac-toe with recursive boards, for the browser and terminal, using a Python alpha-beta engine.

The main browser game defaults to Level 1, Human X, regular Computer O, zero
magnifiers, and routing outlines Off. Square boards use the available window
space. Winning lines, keyboard navigation, the position picker, restart
confirmation, rules help, and loading feedback remain available.
The browser and terminal share the Python rules and engine for Levels 1–6.

The board stores this magic square internally:

```text
6 1 8
7 5 3
2 9 4
```

Every winning row, column, or diagonal sums to **15**. Each player records the numbers behind their chosen squares; the game checks whether three of those numbers sum to 15.

## Recursive boards

The UI offers **Level 1** (the original game), **Level 2** (nine small boards
within one parent), **Level 3** (729 squares), **Level 4** (6,561 squares),
**Level 5** (59,049 squares), and **Level 6** (531,441 squares). The selector
places Levels 1–3 on the first row and Levels 4–6 on the second.
All levels show a complete board overview. Levels 4–6 load detailed cells only
where the board is large enough and within the viewer, including a small buffer
around it. Zoom into a region to play its cells, or use Choose position to navigate
one layer at a time. Python supplies all permissions and results for both views.
Deep-board navigation retains existing elements and moves them with transforms.
Loaded detail is reused until the viewer leaves its buffer or reaches a new
subdivision size. Detail density depends on the viewer size rather than total capacity.
**Game & navigation settings** opens the player selectors, level buttons,
move history, rules help, position picker and Navigation Controls. **New game**,
**Go to legal area**, **Fit legal area**, **Readable detail**, **Last move**,
**Return**, and **Zoom all the way out** are in the header. The zoom-out
button is available with zero magnifiers. Status and instructions
stays above the boards. Changing players or level confirms before ending an
unfinished match that has moves. Empty and finished games restart immediately.

**Magnifiers** offers 0 / 1 / 2 with the same switch styling as the player options.
0 displays a centered, playable whole board, initially fully zoomed out.
1 displays a non-playable whole-board overview and its playable magnified crop.
2 adds a second selection outline on the non-playable middle board; only the
third board is playable. Drag either outline with a mouse or touch, or focus it
use WASD for the first and TFGH for the second; Shift moves faster. Click or tap
outside an outline on its non-playable source board to position it there.
Hold Q/E to smoothly zoom the first out/in, and R/Y to zoom the second out/in.
The initial first crop matches the original Level 3 cell density
at other depths. The second magnifier remains available with independent zoom.
The move selector starts at the central square. Arrow keys move it one adjacent
grid square at a time, across subboard boundaries, without skipping occupied or
unavailable squares or wrapping. It stops at the current playable area's
boundary, regardless of the magnifier position, and can move through squares
outside the magnified view. It remains visible on the whole-board overview even
if it leaves the magnified crop.
When routing changes the area, an outside selector
is clamped into it without moving or zooming the camera. Home/End select that
area's first/last squares. Space plays only a legal empty
square, using Python's permissions even when leaf buttons are not loaded.
These shortcuts are inactive while settings or restart dialogs
are open. **Go to legal area** centers the view or magnifiers on the legal area
without changing zoom. **Fit legal area** fits the full permitted region, including broader
freedom after closures. **Readable detail** restores the original Level 3 view's
number of visible cells at the inspected world location. **Last move** shows the
opponent's latest move at readable scale in a one-human match (the latest move
in two-human or spectator matches); **Return** restores the saved view, including
both magnifier centers and zooms, without undoing moves. New games clear the
return location. **Auto-show legal region** offers
**Off** (default), **Before human move**, and **After all moves**. Before human
move repositions after a move only when the next player is human; After all
moves repositions after each move. Automatic following preserves the current
zoom, including each magnifier's crop size; only the explicit Fit legal area
action changes zoom to fit the legal region. Finished games keep their final view.
Turning the setting on does not immediately reposition the board, and starting
a new game uses the normal initial view. Instruction text stays visible during
computer turns to keep the board size stable.
**Move input** offers Play (default) or Preview in settings. Play uses immediate
cell clicks. Preview selects a cell without placing a mark and adds a dashed
gold outline around its actual next destination in the existing board views,
using Python's reversible preview. No separate preview panel is shown.
Use Space or click/tap the selected square again to commit the move.
New selections supersede old requests, and moves/restarts invalidate candidates.
**Routing outlines** starts Off. On adds alternating light/dark purple outlines
for successive destination areas. Whole-board routing is implicit and omitted.
Blue indicates the current playable area, and the latest move stays marked.
The main game and layout playtest share the same canvas painter and movement
helpers. Boundary thickness depends on nesting depth and available pixels,
without a per-level lookup table; tiny routing rectangles cannot invert.
Magnified panels permit finer detail for smaller displays. When a clicked
region has no loaded leaf buttons, the same Python position inspector supplies
the exact square and permissions before the normal play action is used.

On desktop, the boards use the largest common square size that fits the window.
On portrait phones, magnifier panels stack at full width and scroll vertically;
the settings button remains available in the sticky header. Settings controls
stack in a scrollable drawer. Landscape windows use the packing that maximizes
the board sizes. The ordinary board's zoom and movement controls are available
when Magnifiers is 0. Scroll to zoom uses the same option styling as the
player controls, with Off and On choices. Off is selected initially. Select On to
enable wheel zoom:
wheel up zooms toward the cursor and wheel down zooms out,
within a 1×–9× range at Levels 1–3. Levels 4–6 allow further zoom so the smallest
squares can be selected. Turn off
Scroll to zoom to leave wheel scrolling unchanged, or use Zoom all the way out
to fit and center the entire board. Ctrl-wheel keeps the browser's own zoom.
At minimum zoom, the whole board fills its square viewer.
Drag to move and Edge scrolling have independent Off / On selectors,
beside each other and styled like the player controls. Both start Off. When drag movement is On,
hold the left mouse button and move at least 5 pixels to grab and move the board;
releasing after a drag does not play a move. When edge movement is On, placing
the mouse within 75 pixels inside or 25 pixels outside a viewer edge starts panning
at 300 screen pixels per second. Speed rises smoothly to 485.4 pixels per second
(1.618 times the base speed) over 1 second in the zone. Leaving the zone resets
the ramp; moving within it or changing direction retains the elapsed time.
The viewing direction follows the vector from the viewer center to the mouse,
with continuous angles. Speed depends on time, not distance from the edge.
Movement stops at board bounds, beyond that outside strip, while dragging,
or when the page loses focus.
Movement only changes axes where the zoomed board is larger than the viewer.
Changing focus does not move the board or change zoom. Use the navigation
controls to bring cropped positions into view.
The area around the board matches the webpage background; the viewer border is invisible.
Board marks and completed-board symbols use a font size of 61.8% of their square
width at every layer; `--symbol-ratio` in `web.css` defines the shared proportion.
Square-ended winning lines pass through the positions reported by Python. Their
thickness matches the existing X stroke; each end extends past the outer winning
position's center by 1.618 times the X's center-to-tip distance at that layer.
The multiplier is `WIN_LINE_EXTENSION` in `winning-lines.js` (`L = D + 2kr`). Lines remain
visible beneath larger result symbols, faded like the smaller marks. Drawn boards
use ◆ without a winning line. Grid centers, scaled stroke/reach, and line geometry
are cached per recursive layer and reused across boards and redraws. Resizing,
font loading, or changing the game level invalidates the saved layout dimensions.
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
to `[7, 2]`. These examples use display positions 1Ã¢â‚¬â€œ9; Python paths use 0Ã¢â‚¬â€œ8.
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
as a file: the Python loader needs HTTP. Choose Human, Computer, or Experimental for each letter. This also allows
automatic matches between the two bots. Changing either player or pressing
**New game** starts a new game, including during AI play. **Keep playing** or
Escape cancels a pending restart without changing the selected players or level.

Tab into the board, then use arrow keys to move between available positions.
Home and End select the first and last available positions; Enter or Space plays.
Tab leaves the board in one step. Focus stays on the board after a computer reply
unless you move to another control.

For small screens, expand **Choose position**. Choose each board from the larger
3-by-3 controls, then choose a square to play. **Back** changes the selected board
without making a move. These controls use the same Python permissions and move
handling as the full board, which remains visible. Expand **How to play** for the
recursive rules and keyboard controls; opening either section does not reset a match.

The turn and routing messages share one polite live region. Loading messages
describe the current startup stage; **Retry loading** restarts a failed load.

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

When changing browser scripts or styles, update their cache identifiers in every
page that loads them, including the worker URL when its implementation changes.
Refresh `layout-playtest.zip` as well. A new page must not reuse an older cached
renderer that lacks methods required by its UI.

### Separate layout playtest

Open `layout-playtest.html` through the same local server as the normal browser
game (for example `python -m http.server 8000`, then
`http://127.0.0.1:8000/layout-playtest.html`). This separate prototype defaults to
Level 4, Human X and regular Computer O. The bottom selector switches among
seven layouts without restarting the current match: Board-first, Two-view
comparison, Hierarchy workspace, Live pinned regions, Preview-on-demand, and
Local board & watched regions, and Overview & playable lens. The URL's `?variant=1` through `?variant=7`
selects the initial layout.

Layout 7 starts with the same fresh Level 4, Human X / regular Computer O game.
The fixed left overview is non-playable. Drag its outlined square, or focus the
outline and hold arrow keys, to move the region shown on the playable right
side. Shift moves the outline faster. Both windows are equally sized; the
outline's side is 81.6% of a top-level square's side. **Show legal region** moves
the outline to the current allowed area. Moves do not automatically reposition
it. This layout reuses the smooth movement from `board-magnifier.html`; it does
not load any recorded moves. The static magnifier remains a separate demo.
In **Game & navigation settings → Navigation Controls**, the **Magnifiers**
switch offers **0 / 1 / 2**, defaulting to **1**. **0** displays just the centered,
non-playable whole-board overview. **1** retains the existing two-window layout.
**2** displays three equal windows: the left outline selects the non-playable
middle view, and the middle outline selects the playable right view. Both
outlines support the same drag and arrow-key movement. Switching this setting
preserves the match and outline positions; only starting a new game resets the
outlines to the center. **Show legal region** positions both outlines in mode 2.
The third panel permits finer presentation detail so Level-6 cells remain
playable at desktop window sizes; rules and permissions still come from Python.
On the overview, blue outlines the actual playable area. Purple outlines the
successive routing areas: for example, current area `5 / 5 / 1` routes into
`5 / 1`, then `1`, then the whole board as unspecified move digits accumulate.
These scopes use the game's existing target resolver, including closed-board
fallback, and update after each move. They describe routing from the current
position; later choices and new closures can change the future scopes.
The whole-board routing scope is implicit and has no purple outline. When play
is unrestricted, the whole board receives the blue playable-area outline.

Layout 6 combines a large main board, a reserved destination preview, and up to
three live watched regions fitted side by side. Select a legal square to preview
it, then use **Play selected move** to commit. **Pin destination** keeps the
destination visible without discarding the candidate; **Pin current view** or
the board address can watch another region. Watched views are read-only; use
**Show in main** to examine them. Back/Forward and **Show legal region** return
to the move area. This layout omits the minimap, hierarchy, and position picker.

Use **Zoom to detail** to expose playable cells. **Show legal region** navigates
explicitly to the actual permitted region. Back/Forward restores camera views;
the overview navigates without playing. A board address such as `1 / 3 / 2`
can be opened or pinned. Up to three live pins may accompany the main view.
The second view supports its own zoom buttons, the shared navigation settings,
Copy main, and Swap views. Pin panels can be resized vertically on desktop.

**Square action** chooses direct Play or Preview. Hierarchy and Preview-on-demand
layouts initially select Preview: selecting an available square checks the
actual outgoing region and closures, without playing; **Play selected move**
commits it. The destination panel is read-only and shows the current position
before the hypothetical move. It does not recommend or rank moves.
Game controls, navigation switches, move history and the existing position
picker are inside **Game & navigation settings**. Wheel zoom, drag and edge
movement retain their existing initial Off settings.

All layouts share the original renderer, camera, Python rules, and AI session.
A prototype-only sparse ink layer retains occupied locations and actual board
results below the ordinary detail cutoff; dense overview marks may overlap.
Layout controls reflow with the browser window; narrow windows use scrollable
comparison panels. The normal `index.html` layout is not replaced. The page
requires its neighboring JavaScript/CSS/Python files and the same initial
runtime download as the normal game; it is not an offline standalone HTML.

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
0.5-second deadline per move (`MULTILEVEL_AI_SECONDS` in `fifteen.py`).
Move selection uses the best search score, with no randomized score margin.
The AI evaluates recursive threats and board importance,
including the destination of the next turn. Larger-board play remains heuristic,
not guaranteed optimal. The engine remains replaceable through the existing `Position` protocol.
For terminal Level 2, enter the board and square separated by a space, such as
`3 7`. All nine browser player combinations work at all three exposed levels.
`python fifteen.py` still starts the two-human mode. Use `--help` for options
and `--version` to display the current version. `--human` requires `--ai`.

## Experimental opponent

Select **Experimental** for X or O in the browser. It uses the same Python
rules, search evaluation, and alpha-beta/PVS engine as Computer. Its starting
move order and fallback also weigh child opportunities through their parent
combinations and value captures reachable within the routed region. Before timed
search it checks immediate game wins and opponent winning replies, giving it
a safer fallback if no search depth finishes. The regular search retains the
current bot's evaluation but disables its tactical extensions to complete more
full search depths.

Both bots solve Level 1 exactly. At higher levels both receive the same nominal
0.5-second budget. The experimental tactical pass completes before returning,
so a large position can overrun that cooperative deadline. This is heuristic
play, not a guarantee of winning. The current Computer behavior is unchanged.

Run both seats automatically without an agent or browser:

```sh
python benchmarks/experimental_match.py --seconds 0.5 --output benchmarks/experimental-results.json
```

Use `--seed 101` for a repeatable eight-move opening instead of an empty board.
Timed search can vary with machine load. See `benchmarks/experimental-design.md`
for the match observations and design, and `benchmarks/README.md` for results.

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
| `alpha_beta_engine.py` | Reusable alpha-beta/PVS search and the Fifteen adapter. |
| `ai_evaluation.py` | Recursive evaluation, move ranking, and reversible analysis caches derived from the shared rules. |
| `experimental_ai.py` | Experimental evaluation and tactical fallback, reusing the shared search and game adapter. |
| `version.py` | Shared application version. |
| `tests/test_alpha_beta_engine.py` | Exhaustive search-correctness and interruption-safety checks. |
| `tests/test_fifteen.py` | AI integration, command-line, input validation, and gameplay checks. |
| `tests/test_ui.py` | Browser-controller modes, restart, validation, and computer-play checks. |
| `tests/test_recursive.py` | Recursive outcomes, routing, undo, AI, level choices, and terminal paths. |
| `tests/test_search_improvements.py` | Reference minimax comparisons, tactical choices, incremental analysis, cache isolation, and interruption safety. |
| `benchmarks/ai_benchmark.py` | Equal-time matches and profiling against a local Git revision. |
| `benchmarks/experimental_match.py` | Unattended experimental-versus-current matches with both seats and complete move records. |
| `tests/test_experimental_ai.py` | Logged tactical regressions, shared-state restoration, and all player combinations. |
| `tests/web_keyboard.test.cjs` | Keyboard focus, restart protection, and precise picker interaction checks. |
| `tests/web_loading.test.cjs` | Worker initialization stages, failure messages, and retry isolation checks. |
| `winning-lines.js` | Winning-line presentation, font measurements, and responsive placement. |
| `tests/winning_lines.test.cjs` | Line endpoint geometry and consumption of Python winning flags. |
| `research/` | UI source findings, ticket decisions, review evidence, and local preview. |

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
print(result.move + 1)  # Engine moves use indices 0Ã¢â‚¬â€œ8; display positions 1Ã¢â‚¬â€œ9.
```

For a nonterminal Level 1 board, search `position.remaining` plies for optimal
play. At greater depths, `remaining` is an upper bound that includes unused
squares inside finished boards; a deadline is needed for interactive play. The adapter prefers faster wins and delays forced
losses.
The adapter assumes supplied boards are legal, reachable positions.

The engine uses negamax alpha-beta with principal variation search (PVS).
After the first move, PVS initially checks whether later moves improve the
current score; improvements inside the search window receive a full re-search.
Set `pvs=False` on `AlphaBetaEngine` to compare plain alpha-beta.

For recursive games, `ai_evaluation.py` scores open sum-to-15 combinations,
immediate completion squares, forks, won children, and the directed region.
Child progress has less weight than its parent's result. All terminal wins
outrank heuristic scores. Move ordering prioritizes the cached best move,
local wins, threats, and destination quality; it never removes legal moves.
Only the moved leaf and its ancestors receive updated analysis. Immutable tree
keys cache their hashes but retain exact equality checks, so hash collisions
cannot silently merge positions. Direct edits through `position.root.play`
invalidate analysis; use `position.play`/`undo` for normal play and search.

A bounded transposition table retains compatible Fifteen results across turns.
Scores and bounds require the same search depth and remaining extension budget;
other entries only guide move ordering. `cache_size=0` disables it, and
`engine.clear_cache()` clears it explicitly. Keys include the side to move,
directed region, depth of the recursive board, and move count. Different game
adapters clear the table between searches unless they supply `cache_context()`
and guarantee stable rules, evaluation, and position-relative scores.

The default `threat_extensions=2` allows at most two additional plies per branch
when the usual horizon lands on an immediate threat in a playable leaf board.
Every legal reply is still searched; there is no assumed pass or forced-block
filter. Set `threat_extensions=0` for fixed-depth comparisons. The generic
engine uses the optional `is_tactical()` adapter hook to identify these positions.
Level 1 keeps its original scores and exact full-depth search without extensions.

Optional `iterative=True` searches progressively deeper. With `time_limit=1.0`,
it returns the last completed depth on timeout; if none completed, it returns a
legal fallback with `score=None`. Deadlines are cooperative: a single callback
or scheduling delay may overshoot them. All interrupted moves and analysis
updates are undone. A time limit does not imply optimality.

Other games can implement the documented `Position` protocol without changing
the engine. Keys must include side to move and any rule-relevant history.
The engine assumes alternating turns, zero-sum finite scores, and finite search
depth; it is not thread-safe.

To reproduce short equal-time matches and a CPU profile against the published
`0.1.0-dev` engine (the commit must exist locally):

```sh
python benchmarks/ai_benchmark.py --baseline-ref c04573f --seconds 0.05 --pairs 2
```

Each opening is played with both sides swapped at Levels 2 and 3. The benchmark
imports only the earlier engine; both versions use the current shared rules.
Use `--seconds 0.5` for the game's normal time budget, or `--pairs 0` for search
measurements without matches. Add `--ablations` to compare PVS, tactical ordering,
and cached tree keys at equal depth with identical evaluation scores.
Small samples are regression checks, not ratings;
node throughput and playing strength are separate measurements.

Run all engine and game checks with `python -m unittest discover -v`.
Run the browser interaction and worker checks with
`node --test tests/*.test.cjs` (Node.js).
Research, ticket decisions, and verification for the local UI update are recorded
in [research/ui-ux-sources.md](research/ui-ux-sources.md),
[research/ui-ux-tickets.md](research/ui-ux-tickets.md), and
[research/release-checklist.md](research/release-checklist.md).

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

The main game rejects positions outside 1Ã¢â‚¬â€œ9 and occupied squares. Scripts in `outdated-experiments/`
remain learning experiments: their input validation can accept zero or negative
positions through Python's negative indexing. The old minimax variant is
experimental and should not be treated as an unbeatable opponent. The
recursive-board experiment does not yet detect wins or ties and runs until
interrupted. Large level counts grow the board rapidly.

## License

Licensed under the GNU Affero General Public License, version 3.0 only (`AGPL-3.0-only`). See [LICENSE](LICENSE) for the full text.
