# Two completed Level 4 games: board navigation and strategic awareness

Completed 2026-10-10. Scope: observation, research and design discussion. No game rules, AI, interface, version or publication changes were made for this analysis.

The main finding is that the player needs to compare **relationships between distant positions at several scales**, repeatedly within a move. Faster panning is necessary, but it cannot solve information disappearing at overview scales or the memory burden of showing relevant positions one at a time. A plain minimap showing occupied or won regions would also leave important tactical information out.

## Completed records and evidence

| Assistant side | Opponent | Result | Total moves | Assistant decisions | Computer annotations | Recorded inspection events |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| X | Regular Computer O | Computer O won | 1,478 | 739 | 739 | 2,266 |
| O | Regular Computer X | Assistant O won | 1,616 | 808 | 808 | 2,227 |

Every recorded move was replayed through the existing `GameState.play`; both sequences are legal and terminal. Both final outcomes are O wins, but O is the computer in the first game and the assistant in the second. Together the records cover 3,094 moves and 1,547 assistant decisions. The final O-game browser screenshot independently shows “O wins,” “Game over,” Level 4 and move 1616.

- [X move-by-move diary](level4-playstudy-x-readable-log.md) and [computer review](level4-playstudy-x-computer-review.md).
- [O move-by-move diary](level4-playstudy-o-readable-log.md) and [computer review](level4-playstudy-o-computer-review.md).
- [Completion audit](level4-playstudy-completion-audit.json), [evidence index](level4-playstudy-evidence-index.json), and selected [X](level4-playstudy-x-analysis-excerpts.md)/[O](level4-playstudy-o-analysis-excerpts.md) passages.

The full diaries were indexed by move and reviewed across opening, navigation tests, increasingly broad legal regions, cascading captures and both endings. Theme counts in the index are retrieval aids, not prevalence estimates: the diaries contain repeated route/inspection boilerplate. Raw inspection counts also mix camera visits and explicitly labeled history/status checks; they are not counts of human visual fixations.

The early X game lacks separate contemporaneous commentary for 21 computer moves. All 739 computer moves now have retrospective, rule-verified annotations, but these cannot be backdated as thoughts recorded during play. Every assistant move has a recorded decision summary. Some timing fields were not captured; unknown human inspection times remain unknown.

## The reasoning workload actually encountered

A useful decision loop was:

1. Read the currently legal leaf or broader region: marks, blockers and available choices.
2. Check what winning or defending there contributes to its containing boards.
3. Inspect the actual recipient of a candidate move, including closed-board fallback.
4. Compare alternative recipients and, where relevant, possible replies and return access.
5. Return to the candidate, verify identities and current state, then act.

This is not a claim that every move requires all five steps or exactly four views. O move 1044 compared all nine candidate recipients: five contained immediate X wins, some others were quieter, and an empty destination was chosen. Freedom after closures can make the relevant comparison set larger still.

Three different relationships must stay distinct: **containment** (which ancestors a local capture changes), **routing** (where the next player may act), and **access** (whether a prepared resource is currently reachable). An ancestor view answers the first question, but does not replace a distant recipient view. A location marker answers where something is, but not whether it can be played now.

### Navigation friction appears before the board is crowded

X move 9 inspected local 3/5/5, rejected recipient 5/5/5, inspected alternative 5/5/1 and returned to 3/5/5. Recorded navigation intervals were 2.504, 1.490, 1.812 and 2.373 seconds. O move 4 inspected 5/1/5, checked 1/5/5 and returned, taking 1.195, 2.537 and 3.117 seconds in the recorded automation operations.

These are execution intervals including browser/tool overhead, not human gaze or decision times. Nevertheless, the sequence establishes that even sparse early positions required leaving a candidate to check a nonlocal consequence and returning. At X move 475, each of three visits involved nine drags; their recorded intervals were 9.157, 5.642 and 5.710 seconds. This is evidence of an onerous interaction path, not a frame-rate benchmark.

Most inspections retained a whole-board width of about 2,635 CSS pixels so leaf patterns were readable. The X record contains 11,386 recorded drag actions; the O record contains 5,150. Those totals are not a controlled comparison: the O game increasingly used filtered move-history records to check remote patterns without camera visits. That aid reduces travel, but is not a substitute for a normal human-visible presentation. I should not present the O game as an ordinary human relying only on the rendered board.

### The detail cutoff breaks the compromise between context and readability

At O move 476, zooming from about 2,635 to 2,157 CSS pixels initially appeared to preserve marks. After the refreshed view settled, the inspected leaf contained zero buttons/text and the screenshot showed grid outlines without the recorded X/O marks. The diary retains the initial mistaken interpretation and its correction.

The inspected implementation cuts child detail below a projected board width of 96 pixels. At these scales a Level 4 leaf board is approximately 97.6 versus 79.9 pixels wide, before layout gaps. The player cannot simply zoom out a little to reduce travel while retaining slightly smaller marks: the representation changes abruptly. This is an avoidable presentation cutoff, distinct from the eventual physical limit on readable ink.

