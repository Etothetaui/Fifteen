# Relay verification — 2026-10-17

## Scope and status

The new interface is playable against the unchanged AI or a second person.
The original `fifteen.py`, AI modules and original UI are unchanged. The existing
exact-game adapter was extracted from the sibling experiment into `campaign.py`;
the sibling `command.py` now imports that implementation. Its asset directory
and existing save location remain intact. The squad tactics experiment is not
the rules engine for Relay.

Mechanical checks pass. Usability has improved during browser playtesting.
The final 2026-10-18 audit below supersedes earlier usability status and test
counts. Mechanical checks and visible-interface checks pass, including fresh
start, import cancellation/restoration and both ending screens. The playtest
assessment is positive for a long strategy game: multiple threats, route choices
and a planned capture trade were understandable and engaging. The sparse opening
is still slow; no rule was changed to shorten it.

## Automated evidence

- Original project suite: 59 tests passed before adding Relay tests.
- Relay contract suite: ten tests passed, including a 300-step randomized
  prefix-permission walkthrough compared with original `GameState`, state and
  history restoration after previews, hypothetical two-move previews, original
  AI, save replay, failed imports, undo and sparse navigation permissions.
- Prepared ten-level cascade: the last single leaf move triggers ten original
  captures and root victory; preview restores state and undo restores all levels.
  Setup creates a test fixture through original `Board.play`; production gameplay
  provides no fixture or shortcut. This does not establish a legally played
  entire match from the initial empty world.
- Draw fixture verifies that a closed destination releases its nearest unfinished
  parent and the drawn child remains unavailable without crediting either player.
- HTTP check loads only the named assets and commits exactly one leaf move before
  returning the computer's turn. API revisions reject stale requests.
- Sibling adapter regression suite: 19 tests passed after extraction, including
  save replay, original AI, invalid preview restoration and ten-level cascade.
- `node --check relay.js` passed.
- Combined original and Relay suite before the longer planner: 68 tests passed.
- Complete current suite after the shared preview extraction: **69 tests passed**.
- Ten-move planner contract compares its resulting route, turn and visible
  ownership with original `GameState`, then verifies restoration on success,
  invalid moves and invalid inspection. Both existing single/two-move previews
  and longer plans reuse one reversible context boundary; the 19 sibling adapter
  regression tests passed again after that extraction.
- Per-choice destination hints verify possible immediate opponent captures by
  original reversible replies, rather than a second winning-rule implementation.
- Hypothetical hierarchy inspection verifies post-move routing permissions and
  restoration on invalid inspection paths.

## Browser playtesting

All listed gameplay actions used visible browser controls, rather than API calls.
The main playtest server used an isolated unsaved game; older player saves were
not loaded or modified.

- Read instructions; select Ember; compare an exact hypothetical Aster reply;
  return and commit once. The computer visibly takes one turn.
- Follow the Ember route to move 11. Red's Ember claim is visible in the current
  location, its latest-move report and the inspector.
- Preview Aster in that contested location. The UI states it blocks one red set
  and builds A–B–C and A–D–G. Commit, observe the new assignment and inspect the
  opponent's actual response.
- Inspect the world, inspect a prior opponent location, then return directly to
  the current move without increasing the move count.
- Select and commit by keyboard. Undo restores the preceding human decision,
  including the computer reply.
- In a separate prepared endgame, preview Cinder: the UI shows ten closures and
  world victory. Commit once, inspect world ownership, undo and verify the
  contested leaf and 2/3 linked-set progress are restored.
- In a separate two-person game, blue commits Aster, red commits Beacon and blue
  commits Ember. Each action advances exactly one turn.
- Actual 390×844 viewport: compare Cinder and Ember previews, use **Choose a
  different relay**, commit Ember and observe Red's turn. Content width was 375
  pixels with a vertical scrollbar and no horizontal overflow. An additional
  390-pixel frame was visually inspected, but its browser automation could not
  click controls; the actual narrow tab supplied the interaction evidence.
