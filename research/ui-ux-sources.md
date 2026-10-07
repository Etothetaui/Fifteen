# Fifteen UI research — v0.2.0-dev

Research date: 2026-10-06. Baseline inspected: `index.html`, `web.css`, `web.js`, and `ui.py` at the beginning of this task. Findings below describe that baseline, not an assertion that subsequent tickets remain unfixed.

## Scope and processing checklist

The requested category minima sum to 15, so this review uses exactly five sources per category. A source is processed after reading its relevant body/sections, recording its limits, and connecting it to existing code. Search snippets alone do not qualify. Papers are research evidence; forum posts are firsthand reports of those posters' experience, not prevalence estimates or independently verified claims about current games. W3C understanding documents explain standards; APG is implementation guidance, not a claim that this game is WCAG conformant.

Preserve the full Level 3 board, single sidebar, approved cream/sage/dark-green palette, recursive objects, and authoritative Python magic-square rules. No source justifies changing game rules or substituting geometric win detection. UI navigation may reflect displayed positions, but cannot decide game legality or outcomes.

Processed in mixed batches, rather than finishing one category at a time:

- [x] T1 Chess discussion — keyboard access.
- [x] O1 W3C APG — keyboard navigation and focus.
- [x] P1 MacKenzie — pointing performance and limits.
- [x] T3 Balatro discussion — color distinctions.
- [x] O2 W3C — redundant visual cues.
- [x] T4 Civilization VI discussion — state visibility.
- [x] O3 W3C — target dimensions and equivalent controls.
- [x] P3 Hunicke et al. — game design framework.
- [x] T5 Into the Breach discussion — discoverability.
- [x] P4 Andersen et al. — tutorial evidence.
- [x] P2 Parhi et al. — touch targets.
- [x] O4 W3C — status announcements.
- [x] O5 W3C — predictable settings.
- [x] P5 Harrison et al. — waiting feedback.
- [x] T2 Slay the Spire 2 discussion — accidental commitment.

Totals: **15 processed: five threads about five different games; five scholarly papers; five other primary guidance sources.** An initially found Reddit Slay the Spire thread was excluded after direct retrieval failed; its replacement T2 was opened and its body/comments read. Other search discoveries and inaccessible GameFlow PDF are not counted.

## Findings and candidate decisions

### T1 — Chess: Inputs using keyboard?