At an overview width of 239 pixels, Level 4 cells average about 2.95 pixels across; Level 6 cells average 0.33 pixels. Exact, individually readable letters cannot all fit at that scale. The answer must specify which facts remain visible and how dense regions are represented, rather than assuming one uniformly scaled drawing can do everything.

### A locally good move can have a worse remote consequence

At O move 1134, an immediate local win was deferred because its recipient would release X into a parent with a ready capture. A limited leaf concession was chosen instead of an immediate parent concession. At O move 1148, all available routes finally granted the opponent the larger opportunity, so taking the available local win was reasonable even though it could not prevent the subsequent parent loss.

This means “win,” “block,” and “center” are inadequate standalone explanations. Their outgoing legal region is part of their value. It also means a player can fully understand a danger and still lack a legal escape; an interface cannot promise that awareness produces defense.

### A ready win is not the same as access to it

The X-game ending is a strong counterexample to judging the interface only by whether threats were noticed. X had remote counterthreats, but could not reach them. At move 1477, every legal move from 8/9/5 returned O to root9 freedom. O9896 then won its leaf, parent98, root9 and the whole board. The danger was predicted before the final move. Its occurrence is not proof that missing overview information caused the loss.

In the O game, move 1542 deliberately sent X into 9/3/5. Every reply there routed O through a closed parent35, restoring root3 freedom. X was confined away from the prepared 3761 resource. O1544 then collected a three-level capture. This was an access plan valid regardless of the specific reply square, rather than a guess that the bot would cooperate.

Later O1578 captured child215 and prepared a three-level capture at2199. Several intervening replies kept O elsewhere. Only after X1585 released O into root2 could O1586 collect it. The resource needed to remain recognizable and current while the player dealt with unrelated local threats.

### A tiny final mark can change four scales

The two endings make the problem concrete:

| Game | Final mark | Leaf capture | Parent capture | Root capture | Whole-game capture |
| --- | --- | --- | --- | --- | --- |
| X game, computer O1478 | 9/8/9/6 | Middle456 in989 | Diagonal159 in98 | Bottom789 in9 | Diagonal159 |
| O game, assistant O1616 | 1/3/3/8 | Vertical258 in133 | Top123 in13 | Anti-diagonal357 in1 | Top123 |

In the O ending, X actively contested the child138 needed for O's first vertical parent13 plan: X1609 entered that child, X1611 blocked an O diagonal, and X1613 blocked an O middle-row completion. O switched to a top123 parent plan by capturing131 at1614. X1615 captured139, blocking an alternative parent diagonal but leaving1338 available. That last square ended the game.

A leaf-only display cannot explain why this is decisive. A parent-only ownership display cannot show that child133 is ready while child138 is contested. Both scales need to be intelligible together.

### Old resources and mistaken identities need explicit handling

O’s resource in755 was created at move166 and collected at1364, a 1,198-ply interval. The computer blocked an O resource in955 at1329 that had existed since232, 1,097 plies earlier. These examples establish long-lived state, not that a human should memorize a thousand moves. A useful reference should display the current position whenever revisited.

Conversely, when a parent closes, uncollected descendant resources cease to be legal opportunities. Capturing parent45 at O1566 made its other unfinished leaf patterns strategically obsolete as playable targets. Static screenshots or stale pins would mislead.

The logs retain my actual errors. O1474 incorrectly reversed ownership in a recipient and conceded an immediate X win. O1602's forecast confused178 with778; the following inspection corrected it. These are agent observation/bookkeeping mistakes, not measured human error rates or proof of a specific UI cause. They motivate testing identity and freshness, without justifying stronger claims.

## What can be said about the regular computer

Every computer move has a replayed effect and a qualified human interpretation. The source supports local opportunity evaluation, weighted ancestor evaluation, forced-region evaluation and bounded iterative alpha-beta search. It does not expose the completed depth, principal variation or deciding score for each recorded move. The larger-game search uses a time limit, so an identical input does not guarantee an identical completed search depth under different machine load; replayed replies should be checked rather than assumed.

The computer made 56 immediate local blocks in the X game and 66 in the O game. Its X-game moves included nine two-level cascades, two three-level cascades and the final four-level cascade; its O-game moves included nine two-level and one three-level cascade. These are verified effects, not a strength comparison between sides or an assessment of optimal play.

Knowing the opponent is a robot, repeated center choices or surprising choices can arise from evaluation, ordering or limited completed search; they do not demonstrate a hidden deep plan. Interpreting the same move as human, it could be development, an access trap, an accepted tradeoff, missed information or attention to a different parent line. The diary keeps those interpretations separate. For example X1615 may look like defending the wrong line in hindsight, but only the resulting available O win is established.

## Research that fits these observations