- Browser export downloaded `relay-save.json`; importing the same file through
  the menu restored the played 12-move state.
- Saving-enabled server restarted and resumed the 32-move campaign with the
  same address, ownership, turn and opponent report.
- Longer visible-control play continued to move 63. Players followed a return
  route and completed or blocked displayed linked sets when possible. The first
  location capture happened on move 62: Red captured Aster at level 1. **View
  parent impact** showed the actual red-controlled Aster relay and 1/3 red
  progress at level 2, without advancing the game. The replay, later extended to
  64 moves, is stored
  separately in `research/relay-browser-playtest.json`.
- Continued a hypothetical Aster/Ember route through nine planned moves. Its
  ninth destination encountered the location Red had actually captured, so the
  engine opened its level-two parent. The planner displayed all eight remaining
  open child locations and the red-controlled closed child. Chose another child,
  added the tenth hypothetical move, and reached the analysis limit. This did
  not advance or queue any live moves.
- Compared a Cinder candidate with the Aster plan. The corresponding ninth
  assignment remained fully forced into Cinder's region rather than releasing
  the captured location's parent. Returned from the planner with 62 real moves
  unchanged, committed Cinder once and observed the computer reply: 64 real
  moves. The remaining hypothetical moves were not executed.
- Repeated the latest planner at an actual 390×844 viewport. Detected and fixed
  relay-row height changes as asynchronous destination hints arrived, and
  removed selection-scroll animations. Repeated Cinder, Iris and Ember selection
  after reload: every decision and planner heading matched the requested relay.
  Added two hypothetical moves, removed one, returned to the unchanged 64-move
  game, and reset the viewport. Evidence is in `research/relay-phone-planner.jpg`.

## Changes driven by playtesting

- Replaced the initial nine-card arrangement with named relay rows.
- Added explicit linked sets built and opponent sets blocked to each preview.
- Added hypothetical replies, consistently named paths, recent-move inspection
  and a compact opponent report above the field.
- Added small-screen preview scrolling and a return-to-selection control.
- Collapsed long capture cascades and suppressed opponent-routing prompts when
  a preview would end the game.
- Added per-choice destination summaries and factual immediate-capture warnings.
- Made ownership propagation explicit in capture reports and added a direct
  parent-impact inspector. Corrected legal alternate-location headings and
  two-person instructions.
- Extended the optional continuation explorer to ten moves with a compact
  sequence, removable steps and an expandable routing trace. Released regions
  show the whole legal scope. This adds no live actions or AI predictions.

## Remaining audit

- Longer strategic play: assess whether route inspection and local contest make
  fresh L10 play sufficiently engaging; the sparse opening is still a concern.
- Finish final runtime handoff with a fresh saved game after further playtesting.
- Recheck the latest labels and capture-warning presentation in the browser.

## Current continuation evidence — 2026-10-17

The complete current suite passed: **73 tests**, using
`python -m unittest discover -v`. This supersedes the older counts above.
`node --check relay.js` also passed after the latest presentation edits.

New coverage verifies per-side activity through replay, undo and reset; the
latest finished location remaining discoverable beyond the short history;
remote unfinished objectives without relaxing routing permissions; and stable,
distinct location references without changing state. Names are descriptive;
the accompanying references disambiguate repeated names.

The live saved campaign has now reached **102 actual moves** through visible
controls. The frozen 64-move contract fixture remains unchanged. At move 95,
World showed High Spire and Iron Hill with Blue 2/3 open sets. Inspecting High
Spire showed Blue Delta and Ember, with Forge unclaimed and correctly unavailable
outside the assignment. Returning to play preserved the turn.

