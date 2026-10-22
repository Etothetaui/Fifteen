# Relay implementation and blind-test record

The pending list is RETENTION_IMPROVEMENTS.md. This file preserves completed
items, test evidence, rejected approaches, and follow-up decisions.

## Baseline

One fresh agent independently played 20 own turns (40 total moves). It learned
controls before strategy, found dispersed empty-location progress repetitive,
first arranged a route reconnect around turn 10, recognized a threat at turn
15, and avoided a capturing reply by exploring the preview at turn 20.

## Current work

All 22 numbered items have been accepted with evidence below, including the
reopened R10 follow-up. No numbered implementation items remain pending.
No implementation change has been published to GitHub. Original rules and AI
remain authoritative.


## Batch A — opening, continuity and identities

Three independent page-only testers used ports 8100, 8101 and 8102. The first
 two played ten own turns each from empty games; the third continued a real
154-move recording for eight own turns. No proxy clicks or game explanations
were supplied. Frontend was frozen throughout their runs. All had working
browser access. The new continuity facts passed 17 adapter/HTTP tests.

Accepted and removed from Pending:

- R01: A1 found the first-turn claim→destination→commit sequence clear; A2
  explicitly understood that the claim stays here while the opponent moves.
  A3 also distinguished preview from commitment. Opening no longer forces the
  full help modal; incremental guidance is separate from move count.
- R09: full member names now accompany the same relay badges used in choices.
  A2 understood matching any common emblem; A3 explicitly found Sun highlighting
  clear, and A1 could plan local emblem combinations without reporting letter
  decoding as a remaining problem. This acceptance covers identification, not
  success at reaching a strategic contest.

Remaining findings and decisions:

- All three still found empty-location seeding unrewarding. Do not interpret
  clear controls as successful retention. R02/R03 remain pending for later
  evidence; R04 and R15 should teach and demonstrate routes much earlier.
- A1 and A2 only discovered address-shift routing around turns 7–10.
- A2 encountered two different North Woods and still depended on opaque codes.
  R08 remains pending: exact IDs alone do not make useful landmarks.
- A3 found the scale/IDs overwhelming and the help close button said "Choose
  my first relay" at move 155. Fix under R11/R12.
- A3 found nonmatching legal relays looked disabled: added R16.
- A1 saw Sun progress while pursuing Ember's other emblems: added R17.
- Both fresh-game testers would continue only briefly to see a capture; the
  resumed-game tester would stop. Do not claim this batch solved motivation.

Evidence: research/blind-a1-after-ten-turns.png,
research/blind-a2-turn10.jpg, research/blind_a3_turn8.jpg.


## Batch B — routing, examples, pins and recovery

Three new page-only testers used isolated ports 8111–8113. They played 12, 9
and 8 own turns. Two initially encountered a recorded game but independently
used the new-game/confirmation controls to start fresh. No coaching or proxy
clicks were supplied. The frontend was frozen during their sessions.

Verification before blind testing: 78 full-suite checks passed (14.366s).
Browser checks confirmed a two-move hypothetical line survived close/reopen
with zero live moves, pinning marked matching destinations, a second-tab move
invalidated an old candidate without spending a move, and the recording showed
actual Red and Blue captures and their parent entries. At 360px, document and
scroll widths were both 345px; example dialog widths were both 298px.

Accepted and removed from Pending:

- R04: B2 saw the route explanation at the first preview and understood its
  address shift; B3 understood the shift but found the immediate destination
  easier to retain. B1 recognized same-location routing on turn one. Longer
  purposeful route construction is still a learning gap, tracked under R18.
- R05: B1 cited persistent claims and prior feedback as helpful. B3 cited
  persistent previous-move summaries and could recognize its earlier Aster
  when a return let it advance Sun to 2/3. Both players' summaries now show
  actual advanced/blocked emblems, not invented opponent intentions.
- R11: B1 and B3 explicitly said the recorded example clarified child capture
  becoming parent ownership; B3 understood World as the eventual goal. Parent
  detail remains optional until a result makes it relevant. World-scale
  motivation remains limited, not falsely declared solved.
