# Navigation improvements for the overview and magnifier game

Research date: 2026-10-12. Scope: research and recommendations only. No game,
navigation, rendering, AI, version, or publishing changes are authorized by this
document. The pending cache fix is separate work.

## Main conclusion

Keep the stable, undistorted overview and linked detail that the user likes.
The next useful experiments should reduce repeated travel, make target selection
depend on readable detail rather than total board depth, and preserve an exact
return point during remote inspection. Increasing panning speed alone cannot
solve comparison or memory demands.

These are design recommendations, not demonstrated improvements in Fifteen.
Primary game implementations establish that techniques exist; they do not
measure their benefit in this game. Controlled studies use other tasks and
must not be presented as evidence that a specific layout will improve play.
See [the human-factors follow-up](navigation-human-factors-followup.md) for study
conditions and limitations, and [the completed Level 4 study](level4-playstudy-analysis.md)
for this game's concrete comparison and routing workload.

## What the current implementation actually does

Inspected `magnifier-game.js`, `selection-lens.js`, `board-camera.js`,
`board-ink.js`, `layout-playtest.js`, and `ui.py` in the current workspace.

- Zero magnifiers uses a normal playable camera. One magnifier has a fixed
  overview selection feeding one playable crop. Two magnifiers are a chain:
  the middle view is detail of the first selection, and the final playable view
  is detail of the second selection. They are not independent comparison views.
- Each selection has width fraction `f = .816 / 3 = .272`. One detail panel
  therefore magnifies linear coordinates by about 3.676; two by about 13.516.
  The first selection's area is 7.3984% of the board, not its linear width.
- `Show legal region` fits the legal area in zero-magnifier mode. In magnifier
  modes it centers the selections on the legal area's center and retains fixed
  magnification. If freedom expands to a larger region, that does not display
  the whole legal region in the final panel. At low levels, the same fixed
  magnification can show only part of a cell.
- Auto-show can be Off, before the next human move, or after all moves. It
  uses the same explicit navigation function. It does not retain a return view.
- The orange last-move marker remains visible at a minimum six-pixel footprint
  in overview ink, but there is no main-game command to inspect the opponent's
  last location and then return. Enlarged marker ink is a locator, not evidence
  that the marked square is itself six pixels wide or readable.
- Lens dragging uses frame-coalesced input and a 35 ms exponential response
  constant. `moveTo` jumps immediately. Arrow taps move four pixels on the
  source panel; held movement is 180 pixels/second, Shift 360. The second lens
  provides a finer coordinate scale, but neither tap size nor held speed is
  expressed in final visible cell units.
- The prototype already contains view history, region frames, pins, ancestor
  inspection and candidate preview. The main layout does not expose them.
  They should be reused/extracted if a specific experiment is approved.

### A scaling limit that faster dragging cannot fix

For a panel of width `S`, level `L` and `n` chained selections, the nominal
playable cell width is `S / (3^L * f^n)`. This is coordinate geometry, not a
browser benchmark; layout borders and actual panel sizes can differ.

| Level | Zero selections at 600 px | One at 600 px | Two at 600 px |
| --- | ---: | ---: | ---: |
| 4 | 7.41 px | 27.23 px | 100.12 px |
| 5 | 2.47 px | 9.08 px | 33.37 px |
| 6 | 0.82 px | 3.03 px | 11.12 px |

Each further level divides these dimensions by three. A fixed lens count and
fixed crop cannot preserve target readability indefinitely. At Level 6 on a
627 px panel, a four-pixel first-lens tap travels about 4.65 leaf cells in
world coordinates; the same second-lens tap travels about 1.26. This explains
why smooth movement and fine positioning are different requirements.

## Verified primary examples and the transferable ideas

### Factorio: preserve a place while checking another