[Chess.com discussion, 13 February 2020](https://www.chess.com/forum/view/help-support/inputs-using-keyboard). Read original post and reply.

A blind player reports that clicking pieces is difficult and asks for keyboard input. A reply describes an external extension. This demonstrates an individual access need, not Chess.com's current capabilities or general user preference.

Baseline: `renderNode` creates native buttons, but all available cells enter the tab sequence; `replaceChildren` destroys focus on every update. Candidate: efficient keyboard movement and deliberate focus restoration, with meaningful position/state names. Preserve pointer play. Combine with O1 rather than creating separate accessibility tickets for each source.

### O1 — W3C ARIA Authoring Practices: Grid pattern

[W3C APG grid pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/). Read navigation, focus, layout-grid, and required-role sections.

Composite grids keep one contained element in the page tab sequence and explicitly manage directional focus. All information needed by assistive technology must remain reachable; merely labelling a container as a grid is insufficient. APG differentiates data and layout grids and documents role/row/cell relationships.

Candidate: stable single-entry board keyboard navigation, with occupied/unavailable cells still inspectable and activation using Python-supplied permissions. If retaining grouped buttons instead of complete grid semantics, describe that honestly rather than adding partial ARIA grid roles. Test arrows, entry/exit, restart, AI replies, terminal boards, and focus retained outside the board. Reinforces T1.

### P1 — MacKenzie (1992), Fitts' Law as a Research and Design Tool in Human-Computer Interaction

[Author-hosted full paper, Human–Computer Interaction 7, 91–139](https://www.yorku.ca/mack/hci1992.html), DOI 10.1207/s15327051hci0701_3. Read introduction/model discussion, application-study comparisons, and conclusions.

Target width and movement distance inform pointing difficulty. The paper also emphasizes inconsistent experimental procedures and warns against transplanting a prediction equation from one study into another interface without validation.

Baseline: Level 3 packs 27 cells across the available board width. Candidate: measure actual targets and supply a precise alternative where cells are tiny. This does not establish a universal pixel size or justify replacing the user's full-board design. Consolidate with P2/O3; do not claim measured speed gains in Fifteen.

### T3 — Balatro: Colorblind — hearts and diamonds look the same in high contrast mode

[Steam discussion, March 2024](https://steamcommunity.com/app/2379780/discussions/0/4308327178400364606/). Read original discussion and replies, including disagreement about perceived colors and difficulty distinguishing card symbols.

Players report that a palette labelled high contrast still fails to distinguish some suits for them. Other posters perceive the same colors differently. These are personal reports; commenters' medical/color-science claims are not treated as evidence.

Baseline: X/O already differ in shape, so no new player-color system is needed. Available regions and last move rely much more on subtle colored borders/backgrounds. Candidate: reinforce these states with non-color outline/pattern/text cues using existing colors. Reinforces O2; no palette replacement ticket.

### O2 — W3C Understanding SC 1.4.1: Use of Color

[W3C Use of Color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html). Read criterion, intent, examples and luminance caveat.

Meaning should not depend solely on color; shape or text can supplement it. The guidance explicitly permits color coding when another visual indication conveys the same information.

Candidate: distinguish the active region structurally and name the last move in accessible text. Existing X/O glyphs and result text already provide redundant identity, so reuse them. Do not use the guidance as a pretext to replace the palette or add redundant legends. Consolidate with T3/T4.

### T4 — Civilization VI: Poor interface, page 5

[CivFanatics discussion, October 2016](https://forums.civfanatics.com/threads/poor-interface.600401/page-5). Read posts #82–88 and tooltip follow-up #93 onward.

Players describe selection state visible away from the acted-on city, indistinguishable unit states, relevant information hidden behind extra clicks, and slow tooltips. This is an old version and a much larger strategy interface, not proof of present Civ VI defects.

Candidate: keep turn/routing state near the board and visibly distinguish its permitted region; do not require a tooltip to discover where play is allowed. The existing full-board/sidebar choice already addresses much of the complaint, so retain it. Reinforces state cues and concise help rather than adding a redesigned screen or mandatory focus view.

### O3 — W3C Understanding SC 2.5.8: Target Size (Minimum)

[W3C Target Size Minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html). Read criterion, intent, spacing and equivalent-control exceptions.

The criterion specifies 24×24 CSS pixels with defined exceptions, including an equivalent control on the same page. It does not mean every small spatial control automatically qualifies as essential.

Baseline Level 3 cells become substantially smaller on narrow screens. Candidate: a precise larger-target position selector or equivalent input alongside the full board, with each choice constrained by the authoritative snapshot. Keyboard access alone does not establish the pointer-equivalent exception. Verify actual target bounds, full-board preservation and no extra domain implementation. Consolidate with P1/P2.

### P3 — Hunicke, LeBlanc & Zubek (2004), MDA: A Formal Approach to Game Design and Game Research

[Author-hosted workshop paper](https://www.cs.northwestern.edu/~hunicke/MDA.pdf). Read all five pages, including framework, competitive feedback, iterative tuning and AI examples.

The framework separates mechanics, runtime dynamics and player experience, and stresses that seemingly small system changes affect play. It advocates explicit goals and iteration. It is a conceptual framework, not an experiment proving a particular layout or palette superior.

Application: use clear permitted-region/terminal feedback while preserving established mechanics. Treat undo, tactical hints, difficulty changes and AI retuning as different game-design work, not automatically implied UI fixes. No standalone feature follows from this source; it supports the scope guardrails and rejects feature accumulation.

### T5 — Into the Breach: Tutorial didn't mention reset turn button

[Steam discussion, 4–15 March 2018](https://steamcommunity.com/app/590380/discussions/0/1694914736008198978/). Read original post and all seven comments.

Several participants had overlooked a reset feature; one reports uncertainty about the scope of the word “battle.” This is small-sample, self-selected testimony about another game's terminology.

Baseline: Fifteen exposes numeric levels and route paths but lacks a compact explanation of recursive routing and completion. Candidate: discoverable, optional plain-language rules/controls help explaining existing behavior, including freedom when directed to a completed board. Do not import Into the Breach's undo mechanic. Merge with P4 rather than issuing duplicate tutorial tickets.

### P4 — Andersen et al. (2012), The Impact of Tutorials on Games of Varying Complexity

[University of Washington full CHI paper](https://grail.cs.washington.edu/wp-content/uploads/2015/08/andersen2012tio.pdf), CHI 2012. Read study design, Table 3, discussion and conclusions.

The study tested eight tutorial designs in three games with over 45,000 players. Tutorial effects differed by game: benefits appeared in the complex Foldit, while simpler games did not show the same benefit. On-demand help was not universally beneficial; the paper discusses confounds such as audience patience and downloadable versus browser games.

Candidate: concise optional help focused on Fifteen's unusual recursive routing, with immediate contextual instructions retained. Reject mandatory walkthroughs or claims that help will increase retention. The paper does not demonstrate that any Fifteen level matches a studied game's complexity. Reinforces T5 only with those limits.

### P2 — Parhi, Karlson & Bederson (2006), Target Size Study for One-Handed Thumb Use on Small Touchscreen Devices

[Microsoft Research full MobileHCI paper](https://www.microsoft.com/en-us/research/wp-content/uploads/2006/01/parhi-mobileHCI06.pdf). Read task design, discrete/serial task results, discussion and conclusions.

Target size affected speed and error in one-handed PDA tasks. The authors recommended roughly 9.2 mm discrete and 9.6 mm serial targets for their tested conditions, and explicitly acknowledged device/grip and movement-context limits.

Candidate: strengthen the dense-board precise-input ticket supported by O3/P1. Do not convert millimeters blindly into CSS pixels or promise these thresholds solve all phones. Preserve the board overview and verify larger controls are actually usable at narrow widths. No separate target-size ticket needed.

### O4 — W3C Understanding SC 4.1.3: Status Messages

[W3C Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html). Read intent, status examples and live-region cautions.

Waiting, results and errors can be exposed programmatically without stealing focus. Announcements should communicate important changes without unnecessary interruption.

Baseline: `#status` is live, but routing lives in `#substatus`, which is outside it; recoverable errors also replace that paragraph. Candidate: announce complete turn/routing/error state coherently, avoiding a stream of board-cell announcements. Keep visible state in existing places, preserve user focus, and identify actual waiting stages rather than reporting invented progress. Combine with keyboard/state work where ownership overlaps.

### O5 — W3C Understanding SC 3.2.2: On Input

[W3C On Input](https://www.w3.org/WAI/WCAG22/Understanding/on-input.html). Read criterion, state-toggle distinction and examples.

State-setting controls should have predictable consequences; users may be advised before a context change. A toggle button is covered as a setting change. Not every content update is automatically a change of context.

Baseline: player/level changes restart immediately. The existing note explains that behavior, but CSS hides it on mobile. Candidate: preserve an unfinished game until a destructive change is explicitly confirmed, or ensure warning is accessible before committing; never alter the selected controls on cancellation. This criterion alone does not mandate a confirmation dialog. T2 supplies the error-cost rationale. Empty/finished games should not incur needless confirmation.

### P5 — Harrison, Amento, Kuznetsov & Bell (2007), Rethinking the Progress Bar

[Author-hosted full UIST paper](https://chrisharrison.net/projects/progressbars/ProgBarHarrison.pdf), UIST 2007, 115–118. Read experiment, analysis, discussion and future work.

Twenty-two participants compared progress bars with fixed 5.5-second durations. Rate profiles affected perceived duration; late pauses were disadvantageous. The authors explicitly say that applicability to longer durations needs investigation.

Baseline: one loading string covers downloading, Python startup and module loading; the failure path always blames connectivity. Candidate: show real boot stages and distinguish a runtime failure from a download failure, reusing worker lifecycle events. This is an inference about truthful feedback, not an experimentally proven implementation choice. Reject fabricated percentages, perceptual timing tricks, animation or artificial delays. Reinforces O4 rather than adding a decorative progress-bar ticket.

### T2 — Slay the Spire 2: Skipping a turn accidentally: add confirmation

[Steam discussion, 10–11 April (page's displayed dates)](https://steamcommunity.com/app/2868840/discussions/0/798966745989792120/). Read original post and all six comments.

A player describes losing health after an unintended end-turn input caused by controller muscle memory. Replies point out a long-press setting; another prefers separate confirm/end-turn bindings. These reports support protecting costly accidental actions, but do not establish a universal preference for dialogs or long presses.

Candidate: consolidate into O5's unfinished-game restart protection. Use a normal discoverable confirmation with a safe cancellation path for match destruction, not long-press-only input or confirmation on every legal move. Preserve existing controls and restart authority.

## Consolidation supplied to ticket classification

These are candidate families, not an instruction to implement every idea. Ticket ratings/rejections and closure evidence live in the build-ticket ledger.

| Candidate family | Supporting sources | Existing-code gap / decision boundary |
| --- | --- | --- |
| Keyboard board navigation and stable focus | T1, O1, O4 | Rebuilt cells lose focus; many tab stops; legality remains Python-owned. |
| Unfinished-game reset protection | T2, O5 | Mode/level/new-game discards state immediately; cancel must preserve board and settings. |
| Non-color route and last-move information | T3, T4, O2, O4 | Palette stays; supplement existing border/text and announce route. |
| Precise dense-board input | P1, P2, O3 | Small Level 3 targets; retain full-board view and add equivalent input only if justified by measured bounds. |
| Compact optional rules/controls help | T5, P4 | Explain existing recursive behavior; no forced tutorial or strategy hints. |
| Truthful loading/error feedback | P5, O4 | Real boot stages and specific recovery; no fake percent or cosmetic animation. |
| Existing architectural/design constraints | P3 | Reject gameplay/AI changes and arbitrary restyling; no new ticket for already-satisfied constraints. |

Repeated evidence should strengthen a family rather than generate duplicate tickets. Use checkable acceptance and review gates (the user-invoked writing-great-skills principles), retain one authoritative ticket per behavior, and record rejected candidates explicitly. Research is sufficient to motivate testing these changes, not proof of real-user usability gains; local interaction checks and the user's preview remain necessary.