- R12: B2 and B3 independently used the continued-game/new-game controls and
  confirmed replacement to begin fresh. Help now returns to the game instead
  of saying "Choose my first relay" in a continued match. Browser learning
  progress is separate from move count.
- R15: All three found the legal recorded capture example helpful for emblem
  completion, blocks and parent propagation. Its genuine checkpoints do not
  touch live save, candidate or analysis state. B2 identified a separate gap:
  it begins after earlier play and does not teach the blank opening. Added R18.

Remaining: B1 was only mildly interested after 12 turns; B2's interest was
low-to-moderate. B3's first meaningful objective arose when its eighth turn
built Sun to 2/3. Do not present these reports as proof of human retention.

Evidence: research/blind-b1-turn12.jpg, research/blind-b2-turn9.jpg,
research/blind-b3-turn8.jpg. The last tester's actual 16-move recording is
preserved as tests/fixtures/relay-opening.json for the next teaching replay.


## Batch C under test — opening replay and memorable places

R18 arose from B2's concrete feedback that a developed capture example did not
bridge an empty opening to a return. The new optional opening replay begins at
zero moves and follows an actual tester's legal 16-move recording to its first
return/second Blue claim. Checkpoints explain observed choices and explicitly
say live opponent replies can differ. Capture lessons remain separately
available. No live or recorded game is prefilled by presentation code.

Visited outposts now receive game-local landmark numbers on their first real
claim. Replay reconstructs them, undo removes an unplayed landmark, previews
never create them, and exact references remain available. Example identity
caches are separate from live identity caches so a replay's numbers cannot
leak into a live match. Original place_identity and rule/AI algorithms remain
unchanged. The new opening and landmark checks passed with all 21 Relay tests.


## Interrupted and resumed review

The first Batch C test group was interrupted by an account usage limit after
initial observations. Its partial feedback was not counted as an eight-turn
playtest or used to clear pending items. After the user requested Resume,
three fresh agents were given private pages on ports 8131–8133. Two continued
a legal recorded position and one began with an empty original L10 match.
They received neutral tasks to play, compare candidates, remember a place,
leave/reopen a plan, and recover from a regretted move; no feature locations,
expected outcomes, rules, prior feedback, or retention objectives were supplied.

The main server was reloaded with the current adapter. Its saved game SHA256
remained 2ACC210E87A1D9F7ACE48C1A0CC7C1497C776C75C4BD48F022C9BB88A556146C
before and after reload. Blind test sessions are separate from that save.


## Resumed Batch C results

Fresh agents Resume1/Resume2 continued independent 150-move checkpoints for
8 retained own turns each (one additional move undone/replaced each). Resume3
played 12 retained own turns from empty, with one additional undone/replaced
move. These were direct browser sessions with neutral usability tasks rather
than an entirely unprompted discovery test. No game explanation was provided.
The full current suite passed 80 tests in 21.677 seconds.

Accepted and removed from Pending:

- R02: all three kept pinned earlier locations visible and revisited surviving
  claims. Resume1 explicitly found Beacon still Blue at Iron Ridge; Resume2
  found Aster there; Resume3 found Granite Vale's Blue/Red claims still present.
- R03: Resume2 used Unvisited and identifiers to distinguish two High Spires.
  Resume3 used Previously played and destination claim counts to avoid sending
  Red toward a Blue claim. Resume1 used Unvisited and exact destination names.
- R07: all three pinned/revisited a target. Resume1/Resume3 explicitly confirmed
  Inspect only and Return to your move prevented confusing inspection with a
  legal move. Matching hypothetical destinations were independently verified
  in the developer browser, including released-area wording.
- R10: Resume1 and Resume2 avoided Ember because its verified warning showed a
  Red capture at Clear Gate. The warning includes the actual destination,
  members and capturing reply; original-engine tests verify its evidence.
- R13: all three closed and reopened a two-step plan with both moves preserved.
  Resume3 additionally kept the same plan and endpoint through the worked
  examples, with the live game still at Move 25.
- R14: all three used the explicit Undo my move and computer reply control,
  verified two plies removed and replaced their decision. Separately, the
  developer browser verified stale-tab refresh discards an old candidate,
  leaves the committed count unchanged and requires a fresh preview.