Blue played Aster at Quiet Bridge on move 95, blocking a displayed Red set.
Red claimed Ember at Cedar Bridge on move 96; the interface reported the actual
assignment to Flint Crossing. Blue then played Ember on moves 97, 99 and 101,
trying to return toward earlier progress. Red played Ember on 98 and 100, then
Aster on 102. That changed the continued route to Quiet Bluff. These are actual
moves, not a claim about the AI's intention or a guaranteed continuation.

Playtesting found that a destination name alone did not explain its strategic
state. The selected-move preview now displays the original hypothetical
destination's existing claims and leading open sets. It says explicitly when
no relays have been claimed. This was observed with an empty destination and,
before move 101, a destination with Blue 1 and Red 0 and a Blue 1/3 set. Released
areas do not display their first leaf as if it represented the entire area.
The computer-turn assignment text also now says to wait for its one legal
reply instead of telling the player to choose.

Current screenshot: `research/relay-destination-preview.jpg`.

The current named-location UI was subsequently exercised at 360×780. Cinder's
preview displayed Cedar Field's empty state; exploring Red Ember showed the
next hypothetical assignment, and retaining that hypothetical reply did not
advance the live 102-move game. World still showed 51 moves for each side.
Iron Hill's inspect-only view showed Blue A–B–C at 2/3 and Red D–E–F at 1/3;
returning to play and reviewing Red's actual move showed its Aster claim beside
Blue's existing Ember. Document width equalled the 345-pixel content viewport,
with no horizontal overflow. The temporary viewport was reset afterwards.

That review exposed a missing explanation in the opponent report. It now uses
the recorded event's original linked-set membership and before cells to state
which active Blue sets were blocked. The actual move-102 report correctly says
Red blocked Blue's A–E–I set. Selected-move previews reuse this same presentation
helper. The report also calls out newly formed 2/3 open sets. No rules or AI
behavior changed. The browser reported no console errors after this change.
Phone evidence: `research/relay-phone-destination.jpg`.

A separate unsaved game on port 8095 supplied a fresh opening walkthrough.
Its instructions introduced one move, redirection and linked sets. Comparing
Aster and Ember showed three versus four open sets and different destinations.
Aster sends Red to the same starting location, while Ember sends it elsewhere.
The preview now explicitly identifies a same-location assignment. Its count
label says **Claims after this move**, so the hypothetical new Blue claim is
not mistaken for a pre-existing live claim. After committing Aster once, Red
claimed Ember in that same location; the report identified the blocked Blue
A–E–I set. Reviewing the actual location showed Blue Aster and Red Ember, then
allowed a direct return to the new assignment. The original 102-move save was
not replaced. This establishes an understandable opening interaction, not a
complete fresh-player or sustained-enjoyment result.

### Continued opening and selection feedback

The isolated fresh game reached 12 real moves. Blue chose Ember on moves 3, 5,
7 and 9 after comparing its four open sets in otherwise empty locations; Red
also chose Ember. On move 11 at Iron Hill, comparing Ember and Aster showed a
concrete tradeoff: Ember leaves Red in that same location, while Aster sends Red
to Bright Spire. Blue chose Aster; Red claimed Ember there and assigned Blue to
High Spire. These moves used visible controls. The replay is archived in
`research/relay-fresh-opening.json`; the unsaved server was restarted and that
same legal replay restored through the existing loader, preserving move 13.
No new moves were generated during restoration.

The repeated empty turns were still uninteresting in this walkthrough. The
same-location versus different-location decision was understandable and gave
a reason to compare choices. This is a specific positive result, not proof of
sustained entertainment.

Selection feedback now shows up to two affected open linked sets as visual
rows in the decision panel, using the adapter's recorded after-cells and
network counts. A dashed outline identifies the proposed claim. Additional
affected sets remain available in an expandable section. The field is labelled
**Current progress** and retains committed ownership. This places the proposed
effects beside the commit control on both desktop and phone, rather than
requiring a scroll past all nine relay rows. Ember and Cinder produced different
matching rows in a 360×780 interaction; content and viewport widths both
measured 345 pixels. The viewport was reset after testing.

