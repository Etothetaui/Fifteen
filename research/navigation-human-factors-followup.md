# Fifteen navigation: human factors follow-up

Research date: 2026-10-12. This note evaluates possible navigation experiments; it authorizes no implementation, game-rule changes, AI changes, or publication.

## Architecture and question

The supplied current architecture has a permanently visible, nonplayable overview on the left, movable crop outlines, and a fixed playable magnified crop on the right. With two magnifiers, the middle view is another nonplayable navigation stage. With zero magnifiers, the whole board is playable. Levels 1–6 form a recursive board. Spatial containment and the route determining access are different relations; the last opponent move and candidate-move destinations can be strategically relevant far outside the current crop.

The question is therefore not simply whether zooming makes small cells easier to select. It is whether a player can preserve a useful spatial reference, compare distant game states, interpret nonlocal access, and commit an intended move without repeated navigation or stale information. All game-derived signals must continue to come from the authoritative domain implementation; the studies below suggest presentation hypotheses only.

Implementation facts supplied by the concurrent code inspection sharpen the experiments: the fixed crop fraction is .272 with one magnifier and .073984 with two. At a 600 px panel, level-6 cells are approximately 3.03 px or 11.12 px respectively. Existing navigation uses a 35 ms exponential drag smoother, instantaneous move-to, and fixed 4 px arrow taps. At level 6 and a 627 px panel, these taps represent approximately 4.65 leaf cells at the first magnifier and 1.265 at the second. These are code facts and coordinate calculations, not measured browser timings or study findings. The current lens-mode legal-region command centers the fixed crop rather than fitting a broad legal region. Prototype history, pins, and region-frame helpers already exist; any future experiment should first inspect and reuse those implementations. Cell sizes and tap distances must therefore be explicit conditions in touch and navigation testing.

## Six fully inspected primary studies

### 1. An overview can help orientation and preference while adding work