- R17: Resume2 used owned relays/emblem counts distinctly from remembered
  targets; Resume3 recognized local returns and used actual destination claim
  counts. Resume1 distinguished activity totals from captured-location totals.
  New assignments clear the old emblem filter; empty locations no longer
  misleadingly default to an unrelated Sun progress row.

Remaining feedback: Resume3 actually used Location 9/11 to recognize returns,
but Resume2 still found repeated names uncertain. Strengthen R08's landmarks.
All three found the nine-entry route queue difficult to use; added R19 rather
than claiming a clear immediate destination teaches long-range strategy.
Resume3 found the empty-opening replay clarified route formation and Sun 1→2,
but only one tester completed that aid: R18 stays pending.

Follow-up attempts on Resume1/Resume2 lost their browser connections after their
original turns ended; no extra actions were performed and no extra evidence is
claimed. Resume3 reviewed the aids before ending its active browser turn.

Evidence: research/blind-resume1-eight-turns.jpg,
research/blind-resume2.jpg, research/blind-resume3.jpg.


## Batch D changes awaiting blind review

Simplified preview routing to a compact earlier-route → chosen-relay diagram;
the full nine-entry trace remains optional. Contextual guidance now appears
beside the preview and can be hidden/re-enabled, while verified capture
warnings remain available. Location badges (L1, L2, etc.) are prominent and
full references remain in location details. Nonmatching legal choices retain
full-opacity labels and selectable states; matching groups use borders.

Developer inspection found a related regression: the direct capture-reply
button could reopen an unrelated saved hypothetical line instead of replacing
it. Reopened R10 for this case. It now asks the existing plan API to validate
exactly the candidate plus its verified capturing reply and displays that
actual hypothetical result. Normal close/reopen still preserves a plan.

Developer browser verification on an isolated 150-move recording first built
an unrelated two-move hypothetical line, then requested the capturing reply.
The line changed to Blue Ember / Red Ember; the original plan API reported Red
capturing Clear Gate and claiming its entry in Iron Creek. The live game stayed
at 150 moves. A 360px preview measured 345px document and scroll widths; the full
route trace stayed closed by default. JavaScript syntax and whitespace checks
passed. No rule or AI source was changed.

Fresh D1/D2/D3 were dispatched to separate ports 8141/8142/8143 with only URLs
and neutral browser-play tasks. D1/D2 start at the same genuine 150-move
checkpoint; D3 starts empty. Learning-aid exploration is an assigned usability
task, not unprompted discovery. The interface is frozen during their sessions.

## Batch D results

D1 played nine own turns, D2 eight, D3 twelve. All chose fresh games themselves.
D1 completed all seven opening and five capture checkpoints. D2 reviewed the
opening and three capture steps; D3 reviewed the opening and all five capture
steps. All directly operated their independent browser sessions.

Accepted and removed:

- R18: D1 explained persistent claims, blocking, returning later and parent
  ownership after the aids, then recognized an actual Green Ford return and
  compared Beacon/Cinder for Sun 2/3. D2 explained persistence and the parent
  rule after the examples; D3 described the change from collecting symbols to
  building local claims while steering where the opponent acts. This adds to
  Resume3's earlier concrete opening-aid evidence. These were assigned aid
  explorations, not evidence of unprompted discovery.
- R19: D1 and D2 compared Aster's same-location destination against Ember's
  different destination and committed without decoding a nine-entry route.
  D3 likewise made that comparison before its first commitment. All continued
  playing using the immediate destination; exact-trace exploration was
  optional. None claimed mental mastery of the long-range route. Acceptance
  is for reducing required explanation, not proving routing mastery.

R08 remains pending: both D1 and D2 initially mistook L15/L10 for a hierarchy
level. Change the visible badge to **Location 15/10**. Repeated place names still
need their stable references. D3 found the explorer's repeated A/E buttons hard
to recognize; added R20 for readable names and layer labels. D2 expected child
selection to immediately open the field; clarify Explore inside versus Open.

The remaining R06/R16/R10 follow-up need direct control-use evidence. This
round's general rules understanding is not sufficient evidence for them.