The compact **How this contributes** section reads the existing parent view;
it does not calculate separate ownership or win rules. It identified Deep Glen
as High Spire's parent. **Inspect parent goal** opened its actual child-location
contest, and returning to the assignment preserved move 13. The selected-move
and parent views reported no browser errors.

The unsaved QA session had incorrectly displayed "Saved". Snapshot metadata
now reports whether automatic saving is enabled; the footer and Game menu both
explain an unsaved session accurately. The save/restore test covers both states.
Full project checks passed again: **73 tests**. Existing shared-adapter consumer
checks also passed: **19 tests**, including the bounded payload and 1,500-move
sparse-state case. That case allocated 9,518 boards and completed in 0.280s.

The latest visual preview and ending flow were also retested in an explicitly
prepared endgame on port 8096. Cinder appeared as the dashed third Blue claim
in A–B–C, with 3/3 progress and ten original closures. Committing it once showed
Blue's world victory and closed remaining branches. Undo restored the contested
leaf, Blue Aster and Beacon, available Cinder and 2/3 progress. This supplies
ending-flow evidence only; it is not a match played from the empty world. The
temporary endgame tab and server were closed afterwards.

The optional continuation trace now leads with named locations rather than raw
addresses. A two-move plan read: Blue Cinder at High Spire sends Red to Stone
Gate; hypothetical Red Ember there sends Blue to Bracken Spire. Each step's
address remains expandable. Expanding both confirmed that the candidate Cinder
was tracked in gold in each original forced destination. Returning left the
recorded game at 12 moves, with no console errors.

The latest phone check explicitly selected a visible temporary game tab before
setting 360×780; measuring the target tab confirmed a 345-pixel content viewport
and equal document width. This matters because setting a browser viewport while
another tab is selected does not necessarily resize the tested page. In the
verified narrow tab, the decision panel displayed the dashed Cinder preview,
the other-set expander, named destination and commit button. The named plan was
also readable and left move 13 unchanged. The viewport was reset and the
temporary tab closed. Current screenshots are `research/relay-linked-preview.jpg`
and `research/relay-phone-linked-preview.jpg`.

### Earlier requirement audit status (superseded below)

- M1–M6, I1–I2, A1–A4: covered by original-engine reuse, contract checks and
  the prepared browser cases recorded above. Prepared root endings do not
  establish a complete match played from an empty world.
- I3: sparse state and bounded views are exercised; prolonged full-campaign
  performance remains a practical limit of the evidence.
- I4, U7: separate saves and original interfaces are preserved; computer,
  two-person, save restoration, import/export, undo and ending flows have been
  exercised. No AI algorithm was changed.
- U1–U6, A5: substantially implemented and observed on both screen sizes; a complete
  fresh-player learning walkthrough remains necessary. Inspection in an ongoing
  campaign does not establish that a newcomer can learn the game unaided.
- U8, A6: **not established**. Empty locations and interrupted return routes still
  produce stretches with little immediate contest. Better information has not
  yet demonstrated sustained enjoyment. Keep this gate open; do not treat passing
  tests or additional move count as proof that the game is fun.

## Continuation — 2026-10-18

The live campaign reached **154 actual moves**, all made with visible controls
from the original empty world. It is archived in
`research/relay-playtest-final.json` and
`tests/fixtures/relay-countercapture.json`. The earlier 64-move fixture is intact.
The final full project run passed **75 tests** in 12.342s. The 19 existing adapter
consumer tests passed after the objective-view extraction, including the sparse
1,500-move and bounded-response checks. `node --check relay.js` passed.

### Actual strategic play

- A Forge/Ember hypothetical line from move 103 showed Red could route Blue to
  Iron Hill's 2/3 set or several less-developed siblings. The same live route
  ended with Red Aster at move 112, assigning Blue to Bright Spire instead.