Factorio records GUI/remote-view navigation history with Back/Forward access.
Its developer describes returning directly to a previously abandoned remote
task. [FFF-397, Browse history](https://www.factorio.com/blog/post/fff-397).

Pins can identify locations, carry captions, show offscreen direction/distance,
and have individually suppressible arrows. Their stated purposes include
temporary travel targets and longer-term reminders. [FFF-400](https://www.factorio.com/blog/post/fff-400).

Pin/alert camera previews show a remote area's current condition; pin preview
zoom is configurable. The motivation was checking a problem without abandoning
the current gameplay context. [FFF-423](https://www.factorio.com/blog/post/fff-423).

**Application here:** offer a temporary last-move/destination inspection that
preserves both lens centers, or one optional live reference. A pin must retain
identity and show current state. Mark it closed/unavailable when an ancestor
closes; do not let a remembered opportunity become a false legal target.
Screenshots alone would not meet that requirement. Offscreen arrows need
crowding controls; persistent overview markers may already provide enough
direction without more ink in the playable view.

### OpenRA: navigation inputs have explicit competing states

The inspected controller supports configurable camera bookmarks, wheel zoom
at pointer coordinates, drag deadzones, keyboard directions, focus-aware edge
scrolling, and blocked-direction cursor feedback. Its bookmark implementation
stores camera centers rather than complete zoom/lens state. This is current
`bleed` source, not a claim about every shipped mod's defaults.
[ViewportControllerWidget.cs](https://github.com/OpenRA/OpenRA/blob/bleed/OpenRA.Mods.Common/Widgets/ViewportControllerWidget.cs).

**Application here:** distinguish automatic following, manual dragging,
temporary inspection and returning. Only one should own the camera at a time.
Bookmarks for this game need more than the OpenRA center: preserve normalized
world location, hierarchy scale and both lens centers. Clearly indicate a
clamped lens; a pointer moving while the view cannot move feels unresponsive.

### Animated jumps: interruption matters more than decorative easing

Reach and North model smooth automatic pan/zoom whose velocity remains
continuous when the target changes. They explicitly distinguish this from
manual pan/zoom and discuss failures of restarting fixed animation paths.
This is an algorithm paper, not a user trial proving better game decisions.
[Full author paper](https://arxiv.org/html/1801.09358).

**Application here:** compare instant and short interruptible explicit jumps.
Manual input should immediately take ownership; avoid queued tours between
several locations. A selection outline may move while the playable detail
remains clear, or a remote preview may avoid moving the camera at all.
Any duration is a tunable experiment, not a source-established optimum.

### Pointer interaction and small targets

W3C's dragging guidance calls for a single-pointer alternative to dragging;
keyboard support alone does not supply that alternative. Its target-size
guidance has a 24 CSS-pixel baseline with stated exceptions, including equivalent
controls and certain spatial inputs. These criteria do not establish an ideal
game cell size or automatically classify this board as a violation.
[Dragging guidance](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html),
[target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

Pointer Events specifies how capture retains a drag across boundaries,
`touch-action` governs browser gestures, and cancellation/capture loss ends
ownership. [Pointer Events Level 3](https://www.w3.org/TR/pointerevents3/).

**Application here:** clicking/tapping a non-playable overview to reposition
the lens is worth testing alongside dragging. On phones, confine gesture
capture to the interactive lens; preserve scrolling outside it. Tiny leaf
targets need readable detail or the existing larger position picker, not
invisible oversized hit areas overlapping adjacent legal cells.

## Proposed experiments, ordered by value

All priorities below are judgments based on implementation and observed tasks.
They are not an approved implementation sequence.

| Priority | Experiment | Expected benefit | Main risk |
| --- | --- | --- | --- |
| 1 | Returnable last-move inspection | See what the opponent changed, then restore the exact working view | Confusing a historical location with an old game-state snapshot |
| 1 | Click/tap to place a lens on a non-playable view | Replace long drags with one deliberate action | Ambiguous behavior inside the lens or accidentally triggering play |
| 1 | Readability-based magnification, with manual control | Make deeper levels selectable and avoid extreme low-level crops | Unexpected zoom changes and lost spatial reference |
| 2 | Read-only candidate destination preview | Compare consequences while preserving the candidate | Clutter, worker cost, and changing direct-play click semantics |
| 2 | One live reference/pin, opened on demand | Keep a distant strategic pattern current | Stale identity, excessive panels, added rendering cost |
| 2 | Minimal region identity and linked highlighting | Distinguish similar boards and their source selection | Too many labels/lines at overview scale |
| 3 | Input-specific precision and optional snapping | Make small adjustments predictable | Snapping to the wrong layer or resisting intentional free movement |
| 3 | Interruptible explicit transitions/reduced motion | Make a distant jump trackable | Added waiting and motion discomfort |

### 1. Last move, peek, return

Keep the current working view; open the latest opponent location in readable
detail; provide an explicit Return. A temporary preview is an alternative if
space permits. On touch, use ordinary tap controls rather than requiring hover
or a timed hold. Retain both selection centers, not just the final camera.
Returning restores location in the **current** position, never reverses moves.
Test capturing moves, rapid computer replies, root wins and a last move now
covered by a larger result symbol. A move that closed several boards should
retain the mark location while also showing the changed enclosing results.

### 2. Point somewhere instead of dragging there

On the non-playable overview, a click/tap outside the current outline could
center that outline there. The middle view could do the same for its second
outline. Inside-outline dragging would retain its existing grab offset.
Do not apply this navigation gesture to the playable panel, and do not enable
it on the zero-magnifier playable board without an explicit navigation mode.
Test corners, clamping, stationary clicks, drag release, touch page scrolling,
pointer cancellation and double clicks. Moving a lens must never place a mark.

### 3. Separate fit, inspect and readable play scale

Provide an intentional way to fit the full legal area and a way to inspect a
leaf at a useful target size. They solve different tasks. When a closed
destination releases a large area, a fit view may be useful for choosing a
subregion; magnification for playing a leaf should remain available.

The first experiment should expose a manual lens scale or explicit fit/readable
action rather than silently changing every lens after every move. Derive crop
widths from panel width, level and desired readable cell width, not a level
lookup table. Preserve a chosen world point while changing scale and remap the
second lens if necessary; show the resulting crop extent in its source view.
Suggested 32–44 pixel cells are test candidates, not universal requirements.
Compare extra navigation incurred by narrower crops against selection errors.

### 4. Preview routing without displacing the candidate

Keep the candidate in place and show the actual next playable area, including
closed-board fallback, in a temporary read-only preview. Maintain separate
visual meanings for containment, future routing and current access. Purple
successive scopes alone are not a move-specific tactical forecast.

The existing `GameUI.preview` uses authoritative reversible play and reports
actual closures/target/outcome; reuse that. The prototype's destination view is
explicitly the current board **before** the candidate, not a complete simulated
post-move picture. Preserve that distinction unless a post-move rendering
experiment is explicitly chosen. Previewing nine candidates is not permission
to run an AI or recommend the best move. Deduplicate equivalent destinations
and invalidate replies on move/restart, as existing guards already do.

### 5. Identity, live references and closure

A small path/board-level label associated with a lens or optional reference can
help distinguish repeated visual patterns. A crop can span several boards, so
do not label it as exactly one board merely because that board contains its
center. A hovered/focused square can have its own exact path.

Prefer one user-selected live reference over automatically adding every
affected ancestor and destination. Preserve its location, update results on
each move, visibly mark it inaccessible after closure, and let the player remove
it. A reference is a reminder, not an AI judgment of strategic importance.

### 6. Fine control and mobile placement

Retain continuous free dragging. Compare a fine-movement modifier or a clearly
separate board-step operation against fixed four-pixel taps. Snapping should be
optional and performed at a stated hierarchy level, with hysteresis so nearby
boundaries do not flicker between targets. Stopping and reversing should not
leave hidden movement after a click begins. The 35 ms response constant adds
lag by design; smoothing should be measured separately from rendering stalls.

On portrait phones, stacked full-width panels do not remain simultaneously
visible. A collapsed overview strip, temporary overview sheet, or explicit
return-to-play action may reduce page travel. These are alternatives for a
prototype, not approval to shrink the full overview. Never let auto-show scroll
the document during a finger drag. Maintain the visual world location through
resize, orientation change and browser UI height changes.

## How to test rather than select features by taste alone

Use the current layout as baseline and change one interaction at a time.
Test actual humans; the assistant's old tool execution intervals are not human
gaze or decision times. Keep gameplay reasoning time distinct from navigation
time, and balance task order so practice does not favor a later design.

Replay existing recorded positions through authoritative rules; do not rebuild
an approximate position in JavaScript. Include:

1. L4 early remote-destination check and return (X move 9 / O move 4).
2. Several distinct candidate recipients (O1044), including equivalent routes.
3. A tempting local capture with a worse outgoing area (O1134).
4. Distant prepared resources with restricted access (O1578–1586).
5. Ancestor closure making remembered descendants unavailable (O1566).
6. Four-level endings (X1478 and O1616), with last-move inspection afterward.
7. L5/L6 sparse and populated positions, corner regions, narrow legal areas,
   released root freedom, and viewport/detail boundaries.
8. Phone portrait/landscape, desktop, browser zoom, trackpad, mouse, touch,
   keyboard and interrupted computer turns.

Measure navigation actions/time, exact return error, incorrect board identity,
misclicks and unintended moves, missed closure/route information, and perceived
control. Measure frame intervals and input-to-visible-detail latency separately,
including p95/p99 and stalls rather than average frame rate alone. No hard
performance target is justified before representative device measurements.

Keep information in a preview tied to the same interaction revision as the
clickable detail. If new detail is still loading, an old coordinate mapping must
not visually claim a new square is ready. Existing request guards are useful,
but test the user's perceived alignment, not just accepted move legality.

The preferred design should reduce travel and identity/selection mistakes while
preserving the player's chosen context. It must not weaken AI, modify rules,
hide legal alternatives, or require memorizing unlabeled transient positions.