All found the empty opening weak strategically. D1 nearly stopped before its
first live return at turn nine; D2 would continue briefly; D3 would not yet
sustain a full ten-level match. The aids show the payoff sooner than normal
play. This is an unresolved pacing limitation of the required original game,
not a claim that the UI changes have established human retention.

Evidence: research/blind-d1.jpg, research/blind-d2.jpg, research/blind-d3.jpg.

## Batch E changes awaiting review

Location badges spell out Location; the explorer uses shared adapter ancestry
with layer labels and names instead of letters. The current ancestor has a
gold border, child choices say Explore inside, and the action says Open plus
the actual selected location name. No backend or rules changes were needed.

## Batch E results and interruption

E3 completed eight own turns from the 150-move recording, ending at 166 moves.
E1 reported eight own turns, guidance off/on, comparing Delta outside a Sun
highlight, safe inspection/return and a three-move hypothetical capture. E2
reported guidance off/on, Ember outside Sun, and replacing an unrelated
three-move hypothetical line with the verified two-move Ember capturing reply.
E1/E2 then hit the account usage limit before complete final reports. Their
specific observed actions are retained, but these are not counted as completed
sessions or as full acceptance for the remaining work.

E3 avoided Ember because the warning showed Red could capture Clear Gate and
chose Aster's unvisited North Cairn instead. It safely inspected Blue Delta and
Ember at High Spire and returned without a move. Guidance restoration worked,
but finding it in Game was extra work. "Show all" misleadingly suggested that
unmatched choices had disappeared. Names, numbers and opaque references felt
like too many identities. The long-term route and sparse live returns remained
hard to use strategically. E3 would continue briefly, with weakening interest.

Evidence: research/blind-e1.jpg and research/blind-e3.jpg (E2's final screenshot
was not confirmed). No extra browser actions are inferred after the failures.

## Batch F changes awaiting review

Changed **Show all** to **Clear highlight**, matching the actual action. Hidden
contextual guidance now has a **Show guidance** button in the same preview,
using the same shared visibility function as Game and the dismiss controls.
Ordinary unvisited destination labels use their names; exact references appear
when a known name collision needs disambiguation and remain in location/route
details. Numbered visited locations keep **Location N**. Existing name and
reference generation, routing and all domain logic are unchanged.

Fresh testers will repeat the outstanding controls directly. The pending list
is deliberately unchanged until those sessions provide sufficient evidence.

Developer inspection additionally removed the leaf explorer's redundant nine
disabled relay buttons; Open now takes the player to those relays in the field.
The 360px explorer measured 345px document/scroll width and 501px dialog height.
The temporary viewport was reset before testing. Evidence:
research/relay-phone-named-explorer.jpg. Guidance hide/show kept the candidate
and capture warning intact at 150 moves. Syntax and whitespace checks passed.

F1/F2/F3 are fresh, page-only sessions on ports 8161/8162/8163. Each continues
an independent 150-move legal recording and is assigned neutral control tasks
without rules, prior findings or desired answers. F1/F2 are asked to try
hypothetical tools before the first live move so that the initial controls
are available. This is usability-task evidence, not entirely unprompted play.

During the frozen F round, developer recovery inspection found a remaining
R08 defect: after a first visit and undo, the backend correctly removed the
new location numbers, but the browser's merged identity cache retained them
in route labels. At 150→152→150, Iron Ridge's heading returned to NEW while a
preview still said Location 136 (and unvisited North Cairn said Location 137).
The interface stays frozen for F; repair this cache issue before accepting
R08. This finding is not a game-rule or undo-state failure.

## Batch F results

All three completed eight own turns, from 150 to 166 moves, with direct page
use. F1/F2 deliberately accepted Red's Clear Gate capture, then captured Iron
Hill with Cinder. F3 avoided that route using the warning. No source, file,
network or API inspection was used by the testers.

Accepted and removed:

- R06: all three hid/restored guidance; F3 used the local preview restore
  button. F1/F2 used Game. F3 compared Forge against Ember's capture risk and
  avoided it. F1/F2 understood and deliberately accepted that immediate risk
  for the shown countercapture. The guidance is optional and derived from
  original preview facts. F1 found the hypothetical tool more useful than
  repeating guidance; this is not a claim that the banner teaches strategy.