- Blue Cinder at 113 built Bright Spire's A–B–C to 2/3. Blue Grove at 123 built
  Golden Landing's A–D–G to 2/3. Their parent Elm Haven showed those partial
  contests separately from ownership, alongside Iron Hill's 2/3 set.
- An attempted repeated-Ember hypothetical line stopped at an already occupied
  relay. It was not treated as a guaranteed route or executed in live play.
- Red Beacon at 122 formed B–E–H at Deep Reach. Red Cinder and Grove at 132 and
  142 formed C–E–G at Clear Gate. The opponent report identified these specific
  developments. Blue Grove at 133 and 143 developed other sibling locations.
- Before Blue's move 151, the preview warned that Red could capture Clear Gate.
  Comparing replies showed that Red Ember captures it but assigns Blue to Iron
  Hill. In the planner, selecting that reply then Blue Cinder demonstrated the
  capture and countercapture through the original engine, leaving 150 live moves
  unchanged.
- Blue offered that trade with Ember at 151. Red actually captured Clear Gate
  at 152. Blue Cinder at 153 then captured Iron Hill. Red's actual following
  Ember at 154 blocked Blue's C–E–G at Green Beacon. The interface displayed each
  action separately; no hypothetical move was queued.
- Inspecting Blue's result showed the closed Iron Hill and then its parent:
  Elm Haven's E entry was Blue controlled, with 1/3 Blue parent progress. The
  remaining partial sibling contests were still unclaimed. Inspection did not
  advance move 155.

This supplied an engaging decision loop in the playtest: develop several threats,
observe the opponent's route choices, compare a risky trade and execute the
countercapture. Earlier isolated near-complete locations had felt aimless; the
parent overview and reply comparisons made their relationship understandable.
The sparse opening remains slow. This is an assessment of the played experience,
not a claim that automated tests establish enjoyment or that every player will
enjoy a long campaign.

### Interface changes and checks

Reply comparisons reuse the existing reversible plan API for at most nine legal
choices; no UI simulation or AI selection was added. Each shows its next
destination, best open sets and closures. Selecting a reply now advances analysis
with one click. Removing that planned move restores the preceding analysis
position. Current objectives appear above the choices; **Return to planned
assignment** returns directly from inspection. The ten-move analysis limit is
explicit. Display caches are bounded to 1,024 place records and 32 reply contexts.

Parent summaries reuse the extracted `objective_view` presentation function,
whose membership still comes from `winning_triples(MAGIC_BOARD)`. The new
contract test checks partial threats, unchanged ownership and original legal
permissions without changing state. The natural countercapture replay test
compares the played position and the next four moves with original `GameState`,
including the two expected captures.

At a verified 360×780 viewport, all nine reply comparisons were readable; the
content and viewport widths both measured 345 pixels. Selecting the last reply,
removing it, inspecting its parent and returning directly all left the live game
at 154 moves. The viewport was reset. The earlier two-person, import/export,
restart, draw/release and root-ending evidence remains applicable; its rules and
state paths were not replaced.

### Historical fresh-start issue (resolved in final audit)

The browser-native `confirm()` for replacing a game stalled its test tab. A
separate tab remained readable but could not deliver clicks while that native
dialog was pending. The 154-move save was verified and archived before the
attempt, and no replacement was committed.

The game now uses an in-page replacement section shared by New Game and Import,
with **Keep current game** and **Replace game**. Verification was pending at this
point; the subsequent recovery and successful checks are recorded below.

## Final audit — 2026-10-18

The stalled native-dialog tab was removed by browser cleanup. The final game
uses only the in-page replacement flow. Cancelling New Game preserved all 154
moves; confirming produced a saved empty game. Aster then produced exactly one
Blue move and one Red reply, and Undo restored the saved empty game after reload.
Two-person mode advanced one move per commit and undid one move. Importing the
12-move opening was tested through the file chooser: cancel retained the current
one-move two-person game; choosing the same file again and confirming restored
the original 12-move computer game at High Spire. No browser errors were reported.
An unreadable JSON file displayed a clear visible error and preserved the save.