Plumlee and Ware found more errors with serial zoom than with multiple windows in a multiscale visual-pattern task; simultaneous views allowed more eye-driven revisits. This supports comparing persistent views here, but does not establish an optimal window count for this game. [Original research](https://scholars.unh.edu/ccom/1080/).

Factorio’s developers describe remote inspection interrupting the current task and use pin/alert camera previews and explicit navigation history. These are close examples of preserving a work location during remote checks. [Previews](https://www.factorio.com/blog/post/fff-423), [history](https://www.factorio.com/blog/post/fff-397).

Supreme Commander’s strategic view and FAF's independently configured icon/detail thresholds illustrate that overview information need not be just shrunken detailed geometry. OpenRA separates radar information from the detailed view. These support a distinct strategic representation, not an assumption that their exact rendering systems fit this browser. [Official manual](https://support.na.square-enix.com/document/manual/925/SC2_Manual_PC.pdf), [FAF blueprint](https://github.com/FAForever/fa/blob/develop/units/UEL0001/UEL0001_unit.bp), [OpenRA radar source](https://github.com/OpenRA/OpenRA/blob/bleed/OpenRA.Mods.Common/Widgets/RadarWidget.cs).

Factorio’s rendering accounts describe retaining unchanged prepared content and updating newly exposed strips. That is relevant to camera lag independently of the awareness issue. The transferable requirement is bounded work on visible/changed regions, not rendering every possible empty leaf or allocating a bitmap for the entire expanded board. [Caching](https://factorio.com/blog/post/fff-323), [scrolling updates](https://factorio.com/blog/post/fff-333).

Exhaustive explanation also changes the task. Research on verbal reporting finds explanation can affect performance and reporting tends to increase completion time. These diaries therefore cannot establish ordinary human move times. [Meta-analysis](https://pubmed.ncbi.nlm.nih.gov/21090887/). Additional evidence and qualifications are in [human interpretation](playstudy-human-interpretation.md), [whole-board awareness](recursive-board-awareness-research.md) and [rendering comparisons](large-map-rendering-research.md).

## Grouped solutions and priorities for discussion

These are proposals, not approved implementation. Presentation must reuse authoritative rules; no AI-strength change follows from this study.

| Priority | Problem | Candidate response | Main tradeoff |
| --- | --- | --- | --- |
| 1, parallel foundations | Camera movement is cumbersome; marks disappear at scale | Profile movement and refreshed-detail boundaries; keep stable drawing data, bounded regional caches and a persistent occupied-mark/overview representation | Rendering replacement may affect picking, keyboard access and accessibility; overview overlap policy requires agreement |
| 2 | Repeatedly comparing distant tactical positions | Persistent whole-board context plus user-selected live detail previews, including a candidate recipient and useful ancestors | Screen area and panel management; avoid implying a fixed number of views solves every depth |
| 3 | Nominal address obscures actual legal scope | Neutral candidate-route preview that shows the resulting leaf, parent, root or global freedom after closures | Extra computation; must use authoritative state and must not silently become move advice |
| 4 | Returning to a candidate loses position or scale | Explicit Back/Forward and live bookmarks restoring exact camera center/zoom | Serial comparison still relies on memory; bookmarks must show current state rather than an old picture |
| 5 | A closure changes strategy at several scales | Show the ancestor chain and cascade; keep ready resources distinct from developing targets and currently legal access | Threat overlays can become strategic assistance; scope and visual policy need explicit approval |
| Later exploration | Higher depth overwhelms panels and overview pixels | Optional branch comparison, previews on demand, user pins, possible access visualization | Screen space, clutter and potentially expensive analysis; validate usefulness before broad implementation |

My preferred design to evaluate is a main detail viewer that remains under user control, a persistent meaningful overview, and a small number of selectable live comparison views. One view can show a remote recipient without abandoning the candidate; an ancestor strip can explain the candidate’s strategic contribution. A selectable region could temporarily expand for deeper examination. Exact camera return remains useful alongside those views. None should automatically move the main board when focus changes.

The overview needs a specified hybrid policy: readable marks when space permits; a distinct occupied-region representation when it does not; accurate completed-board ownership; a discoverable last move and actual legal scope. Counts/density alone preserve activity but hide arrangement. Minimum-size letters preserve ownership but can overlap. Showing ready completions could help substantially, but is more gameplay assistance than merely preserving marks and should be a separate decision.

I would defer fisheye distortion, many permanent windows, automatic threat ranking and a full access graph. They remain brainstorming candidates, but their clutter, rule-presentation and assistance tradeoffs are less justified than basic visibility, comparison and exact return.

## How to decide between the candidates

Use recorded positions rather than replaying another thousand-move game for each design. Include: early local/remote/return comparison; the settled move476 detail cutoff; move1044's nine recipients; move1134's locally winning but remotely costly choice; move1542's guaranteed access; the contested parent13 ending; and the X-game ending where awareness cannot create access.

Measure separate things: camera frame pacing and detail-update delay; time/actions to locate, compare and return; correctness of route/ancestor interpretation; stale or misidentified regions; ability to notice a remote change. Test the same semantic workflows at greater depths, including dense and sparse boards. Use actual human players for human performance claims, with short concurrent comments and retrospective explanations; include silent trials if timing matters.

No prototype, rendering rewrite, rule aid or AI change is authorized by this report. The next discussion should settle what information must survive zoom, which simultaneous comparisons are worth screen space, and whether consequence previews are desired before implementing them.