- R16: all three highlighted Sun and selected an unmatched legal relay (F1:
  Ember, F2: Forge, F3: Forge/Ember). F2/F3 explicitly found the explanation
  clear; F1 confirmed the choices remained legal. Clear highlight describes
  the actual control, and unmatched choices retain normal selectable labels.
- R10 follow-up: F1 built a three-move line, closed it, and used the shortcut
  to open directly after Red's capture. F2 built the different Aster → Red
  Ember → Blue Forge line, then got the verified Ember → Red Ember pair from
  the shortcut. Both understood the hypothetical capture; actual live play
  still required separate commits. This supplements the earlier developer
  verification and E2's interrupted-session observation.
- R20: F1 opened Frost Beacon in the explorer and returned; F2 navigated Stone
  Landing → Frost Beacon, opened it and returned; F3 used High Haven → Iron
  Gate → Elm Spire and returned. All distinguished inspection from legal play.
  The full ten-level navigation stays optional. The remaining misleading
  ancestor identity fallback is tracked under R08 rather than ignored.

R08 stays pending. F2/F3 correctly distinguished repeated names with references
and Location N, but did not form a mental map from codes. F3 found Province
Ember blurred places versus relays: ancestor identities were not supplied to
the renderer, so uncached ancestors used a relay-name fallback. Supply those
identities with the existing shared identify function. Also repair the undo
cache defect documented above.

All would continue briefly, but six to eight empty later assignments weakened
interest. F1/F2 demonstrated a meaningful capture exchange; the controls do not
yet establish sustained human retention or a mentally predictable long route.
Evidence: research/blind-f1.jpg, research/blind-f2.jpg, research/blind-f3.jpg.

## Batch G changes awaiting review

Ancestor entries now carry their place identity from the existing shared
identify function, so all explorer depths use actual geographical names,
including previously uncached ancestors. This adds bounded presentation data;
the original engine and state transitions are unchanged.

Undo, new/import and stale-tab recovery share a live-place-cache replacement
function. After undo, identities are relearned from the actual restored view,
discarding numbers assigned only by the removed moves. Developer browser
repeated 150→152→150: Iron Ridge returned to NEW, its preview said Iron Ridge,
and the destination said North Cairn without removed Location 136/137 numbers.
An ancestor preview showed Province Deep Dale / Region Ash Bay, matching their
actual fields rather than relay-name fallbacks. Phone dimensions remained
345px document/scroll width and 501px explorer height at a 360px viewport.

Full checks passed **80 tests in 17.133 seconds** after the adapter change.
JavaScript syntax and whitespace checks passed. Original rules/AI/interface
source still has no tracked diff. The live save hash remains unchanged.

Two-tab developer recovery check: a second tab played and undid Aster; the
first tab's old commit was rejected as stale, refreshed at the same 150 moves,
cleared its candidate and kept Iron Ridge NEW without phantom numbers. No old
candidate was automatically replayed. This used only the isolated QA game.

Fresh G1/G2/G3 are playing separate recorded positions on ports 8171/8172/8173,
with eight own turns and neutral undo/inspection/revisit tasks. The interface
is frozen for this review. The tasks do not disclose the label defects or
desired outcomes. Their evidence is still pending.

## Batch G results — identity item not accepted

All three completed eight retained own turns plus one undone trial (150→166).
G1 reopened Pine Landing/Clear Ridge and revisited Bracken Bay's persistent
Ember. G2 reopened Pine Landing/Clear Crossing and remembered High Spire. G3
opened Bright Point and Silver Creek, revisited High Spire and returned. Undo
restored the 150-move decision; all compared replacements and retained exact
preview/commit separation. No game-state or navigation failure was reported.

All three still found dual identity systems confusing. G1 could not confidently
recognize repeated Bracken Bay/Birch Meadow names; G2 described Location 149
versus #9N8XLG as competing systems; G3 saw Clear Bluff change from a reference
to a numbered location after play. Codes distinguished places but were hard
to remember. This fails R08's practical consistency goal despite the cache
and ancestry fixes. Keep it pending; do not count successful navigation alone
as acceptance of identity design.