The final saved computer game was reset to zero moves and reloaded through the
UI. The running export equals `relay-save.json`. Loading that save with Campaign
matched original `GameState(levels=10)` in root key, player, forced scope, ply and
outcome, with no allocated descendants and zero captures. The complete 154-move
playtest remains archived separately. Both older experiment save hashes still
match the recorded originals; `fifteen.py`, the original AI and original UI have
no tracked changes.

A prepared drawn-world summary was also inspected in a separate test server.
The original `Board.refresh_result()` computed the terminal draw from closed
child entries; it was not a legal replay or a gameplay shortcut. The browser
showed **World drawn**, nine drawn entries and the ended-game controls. **Start
another game** returned to nine playable empty relays. This supplements the
earlier prepared victory/undo check and the original-rule local-draw/release
check. Both temporary ending servers and their tabs were closed.

### Requirement-by-requirement evidence

| Requirement | Current evidence |
| --- | --- |
| M1: original empty L10 start | `game_session` fixes `LEVELS=10`; final persisted-start comparison with original `GameState` passed. |
| M2: exact original rules | `TrackedPosition` and `ObservedSession` call their original implementations; the 300-move comparison and natural countercapture replay match original state, route and results. |
| M3: one leaf move, alternating turns | Original session handles every commit. Fresh computer and two-person UI checks counted one move per side; natural captures each used one commit. |
| M4: all and only legal choices | Prefix-permission walkthrough compares all nine choices at every depth; navigation tests and live occupied/released/closed inspections use the same flags. |
| M5: free reversible inspection/planning | Preview/plan restoration tests cover success and failure. UI analysis, parent inspection and return left live move counts unchanged, including at 150 moves before the trade. |
| M6: no replacement mechanics | No resources, combat, action points, automatic descendant completion or extra scoring. All captures are consequences of original `position.play`; original AI is unchanged. |
| U1: no math or tic-tac-toe prerequisite | Three visible instructions describe claims, destinations and linked sets. Named relay rows and displayed sets expose no magic values or sum calculation. Fresh opening was played through these controls. |
| U2: turn, choices and objectives | Tested Blue/Red turn headers, available/occupied/closed/outside-assignment labels, current linked sets and parent goal/result links. |
| U3: effects before commitment | Dashed claim previews, blocked sets, exact destinations, capture warnings and original-engine reply comparisons demonstrated the three-step capture trade. Analysis is labelled hypothetical and limited explicitly. |
| U4: opponent activity and consequences | Actual moves 152 and 154 showed capture and blocked-set reports with named destinations; review and parent-impact inspection retained the current assignment. |
| U5: manageable hierarchy | Normal turns open the forced scope directly. Nine immediate children are shown, with optional hierarchy inspection and direct main/planned-assignment return. Desktop and verified 360×780 interactions passed. |
| U6: persistent context and progress | Stable named references, recent events, persistent finished-location report, watched open sets and nine-child tactical summaries retained older objectives. Partial progress and parent ownership were visibly different after Blue's capture. |
| U7: complete playable flows | Computer and two-person play, instructions, persistent restart, export/import, cancel/confirm, invalid import, undo, prepared win/draw screens and starting over were exercised. |
| U8: meaningful, enjoyable play | The legal recording supports meaningful local capture/block decisions. Later blind testers understood those decisions but found sustained progress and long-range returns difficult. Human enjoyment and retention remain unverified. |
| I1: one rules implementation | Original `fifteen.py` supplies moves and results; objective membership derives from its `winning_triples`. Browser code renders facts and calls reversible APIs. |
| I2: separated presentation | Campaign observes/composes original session and position; transport and browser do not transition domain state independently. The objective presentation extraction passed existing consumer tests. |
| I3: sparse and bounded | Nine-child views, no full-tree allocation, 1,500-move sparse/bounded-response regression and capped place/reply display caches. |
| I4: preserve existing work | Original rules/AI/UI diff is empty; older save hashes match; playtest archives and the final fresh save are separate. |
| A1: sequence equivalence | Long-sequence and 154-move recorded countercapture tests compare original root state, turn, route and results after moves. |
| A2: single-action propagation | Natural captures at 152/153 and prepared all-ten-level cascade each use one original leaf move; no descendant auto-fill exists. |
| A3: restoration and errors | Preview, invalid reply/inspection/plan/import, replay, undo and persistence tests pass; visible import cancellation and unreadable-file handling preserve state. |
| A4: edge and ending coverage | Deep routes, occupied destinations, nearest-parent release, local draws, multi-level closure and root victory/draw presentation are covered. Prepared states are explicitly distinguished from the 154-move legal replay. |
| A5: five player questions on normal/narrow screens | Turn/objective labels answer what to do; claim/destination previews answer effects; opponent reports answer what changed; parent result answers larger contribution; return controls answer how to resume. All were used through visible controls, including verified phone layout. |
| A6: actual opening and revisits | Empty opening, later revisits, multiple near-complete locations, an invalid planned repetition and the eventual capture trade were observed and recorded. Changes addressed lost context and excessive planning clicks. Enjoyment is judged from this play, not inferred from passing checks. |