Hornbæk, Bederson, and Plaisant (2002), *Navigation Patterns and Usability of Zoomable User Interfaces with and without an Overview*: 32 participants performed navigation and browsing tasks on two maps. Correctness did not differ. Eighty percent preferred an overview, but the interface without one was faster on one map and supported better location recall there. More switching between windows was associated with longer task times; this association does not itself establish causation. Map content and level organization were confounded, so the difference cannot be attributed confidently to semantic hierarchy alone. See abstract and discussion, particularly §5.2–5.3. [Author-hosted full paper](https://www.cs.umd.edu/~bederson/images/pubs_pdfs/p362-hornbaek.pdf).

**Application:** retaining Fifteen's stable overview is defensible, but adding a third view should not be assumed to reduce effort. Matching outlines and transient cross-view highlights should make correspondence easier; measure whether players actually need the middle view for each task. Preference and speed should be reported separately. This was geographic browsing, not adversarial recursive-board reasoning.

### 2. Animation supported spatial reconstruction, not every type of understanding

Bederson and Boltman (1998 technical report / InfoVis 1999), *Does Animation Help Users Build Mental Maps of Spatial Information?*: 20 participants navigated nine-node family trees via hyperlinks. Transitions took one second at 20 frames per second; the entire tree was never visible. Animation improved later spatial reconstruction, but did not significantly improve navigation or recall tasks. Reconstruction also had an ordering effect; the two trees shared structure. The result supports continuity of spatial placement under these conditions, not a general claim that animation improves reasoning. See methods and analysis, pp. 3–6. [University full paper](https://www.cs.umd.edu/projects/hcil/jazz/learn/papers/CS-TR-3964.pdf).

**Application:** test brief, interruptible transitions between requested crops, with visible source and destination outlines. The exact duration needs local testing. The paper does not establish the cost of involuntary recentering, a best duration for Fifteen, or benefits for nonlocal routing comprehension. Automatically following every move remains an unproven hypothesis.

### 3. Limited visual memory is evidence for external state, not a four-pin limit

Luck and Vogel (1997), *The Capacity of Visual Working Memory for Features and Conjunctions*: participants compared briefly shown arrays after a retention interval, sometimes with a concurrent verbal load. For the simple features tested, performance suggested capacity around four objects; multiple features could be retained as integrated objects. These were laboratory change-detection stimuli, not familiar game boards, strategic chunks, or long-term expertise. See pp. 279–281 and methods. [Author-lab full paper](https://awhvogellab.com/files/pdfs/luck_1997_capacity-features-conjuctions.pdf), [publisher record](https://www.nature.com/articles/36846).

**Application:** avoid requiring a player to memorize distant cell occupancy and route state while changing crops. An external live reference may help. Do not derive a fixed number of pins from the approximately four-object result: a board region contains many features and experts may organize it differently. Group related location, occupancy, and access information rather than scattering unlabeled indicators across panels.

### 4. External reminders helped a harder interrupted task, with a ceiling caveat

Gilbert (2015), *Strategic Use of Reminders: Influence of Both Domain-General and Task-Specific Metacognitive Confidence, Independent of Objective Memory Ability*: experiments 1a and 1b each recruited 200 browser participants. They moved numbered circles sequentially and remembered exceptional destinations. Reminders were made by positioning target circles near the intended edge. In the three-target condition with an arithmetic interruption, mean target accuracy rose from .83 to .90 when offloading became available; the one-target condition remained .93 in both phases. The phase comparison was sequential, not a fully counterbalanced estimate of the reminder effect. See §2 and Table 1. [Author full paper](https://samgilbert.net/pubs/Gilbert2015ConsciousnessCognition.pdf).

**Application:** optional live reference locations are most plausible when a player compares several destinations or resumes after an interruption. This is prospective memory, not direct proof that pinned board views improve strategy. Players' confidence can differ from measured ability; low pin usage does not prove the interface needs none.

### 5. Offscreen location cues were useful in a constrained spatial task

Baudisch and Rosenholtz (2003), *Halo: A Technique for Visualizing Off-Screen Locations*: 12 users, including one author, compared arcs with arrows carrying numeric distances on an emulated PDA using a mouse. Four map tasks were 16–33% faster with Halo. Panning and zooming were disabled; clustered locations did not occur. Error differences were not significant for three of four tasks. The paper also identifies corner cropping and overlapping arcs as practical difficulties. See apparatus, procedure, results, and scaling discussion. [Author full paper](https://www.patrickbaudisch.com/publications/2003-Baudisch-CHI03-Halo.pdf).

**Application:** a cue for an offscreen last move or inspected destination can avoid unnecessary searching. Start by testing a small number of named cues, not every legal location. The speed gains do not predict gains for Fifteen. Geographic proximity has no necessary strategic meaning here; cues must convey location and identity without suggesting that nearby regions are more accessible or valuable.

### 6. Touch targeting has occlusion and commitment problems as well as size problems

Vogel and Baudisch (2007), *Shift: A Technique for Operating Pen-Based Interfaces Using Touch*: 12 volunteers selected targets on an iPAQ with a dominant index finger while holding the device in the other hand. Target widths ranged from 2.6 to 41.9 mm. An offset callout and explicit selection point reduced errors for small targets compared with direct touch; fine correction added time. Targets were not placed at screen edges. Residual errors included finger rolling at lift-off. See task, methods, and results, pp. 662–664. [Author full paper](https://www.patrickbaudisch.com/publications/2007-Vogel-CHI07-Shift.pdf).

**Application:** distinguish navigation drags from move commitment, and test a visible precommit destination away from the contact point. Magnification alone may leave the selected cell hidden. Neither this old resistive-device study nor its pixel thresholds establishes modern phone sizes or an optimal gesture. Test actual phones, edges, one-handed use, cancellation, and release jitter before choosing an interaction.

## Fisheye evidence: a narrower supplementary finding

Gutwin (2002), *Improving Focus Targeting in Interactive Fisheye Views*, describes targets moving as the focus approaches and a technique that reduces distortion based on pointer movement. The actual paper's indexed opening was available, but its full-text fetch and publisher fetch failed during this research; no unverified participant count or numerical result is used here. [Actual-paper indexed PDF](https://citeseerx.ist.psu.edu/document?doi=5c066922d880ac88172d1277801467da6eefd975&repid=rep1&type=pdf), [original DOI](https://doi.org/10.1145/503376.503424).

**Design inference:** Fifteen's fixed rectangular detail view preserves an undistorted grid and avoids cursor-coupled target motion. A fisheye alternative could reduce view separation, but it would create a fresh geometry and targeting problem. There is no evidence here that replacing the current crop architecture would outperform improving its correspondence cues. Comparing lenses requires distinguishing a separate magnified crop from nonlinear distortion; they are not interchangeable interventions.

## Three concrete experiments

### A. Preserve the player's inspected crop through turn changes

Compare the current behavior against a condition that retains the player's crop after an opponent move, marks that move in the overview, and offers an explicit jump plus return to the former crop. If recentering is currently absent, compare cue-only with cue-plus-explicit-jump rather than introducing involuntary movement as a baseline. Keep the stable overview and use a brief transition only for requested jumps. This is an inference informed by studies 1, 2, and 5; no cited study directly tests automatic turn following.

Measure time to identify the last move, time to resume inspection, wrong-region answers, repeated navigation, and subjective orientation. Separate short local moves from large cross-board jumps, interrupted from continuous play, and levels 1–3 from 4–6. Faster identification alone is insufficient if return-to-analysis cost rises.

**Edge cases:** a move ends the game; the inspected region becomes closed; the last move is already visible; the player changes a crop during animation; a resize changes crop extent; reduced-motion preference is active. Navigation must not imply that an inspected region is legally playable.

### B. Compare one optional live reference with ordinary navigation

Allow the player to retain a chosen remote region for comparison while inspecting another; the retained view must update from current state rather than freeze a screenshot. A reference is read-only and must not become another move surface. This is a design hypothesis from studies 3 and 4, not an established strategy aid.

Use paired tasks requiring comparison of the current region, one distant candidate destination, and an opponent's last move. Measure return trips, factual board-state errors, route-destination identification, elapsed time, and clutter ratings. Include simple tasks where no advantage is expected, so additional complexity is visible. Compare adding a reference against reusing an existing middle view; do not assume another panel is necessary.

**Edge cases:** pinned region closes or changes status; parent closure changes interpretation; the same region is both pinned and inspected; a hypothetical destination differs from current access; undo changes the board; narrow screens cannot keep both views legible. A live pin should expose its identity and changed state without claiming legality or strategic importance.

### C. Link view correspondence and touch preview without extra rule explanations

Test matching crop-outline identities across the overview/middle/detail chain, plus a transient highlight of the same target in every view that contains it. For an offscreen inspected destination, test one named edge cue. On touch, compare existing commitment with an optional hold-to-preview condition showing the exact prospective target outside finger occlusion; release/cancel semantics require separate testing. This proposal combines presentation hypotheses from studies 1, 5, and 6.

Measure crop-to-overview matching errors, candidate destination identification, accidental moves, selection corrections, and total successful-selection time. Keep mouse and touch results separate. Test correspondence highlighting independently before combining it with touch behavior, to identify which change causes benefit or harm.

**Edge cases:** the two outlines overlap; a destination lies in a different ancestor from the source; it is offscreen in detail but onscreen in overview; cues share an edge; touch begins near a corner; drag changes the crop; routing preview invalidates after a state change. Show containment and access with distinguishable signals, and obtain both from existing domain results.

## Limits and decision criterion

None of these studies examined Fifteen, six-level recursion, or magic-square rules. They justify experiments, not a redesign mandate or guaranteed effect sizes. The most relevant distinction is between factual orientation/selection failures and strategic decisions: successful navigation should reduce avoidable inspection effort without making a decision for the player. Keep task accuracy, selection error, navigation time, preference, and strategic comprehension separate. A change is promising when it reduces a measured failure while preserving the other outcomes across the cases where players actually use it.