All would continue briefly; dispersed empty locations still weakened strategic
motivation. G1/G2/G3 screenshots: research/blind-g1.jpg, research/blind-g2.jpg,
research/blind-g3.jpg.

## Batch H under development

Replace routine visit-order numbers with stable visual location markers derived
only from existing references. Markers accompany place names throughout the
field, destinations, remembered cards, explorer and hypothetical lines. They
do not encode ownership, objectives or permissions. NEW/Visited describe state
separately. References stay stable and accessible in details, and disambiguate
known repeated names. Backend visit numbering and all game logic stay unchanged.

The marker renderer uses a framed color/pattern pair from the existing exact
reference. Names, markers and full references do not depend on visit order.
Markers are recognition aids, not globally unique IDs; exact references remain
in details and known repeated-name labels. Accessible names describe their
color and pattern; tooltips expose the reference. No ownership or emblem
meaning is attached to a marker. The same helper renders all live/replay views.

Developer narrow-screen inspection showed the named, patterned explorer fits:
345px document/scroll width and 523px dialog height at 360px. The viewport was
reset before H1/H2/H3 began. The phone screenshot is
research/relay-phone-named-explorer.jpg. Syntax/whitespace checks passed; the
last backend suite remains 80 passing tests (17.133 seconds); this batch changes
presentation only. H1/H2/H3 are fresh, separate page-only 150-move continuations
on 8181/8182/8183 with neutral play/undo/navigation/revisit tasks. UI is frozen.

## Batch H results and final identity corrections

H1/H2/H3 each completed eight retained own turns plus one undone trial (150→166).
All used multiple hierarchy depths, safe return and prior-location inspection.
H1/H2/H3 distinguished places from relays using names, framed markers, hierarchy
context and status. H2 explicitly found names/markers useful when visible
together; H3 identified rectangular markers as place/destination cues.

Do not accept R08 yet. H1 found the current heading lacked a reference that
appeared for the same name in a route. H2 found NEW misleading at higher levels
with moves inside. H1/H3 observed frequent repeated markers on successive
places after repeated Ember choices. Markers alone were insufficient; names and
exact references still matter. H1 expected remembered cards to be recent
history, although they prioritize pins and developing sets. All continued to
find dispersed empty assignments weak strategically.

Batch I addresses these concrete cases: shared place_identity supplies marker
metadata using the unused bits of its existing name digest, rather than address
suffixes. Exact references remain unchanged. The current heading always shows
its exact reference; destination previews include their hierarchy layer.
NEW/Visited uses actual original-engine activity totals at every depth.
The strip is labelled Locations to watch, with its pin/developing-group purpose,
rather than suggesting a recent-location list. The stable reference, marker
and actual activity are distinct facts; none depends on owning a location.

H evidence: research/blind-h1.jpg, research/blind-h2.jpg, research/blind-h3.jpg.

## Batch I verification and interrupted review

All **80 tests passed in 14.376 seconds** after the shared identity metadata
change. JavaScript syntax and whitespace checks passed. Original rules, AI
and original-interface source still have no tracked diff. The live 40-move
save hash remains unchanged.

Developer browser verified Pine Wood's continent view has Visited/Previously
played and shows its two actual Red moves, while empty Iron Ridge has NEW/No
moves yet. The exact reference appears in both location headings. Higher-level
children explicitly say Open to inspect / Within assignment or Inspection only,
separating navigation from a leaf claim. At 360px, the full-reference candidate
preview measured 345px document/scroll width. Evidence:
research/relay-phone-identity-preview.jpg. Viewport reset before testing.

I1/I2/I3 hit the account usage limit before returning play evidence. No turns
or positive feedback are inferred. The user resumed; fresh J1/J2/J3 now use
separate 150-move replays on ports 8201/8202/8203 with the same neutral eight-turn,
undo, inspection and revisit tasks. The interface remains frozen; R08 stays open.

## Resumed final identity review — J1/J2/J3