### Final handoff

- Fresh computer game: `http://127.0.0.1:8093/`, saved at zero moves with instructions open.
- Launch later: `relay-launch.cmd` or `python relay_server.py --open`.
- Full checks: **75 passed** with `python -m unittest discover -v`; original shared-adapter consumer checks: **19 passed**. Browser syntax check passed after final UI changes.
- Proof image: `research/relay-ready.jpg`. Natural parent result: `research/relay-captured-parent.jpg`.
- Complete-playthrough limit: no claim is made that a root-level match was played naturally to completion; root endings were tested from prepared positions. The actual starting-state campaign supplied 154 visible-control moves.

The resulting presentation is judged learnable and engaging for deliberate,
long-form strategy play. The original L10 rules still produce a slow, sparse
opening and a potentially very long campaign. The implementation reports that
constraint rather than hiding it with altered rules.

### Visual presentation pass — October 18, 2026

- Ownership uses blue circles and red diamonds throughout relay rows, linked sets, routing, navigation and analysis. Gold dashed outlines indicate an uncommitted preview. Open rings and separate closed/unavailable symbols retain non-color cues.
- Candidate and opponent moves show a claim → next-player location diagram. The latest move remains visible above the field. Blocked sets show their recorded members crossed out; three-part meters show progress, with +1 for a set one claim short and a check for a complete set.
- All memberships, owners, counts, legal choices, destinations and capture warnings still come from the existing adapter. No domain, AI or transition code changed.
- Browser checks covered previews, opponent review, a captured location, parent progress, and hypothetical replies using the recorded 154-move game in an isolated unsaved session. At a 360px viewport, document width and scroll width both measured 345px. The live user's two-move save was not replaced or advanced.
- Validation: JavaScript syntax check passed; all 75 existing tests passed (12.160 seconds).

### Shared-emblem groups — October 18, 2026

Each original objective ID now has one visual emblem: Sun, Moon, Flame, Leaf, Wave, Mountain, Feather or Bolt. Relay badges are derived from the adapter's objective membership. Selecting an emblem groups its three members at the top, highlights their matching badges, and dims other choices; visual order and keyboard order agree. It does not choose or commit a move. Group names also appear in previews, recorded effects and hypothetical choices. The same presentation applies to children at higher levels; ownership still requires winning that child under the original rules.

Browser verification selected all eight emblems: each highlighted exactly three members and dimmed six, with the live move number unchanged. A 360px viewport showed the Wave group together and measured 345px document and scroll widths. JavaScript syntax and whitespace checks passed. No rules, backend, AI or save format changes were made.

