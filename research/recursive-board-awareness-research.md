# Whole-board awareness during local recursive-board play

Research date: 2026-10-08. Scope: evidence and design alternatives for discussion, not implementation or approval to change the interface, game rules, or AI.

## The task that must be supported

The player's local move can matter to several distant regions and levels of the recursive board. The user describes Level 4 decisions involving up to four separated relevant parts, with more alternatives when resolved boards release routing restrictions. The authoritative rules were inspected and a concrete routing sequence was checked below; four regions is a described decision workload, not a universal limit on strategically relevant regions.

The interface must support a repeated reasoning loop: inspect a local candidate, inspect its remote consequences, compare alternatives, check the larger position, and return to the original candidate. Whole-board awareness includes relationships and legal destinations, not merely knowing where a mark exists. Improving frame rate alone cannot eliminate the memory burden of hiding one relevant position whenever another is inspected.

## What the research actually establishes

### Separate overview, serial zoom, and integrated context solve different problems

Cockburn, Karlson, and Bederson distinguish overview+detail (views separated in space), zooming (views separated in time), focus+context (focus displayed within surrounding context), and cue-based highlighting. Their review gives a vocabulary for alternatives, rather than evidence that one family is universally best. [Review, ACM Computing Surveys, 2009](https://doi.org/10.1145/1456650.1456652).

For this game, ordinary zooming temporally separates information that the player may need together. A minimap keeps the whole board visible but may lack enough detail to answer a tactical question. Multiple detailed views can keep distant positions comparable, while consuming screen space and introducing coordination work. These are applications of the taxonomy to this task, not findings from a study of this game.

### Direct evidence that repeated visual comparisons can exceed what serial zoom supports

Plumlee and Ware compared zooming and multiple windows for multiscale pattern matching. Errors were substantially higher with zooming. A follow-up eye-tracking experiment found more revisits between pattern locations when comparisons could use eye movements rather than mouse-driven navigation. The authors relate this to limited visual working memory and recommend extra windows when the compared patterns are too complex to retain mentally. [Author institution repository, TOCHI, 2006](https://scholars.unh.edu/ccom/1080/).

Relevance: a player repeatedly comparing separated positions may benefit from preserving those positions simultaneously. Limit: the experiments concern matching visual patterns, not evaluating recursive game strategies; they establish a plausible cognitive problem, not the best layout or number of windows here.

### Hierarchical views can preserve several scales and multiple distant foci

PolyZoom retains a hierarchy of magnified regions, with graphics linking parent and child viewports. Its two studies used 12 participants. Hierarchical search was approximately 6.5% faster, and two-region comparison approximately 11% faster, than the paper's standard pan/zoom baseline, which allowed multiple windows. Correctness in the comparison task did not differ significantly. Hierarchy depths 3, 4, and 5 were tested. The authors explicitly acknowledge limits to screen-space scaling and did not test comparisons among four simultaneous regions. [PolyZoom, CHI 2012, full author paper](https://www.cs.au.dk/~elm/pdf/polyzoom.pdf).

Relevance: retain a useful ancestor-scale position while inspecting its detail, and retain multiple branches for comparisons. Limit: map-based visual search, a small sample, and a particular hierarchy layout. Connecting viewports was part of the technique but its independent contribution was not isolated experimentally.

### An overview is useful to many people without being a guaranteed performance improvement

Hornbaek, Bederson, and Plaisant studied zoomable maps with and without an overview using 32 participants. Eighty percent preferred the overview, but task correctness did not differ. One map was faster without it; that map provided multiple levels of navigational cues. People switching between detail and overview took longer, suggesting integration and motor costs. [Author-hosted full paper, TOCHI 2002](https://www.cs.umd.edu/~bederson/images/pubs_pdfs/p362-hornbaek.pdf).

A 2022 study of detailed matrix visualizations found pan/zoom faster for locating and searching details, and as good as overview+detail for contextualization. [Yang et al., author-submitted paper, CHI 2022](https://arxiv.org/abs/2203.05109).

Relevance: neither a minimap nor a fisheye should be selected just because it sounds appropriate. Repeated strategic comparison is different from locating a target; it must be tested directly.

### Integrated peripheral context can matter, but the strongest result used unusual hardware

Baudisch and colleagues studied a large low-resolution display surrounding an embedded high-resolution display. It improved completion times for two static-document tasks and reduced errors in a driving simulation relative to alternatives. [Keeping Things in Context, CHI 2002, author paper](https://patrickbaudisch.com/publications/2002-Baudisch-CHI02-KeepingThingsInContext.pdf).

Relevance: peripheral awareness can remain available while detail occupies attention. Limit: a wall-sized physical display, not a small browser viewer; these results do not establish equivalent gains from distorting a square board or adding a small sidebar.

### Insets expose otherwise invisible patterns, with costs as well as benefits

Scalable Insets shows magnified thumbnails for patterns too small to identify, placing them inside or around the viewport and grouping nearby patterns. Its controlled study of 18 participants improved search and pattern comparison against highlighting, but slowed frequency estimation. Six genomics experts also explored it qualitatively. [Research group publication and full paper, InfoVis 2019](https://vcg.seas.harvard.edu/publications/20191020-pattern-driven-navigation-in-2d-multiscale-visualizations-with-scalable-insets).

Relevance: selectively magnified relevant regions could preserve meaningful detail at a global scale. Limit: grouping can conceal distinctions, thumbnails can occlude content, and counting is an example of a task made worse. A recursive board's legal choices must not silently disappear inside an aggregate.

### Continuity helps orientation, but forced animation adds travel time

Bederson and Boltman found that animated viewpoint changes improved reconstruction of a spatial information space without increasing task completion time in their experiment. They deliberately excluded zooming and multiscale structures to isolate animation. They discuss the tradeoff between relating viewpoints and time spent in transitions. [Author-hosted technical report, later InfoVis 1999 paper](https://www.cs.umd.edu/projects/hcil/jazz/learn/papers/CS-TR-3964.pdf).

Relevance: explicit navigation can use a comprehensible transition; animation should be interruptible and should not force waiting during repeated revisits. Limit: this is not evidence for a universal duration, and does not justify automatically moving our board when focus changes.

## What the authoritative routing implies for the interface

In `fifteen.py`, `GameState.play` applies the move and propagates board completions before calling `resolve_target(path[1:])`. In an open Level 4 position, choosing `(a,b,c,d)` therefore sends the opponent to board `(b,c,d)`. Their choice `(b,c,d,e)` sends the original player to `(c,d,e)`, provided the destination remains open. The locations are linked by coordinates, not by physical proximity. [Local authoritative rules](C:/Users/raviph/Documents/Codex/Fifteen/fifteen.py:214)

The following legal sequence was executed on a fresh Level 4 `GameState` using the existing implementation, with one-based coordinates for readability. This is a possible sequence, not a prediction of the opponent's choices:

| Played move | Next player's required board |
| --- | --- |
| 1 / 9 / 1 / 9 | 9 / 1 / 9 |
| 9 / 1 / 9 / 5 | 1 / 9 / 5 |
| 1 / 9 / 5 / 3 | 9 / 5 / 3 |
| 9 / 5 / 3 / 7 | 5 / 3 / 7 |

Alternating top-left and bottom-right outer coordinates illustrate distant transitions. The local move also belongs to nested ancestor boards; completing a child can change an ancestor's credited slot and potentially propagate completion upward. The ancestor chain and the routing chain are both relevant, but they describe different relationships. The actual opponent reply and subsequent routing are conditional, not fixed by the player's current choice alone.

`resolve_target` retains the longest permitted destination prefix before a closed slot. A closed deepest destination releases play within its parent region; a closed outer destination can release the whole board. On Level 4, these are upper bounds on leaf capacity, before excluding occupied cells and completed boards:

| Forced prefix length | Potential leaf capacity |
| --- | ---: |
| 3 | 9 |
| 2 | 81 |
| 1 | 729 |
| 0 | 6,561 |

This follows `9 ** (levels - prefix_length)` and is not a claim that all those moves are legal in a played position. Each released level increases potential capacity ninefold. Greater depth increases both the address/ancestor context to understand and the possible branching after restrictions are released. The number of relevant regions is not always equal to the level count.

An accurate hypothetical destination must account for the candidate move's resulting completions, including closure of a destination or ancestor and a terminal game. Simply dropping the first coordinate from the current path and drawing an arrow can be wrong. Any eventual preview must reuse authoritative move application and target resolution on isolated state, without changing the live game or duplicating rules. Computing legal consequences is distinct from selecting or rating a good move.

## Games with close examples of retaining a local task while inspecting distant places

### Factorio: previews, explicit history, and integrated navigation

Factorio's developers describe losing their current context when inspecting remote alerts. They added hover camera previews for pins and alerts, with configurable pin-preview zoom. They also added a research-information display after repeatedly having to leave the current activity to check remote laboratories. This is unusually close to the task of inspecting another relevant region without abandoning a local decision. [Friday Facts #423](https://www.factorio.com/blog/post/fff-423)

Their remote-view design initially required opening separate planet/platform windows, selecting a place, entering its view, closing it, and repeating. Playtesting exposed that friction and misleading non-interactive previews. They integrated place switching into the same remote workspace. The transferable point is continuity of the task and consistent interaction, rather than copying a planetary menu onto a recursive board. [Friday Facts #380](https://www.factorio.com/blog/post/fff-380)

Factorio also records interface navigation history with explicit back/forward commands, initially motivated by returning to remote work on another planet. Pins provide a persistent location reference, including offscreen arrows, and can serve as temporary destinations or personal reminders. These are separate solutions to revisitation and finding places; neither makes a tiny map tactically readable. [Friday Facts #397](https://www.factorio.com/blog/post/fff-397), [Friday Facts #400](https://www.factorio.com/blog/post/fff-400)

### Beyond All Reason: independently navigable second views and view swapping

The project's March 2026 release account describes a picture-in-picture minimap with independent pan/zoom, plus a separate interactive floating viewport. Multiple floating views are specifically described for spectators/casters; the source does not establish that every player has the same multi-window allowance. This provides an actual RTS example of retaining one view while examining another. It is feature documentation, not controlled evidence of improved decisions. [March 2026 developer update](https://www.beyondallreason.info/microblogs/179)

The April 2026 keybinding update documents commands to swap the main and picture-in-picture camera positions and to copy the main position into the secondary view. Explicit swapping is particularly relevant to repeated A-to-B-to-A inspections. The same game offers automatic tracking features, but those do not justify overriding this project's requirement that focus changes must not move the board. [Camera commands](https://www.beyondallreason.info/microblogs/181)

## Alternatives to compare, without implementing them yet

| Alternative | What it could preserve | Main cost or failure mode |
| --- | --- | --- |
| Persistent whole-board overview plus local view | Global position and current location while working locally | A small overview can become mere occupancy; scanning it requires translating scale and location |
| Whole-board overview plus relevant-region detail views | Detailed comparison of several distant regions without navigation between each check | Screen area, panel management, and risk of showing irrelevant or stale regions |
| Ancestor-scale views beside the local view | Local tactical position and containing strategic structure at each relevant level | Number of views grows with depth; ancestors alone do not show unrelated remote destinations |
| Saved positions and exact return to a previous view | Fast, repeatable serial comparisons, retaining center and scale | Other positions still depend on memory while hidden |
| Temporary magnification or hover preview | Inspect another region without abandoning the current view | Pointer stability, occlusion, accidental activation, and inaccessible hover-only interaction |
| Integrated distortion or fisheye | Focus and surrounding space in one picture | Distorts square geometry and positional correspondence; multiple foci become difficult |

These can be combined. Their value depends on what the overview actually communicates and how reliably the player can return to a precise inspection position. None is proposed as an approved UI addition.

## Information that must survive a change of scale

The following are candidate information requirements derived from the user's task, not approved visual features:

- Played marks and board resolution must remain distinguishable from empty space.
- Current legal play regions must remain distinguishable from other strategically interesting regions.
- The current local candidate and its routing consequences must retain their identities across scale changes.
- Containing-board state and remote routing destinations are different relationships; a display must not imply that one substitutes for the other.
- When a restriction is released, the larger set of legal destinations must remain discoverable. A single arrow to one destination would misrepresent that state.
- Position and scale should remain stable for unrequested focus changes. User-initiated return should restore the previous inspection position precisely.
- A cached detail view and an overview must represent the same game-state revision. A newly completed board must not appear open in a secondary view.

Further edge cases: identical nested grids can make a detail view's address ambiguous; a root overview cannot resolve a subpixel leaf merely by adding an outline; an offscreen direction indicator identifies a bearing but may not identify the target board. A saved position should preserve a board address and camera location while displaying current game state, rather than replaying an obsolete image. A hover preview must not vanish or switch targets as the pointer moves into it. These are task-specific failure modes to evaluate, not proposals to add labels, arrows, pins, or previews without approval.

Every legality, resolved-board, routing, or hypothetical-move result must come from the authoritative game rules. A presentation aid should display those facts without introducing a second rule implementation. Showing legal consequences is also distinct from ranking moves or recommending a strategy; the latter would expand this task's scope.

## How to test the actual reasoning task

A performance comparison should include one-move workflows, not only continuous panning:

1. Inspect a candidate, visit each separated relevant region, inspect one or more replies, and return to the same candidate several times.
2. Repeat at Level 4 with maximally separated destinations, then deeper levels with the same semantic workload.
3. Include resolved boards that release restrictions, several legal branches, dense late-game marks, and nearby candidate moves that route differently.
4. Compare navigation time, number of camera actions, lost-position incidents, accidental moves, and errors explaining where the next player can play. Keep strategic thinking time distinct from interface travel time.
5. Measure whether the player remembers the position accurately after revisits, and whether visible summaries help or conceal information needed to decide.
6. Test limited screen sizes, color-independent identification, keyboard navigation, reduced motion, and transitions across detail thresholds.

Results from the cited studies justify evaluating simultaneous context, easy revisitation, and coordinated views. They do not establish that any specific layout improves strategic decision quality here. The appropriate next step is to agree on the information that must remain visible, then compare a small set of concrete designs before choosing implementation.