All three completed eight retained own turns plus one undone trial (150→166).
J1 inspected World/Silver Creek/Pine Shore and revisited Golden Cove. J2 opened
Moss Creek/Deep Dale and revisited Dawn Glen. J3 opened Bright Point/Clear Ridge,
reopened Bright Point, then returned to its assignment. All preserved the move
count during inspection and correctly replaced their undone early move.

Accepted R08 and removed it: J1 distinguished two Golden Coves (#9LZNBB and
#9XDOHD) using their different markers and exact references; its prior Ember
remained on revisit. J2 explicitly separated repeatable relay names from place
names, markers, references and NEW/Visited status. J3 used breadcrumb levels
and reference codes to distinguish repeated East Point contexts. All described
markers as aids alongside names/references, without assuming global uniqueness.
No inconsistent identity or undo-label failure was reported. Original-engine
tests and the developer higher-level activity check cover the repaired cases.

J1 still found linked set versus emblem group sounded like two objective terms.
J1/J3 reported long scrolling; J3's commit left the next location's context off
screen. Added R21/R22 for these actionable presentation fixes. The distinction
between moves inside a parent and child ownership required attention but was
resolved by the existing explanation; no rules or state discrepancy occurred.

All would continue briefly, but fresh empty destinations and long-range route
planning still limited motivation. These remain documented constraints and
human-validation questions; no retention-rate or full-campaign enjoyment claim
is made. Evidence: research/blind-j1.jpg, research/blind-j2.jpg,
research/blind-j3.jpg.

## Batch K — turn orientation and objective wording

A shared presentation helper restores the turn header after commit, undo and
location changes on all screen sizes. Candidate previews still go to the
decision panel on narrow screens. Developer desktop verification committed
Aster from the 150-move recording and waited for the computer reply: the new
turn header was at y=100 and Golden Cove's location heading at y=476 in a
720px viewport. Undo returned to Move 151 with those headings visible at the
same positions. Evidence: research/relay-turn-context.jpg. The live save was
not used. This helper changes scrolling only.

All visible Relay objective copy and current README instructions now use
emblem group, without the linked-set synonym. Adapter methods, memberships,
objective IDs and original rules are unchanged. JavaScript syntax and
whitespace checks passed; the last relevant full suite is 80 passing tests
(14.376 seconds), with no backend changes since then.

Fresh K1/K2 continue separate legal 150-move recordings on 8211/8212; fresh K3
starts from the original empty game on 8213. They receive only neutral play
tasks, no rules or desired answers. The interface is frozen until their review.

## Batch K results

K1/K2 each completed eight retained own turns plus an undone trial (150→166).
K3 completed ten own turns from the original empty game (0→20). All directly
used their pages, with no proxy input or code/API inspection.

Accepted R21: K1 explicitly followed Blue/Red turn labels and the source-to-
destination strip; K2 described the changing location title and turn labels as
making each sequence clear; K3 followed the opponent arrow, named locations
and turn header through its opening. No report repeated the missing-next-
location problem. Developer desktop measurements verify the actual restored
viewport after commit and undo. Inspection/return also remained clear.

Do not accept R22 yet: K3 found remaining sets / best open emblems wording in
the World and watch panels. Static inspection confirmed those missed strings,
despite the prior linked-set search passing. Replaced them with emblem group
wording, including blocked-group reports, loading fallback text, and closest
open emblem groups. The help/objective explanation was understood by all three.

K3 also found Visited at first World inspection misleading. Removed the
redundant NEW/Visited heading badge; the layer label already accurately states
Previously played or No moves yet from actual descendant activity. The stable
marker/name/reference remains unchanged. The watch strip's accessible label
now matches Locations to watch. This is a wording/status presentation cleanup,
with no domain or AI changes.

All still found empty destinations and long-range routing difficult to turn
into a sustained plan. K1/K3 noted substantial vertical scrolling. These are
documented human-validation and pacing limitations; the observed clearer local
controls do not establish long-term retention. Evidence: research/blind-k1.jpg,
research/blind-k2.jpg, research/blind-k3.jpg.

## Batch L — completed vocabulary cleanup under review

World, watch-card captions, blocked-move reports, tooltips, example effects,
preview captions and loading fallback now consistently use emblem group.
Parent progress explicitly says No child locations won here yet, while leaf
progress says No claims in this location yet. Destination activity uses No
moves yet / Previously played; the separate first-inspection Visited badge is
gone. The watch section's accessible label matches its visible heading.

Developer browser inspection confirmed the World panel wording and direct-child
progress distinction at 150 moves. A 360px World view measured 345px document
and scroll widths; evidence: research/relay-phone-world-progress.jpg. The
viewport was reset before L. Syntax/whitespace checks passed. No domain or AI
code changed; the relevant full suite remains 80 passing tests (14.376 seconds).

Fresh L1/L2 continue separate 150-move games on 8221/8222; L3 starts empty on
8223. All receive neutral eight-own-turn tasks with instructions/World/location
inspection, no rules, vocabulary targets or desired findings. UI is frozen.

## Batch L results and final acceptance

L1/L2 each completed eight retained own turns from separate 150-move games
(150→166); L1 also undid and replayed its last turn. L3 completed eight own
turns from the original empty game (0→16). All used only their page, read the
instructions, inspected World and another location, and returned to play.

Accepted R22: all three independently explained that owning all three relays
sharing an emblem wins a location, which claims a child in its parent and
continues toward World. L1 distinguished World move counts (78 per side) from
locations won (Blue 0 / Red 1), then identified High Spire's Moon group as two
of three with Forge remaining. L2 likewise inspected and pinned High Spire's
near-complete group. L3 distinguished World activity (eight moves per side)
from zero locations won. No tester reported competing set/group terminology.
Static inspection confirms current visible objective copy uses emblem group.

L1/L2 avoided Ember's capturing-reply warning at Iron Ridge by choosing Aster;
both also used the Golden Cove preview explaining a blocked Red Mountain group.
L3 used a group highlight, the opening replay and a hypothetical Red reply.
All followed preview versus commitment and the opponent/own-turn transitions.
Evidence: research/blind-l1.jpg, research/blind-l2.jpg, research/blind-l3.jpg.

Two small wording corrections followed their reports: the World article is
now "an emblem group", and the leaf subtitle directly repeats the already
present instruction "Claim all three relays sharing an emblem" instead of
"Match any one emblem". These are copy corrections to the understood objective,
not another interface or mechanic change. The corrected strings were inspected
in the final browser build; the final literal text was not separately blind-
tested. No domain, routing, move-count or AI behavior changed.

### Remaining limits, not evidence of successful human retention

All three would continue briefly to seek a capture or return, but could not yet
plan a useful long-range return. L3's empty-game session produced isolated
claims without a capture; L1/L2 also found many untouched destinations and
repeatedly used emblem count as a heuristic. Pins preserve intent, but do not
solve routing strategy. The nine-entry route is mechanically explained yet
still difficult to use for a sustained plan. Repeated names require exact
references; marker pairs are recognition aids, not unique identities.

Vertical scrolling remains substantial at the testers' unchanged viewport.
Parent activity versus direct ownership requires attention despite the explicit
labels. L1 briefly noticed the historical last-move "Blue next" alongside the
computer-busy heading; controls and actual turn status remained correct. L2
needed the Game explanation to distinguish the supplied existing save from
further unsaved session changes. These observations are preserved rather than
presented as resolved retention outcomes. No human retention rate, predictable
human completion time, or full-campaign enjoyment has been established.

The completed list concerns the tested presentation improvements, not a claim
that the original L10 game's pacing is solved. The immutable empty start,
one-move turns, original routing and original AI remain in force.

Final handoff: reloaded the main 8093 browser build, verified the corrected
World and leaf copy, and selected Aster for preview only. No move was committed.
The live game remains at 40 moves; relay-save.json SHA256 remains
2ACC210E87A1D9F7ACE48C1A0CC7C1497C776C75C4BD48F022C9BB88A556146C.
JavaScript syntax and whitespace checks pass. Original tracked game/AI modules
have no diff. The last relevant full test run passed 80 tests in 14.376 seconds;
only presentation/copy changed afterward. Final screenshot:
research/relay-retention-ready.jpg. Temporary test servers were stopped; the
main playable server remains running. No publication or version bump performed.