### Learning-curve iteration — October 20, 2026

The handoff and judgments above describe earlier iterations. The current
learning-curve work and each acceptance decision are in
`RETENTION_IMPROVEMENTS.md` and `RETENTION_TEST_LOG.md`. Later independent tests
found the sparse opening and long-range routing harder than those earlier
judgments suggested. Agent playtests establish specific usability observations;
they do not establish human retention or enjoyable play for every player.

The latest complete suite passed **80 tests** in 14.376 seconds, including the
new isolated opening/capture replay, actual-activity summaries, exact undo
scope, game-local location numbers and original-engine capture-reply evidence.
Preview and hypothetical exploration still restore state on success and error.
JavaScript syntax and whitespace checks passed after the latest interface
changes. Original rules, AI and original interface source have no tracked diff.

The live save is now the earlier 40-move browser-playtest position, not the
zero-move handoff described above. Its SHA256 remains
`2ACC210E87A1D9F7ACE48C1A0CC7C1497C776C75C4BD48F022C9BB88A556146C`.
All new blind sessions run on independent unsaved ports. Recorded positions
come from legal original-rule replays; no opening shortcuts were introduced.

Further recovery inspection caught and fixed stale browser location numbers
after undo. The backend had already restored the correct state; the browser
now replaces its identity cache from that restored view. Two-tab recovery
also discarded a stale candidate without committing it. Explorer ancestry
uses the same shared place identity as each actual field, removing relay-name
fallbacks. Full names still fit the 360px explorer: 345px document/scroll width,
501px dialog height. Subsequent blind-review outcomes are recorded in the test
log before accepting the remaining item.

The identity iteration then replaced routine visit-order IDs with stable
patterned markers and the original exact reference. Marker metadata reuses
the existing place-name digest in the shared identity function. Place names
and references are unchanged. Higher-level NEW/Visited labels consume actual
activity totals rather than leaf-only visit numbers. A played continent and
an empty outpost were inspected directly; the full-reference phone preview
still measured 345px document/scroll width at a 360px viewport. Failed blind
sessions caused by account limits are recorded separately and never counted
as positive evidence.

Later orientation/wording refinements restore visible turn context after commit,
undo and inspection on desktop and narrow screens. Desktop verification placed
the new turn at y=100 and its location heading at y=476 in a 720px viewport.
Objective copy uses emblem group; parent progress distinguishes child locations
won from moves inside. The remaining review status is in the live worklist,
with all qualifying and adverse blind observations preserved in the test log.
## Collection publication: 0.4.0-dev

Relay is now available as `/relay/` beside the original `/tic-tac-toe/`, with a
game picker at the collection root. Static hosting runs the same Python
Campaign through the existing Pyodide loader; the optional server calls the
same transport-independent API. No original rules or AI changed.

Release checks: 86 Python tests passed, including browser save replay,
stale revisions, invalid imports, unsaved sessions, original undo behavior and
example isolation. All 90 JavaScript checks passed, including project-prefix
asset resolution, shared runtime loading, browser storage failure, corrupt-save
preservation and the no-Web-Locks fallback.

Actual browser verification on a plain static server: both picker links loaded;
Relay played Aster plus a computer reply and reloaded at two moves. A second
tab undid the pair; attempting to commit the old preview in the first tab was
rejected and refreshed at zero moves without committing it. Both the opening
and 150-move capture examples loaded from the published fixture assets. The
original game initialized with v0.4.0-dev at its new path and accepted a normal
Level 1 center move and computer reply. The collection's desktop layout was
checked. Its stylesheet stacks the cards below 620px; the attempted phone
viewport override did not change the background tab's measured 1280px width,
so this run does not claim a measured phone-browser check.

Browser saves are local to the browser/site. Server saves are not uploaded or
automatically transferred; use the existing export/import controls to transfer
one. Personal live saves and test-server journals are excluded from publication.
