# UI/UX build tickets

This is the authoritative ticket ledger. Source IDs and findings are maintained in [ui-ux-sources.md](ui-ux-sources.md). The classifier read `writing-great-skills/SKILL.md` and applied single-source ownership, deduplication, scoped steps, and checkable completion criteria. Ratings: **4 definitely**, **3 worthwhile**, **2 uncertain**, **1 maybe**. Repeated evidence strengthens an existing ticket; it does not create another ticket. Only accepted tickets enter the build queue. Implementation completion precedes independent review; closure requires both.

## Baseline

- `web.js` recreates all cell buttons on every Python snapshot and disables them while waiting. Every allowed cell initially participates in Tab order (up to 729).
- `restart()` immediately clears a match for New game, player changes, and level changes. A note explains this, but is hidden on small screens.
- The status heading is a polite live region. Routing instructions and errors are written to a separate, non-live paragraph.
- Legal regions have visible borders against transparent defaults; the last move has a unique inset frame. These already provide structural cues. Python supplies `allowed`, `last`, `forced`, and results; UI must consume these fields.
- The approved cream/sage palette, sidebar, full Level 3 board, recursive structure, and Python magic-square rules are preserved.

## Build queue

### UX-01 — Keyboard board navigation and stable focus

**Priority:** 4. **Status:** closed. **Implementation:** complete (`keyboard` agent). **Review:** code review passed (`classifier`, independent of author).

Review evidence: inspected keyboard/focus changes and the shared renderer against original architecture and acceptance. The missing last-move accessible label was reported and fixed by the author. `node --test tests/web_keyboard.test.cjs` passed all 13 checks at the initial review, including navigation, native activation, async focus, and last-move labels. Presentation coordinates only support navigation; Python still supplies all permissions and moves. The mocked DOM alone does not prove real focus-event ordering; final browser evidence is recorded below.

**Evidence:** T1 [Chess keyboard input thread](https://www.chess.com/forum/view/help-support/inputs-using-keyboard), O1 [W3C grid pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/). A direct access barrier plus established keyboard interaction guidance makes this a definite improvement. This is an interaction repair, not a palette or layout change.

**Steps:** Keep one board entry in the Tab sequence; provide predictable arrow navigation through the displayed board and Enter/Space activation through the existing click/play path. Preserve focus across snapshots and human/computer round trips. Expose concise keyboard instructions and include Python's last-move indication in the cell's accessible label. Use Python permissions and a presentation-only coordinate mapping.

**Acceptance:** At levels 1, 2, and 3, Tab enters/exits the board without traversing every cell; arrows move predictably; only Python-allowed moves can be submitted; focus survives a move and the AI reply or falls back to a legal cell; sidebar focus is never stolen; focus is visible. Restart, terminal state, and no-legal-human-move states are tested. Appropriate semantics describe the interaction without claiming an ARIA grid that lacks its required structure.

### UX-02 — Protect an unfinished match from accidental reset

**Priority:** 3. **Status:** closed. **Implementation:** complete with HTML dialog (`keyboard` agent). **Review:** replacement code review passed (`classifier`, independent of author).

Review history: the first native-confirm implementation passed code/unit review but failed the parent's in-app-browser interaction check. It has been replaced by a labeled HTML dialog that pauses subsequent AI scheduling, preserves uncommitted controls, and resumes on cancel. The old unit harness's seven failures during rewriting were resolved by tests exercising the actual dialog callbacks. Independent re-review confirmed deferred selection, safe initial focus, Escape/cancel handling, single AI scheduling after cancellation, and generation filtering after confirmation. All 24 combined JavaScript checks pass. The replacement passed the rendered-dialog/focus checks recorded below; closure uses those results rather than the earlier pass.

**Evidence:** T2 [Slay the Spire 2 end-turn discussion](https://steamcommunity.com/app/2868840/discussions/0/798966745989792120/), O5 [W3C on input](https://www.w3.org/WAI/WCAG22/Understanding/on-input.html). The thread describes accidental end-turn activation and a hidden long-press remedy. Confirmation is restricted to discarding a match because ordinary moves should remain immediate. The existing explanatory note means this is not a blanket compliance claim.

**Steps:** Route all explicit restart triggers through one guard. Ask to discard only after an unfinished game has moves. Apply requested control changes only after confirmation; cancel leaves selection and state intact. Preserve the existing new-game behavior when empty or finished.

**Acceptance:** New game, player change, and level change all preserve the match and selected controls on cancel and start exactly one new match on confirm. Empty/finished games restart without a prompt. Ordinary moves never require confirmation. Pending AI replies cannot overwrite a confirmed restart; cancel resumes normal play. Dialog is keyboard-operable and focus returns to a sensible control.

### UX-03 — Announce routing and action feedback

**Priority:** 4. **Status:** closed. **Implementation:** complete (`research` agent). **Review:** code review passed (`classifier`, independent of author).

Review evidence: the existing status and substatus now share one atomic polite live region; the nested heading no longer creates a duplicate region. Existing status, routing, terminal, loading, and error assignments update that region without moving focus or exposing internals. No domain changes or copied game-specific UI were introduced. Final DOM/live-region evidence is recorded below; no screen-reader listening claim is made.

**Implementation evidence:** `index.html` now places the existing heading and routing/error paragraph in one atomic polite status region. The heading has no nested live role. Inspected all existing `web.js` writes: human/free/forced instructions, AI waiting, terminal status, loading failure and recoverable errors target these same descendants. No focus call or visible style/layout change was added. Final live-region verification is recorded below; this does not claim a screen-reader listening test.

**Evidence:** O4 [W3C status messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html), corroborated by T1. The existing live heading omits which recursive region is playable.

**Steps:** Use one concise live status update containing current player/outcome and the Python-provided routing instruction or recoverable error. Avoid duplicate announcements and unnecessary full-history announcements. Preserve visible status layout.

**Acceptance:** Screen-reader/live-region inspection covers human turns, AI turns, free-region routing, forced routing, win/draw, and recoverable errors. Updating status never moves focus. Existing status text remains plain and magic-square details remain hidden.

### UX-05 — Optional concise recursive-game instructions

**Priority:** 3 (raised from tentative 2). **Status:** closed. **Implementation:** complete (`research` agent). **Review:** code review passed (`classifier`, independent of author).

Review evidence: checked the explanatory examples against `Board.play`, `GameState.play`, `allows_prefix`, and `resolve_target`. Level 3 destination drops the first path index; closed inner/outer destinations release the described ancestor. Native `details` requires no new game callback and starts closed. Scoped CSS uses existing tokens and leaves board sizing untouched; shared keyboard instructions avoid duplication. Wording is original and specific to current behavior, with no imported game mechanics or magic-square internals. Final mobile and disclosure evidence is recorded below.

**Implementation evidence:** Added a native, initially closed `details` disclosure titled “How to play” in the existing sidebar. Original text was checked against `Board.play`, `GameState.play`, and `resolve_target`; it explains both destination-depth fallback cases. One `keyboard-help` paragraph also labels the board via `aria-describedby`, coordinated with UX-01 to remove its duplicate description. Scoped help styles reuse palette tokens, preserve the board sizing rules, and span the existing mobile sidebar columns. Thirteen existing recursive routing/interface tests passed. Final keyboard/mobile/open-without-reset checks are recorded below. Script/style query changed to `ui=research-preview` after the parent observed stale cached interaction code.

**Evidence:** T4 [Civilization VI interface discussion](https://forums.civfanatics.com/threads/poor-interface.600401/page-5), T5 [Into the Breach discussion](https://steamcommunity.com/app/590380/discussions/0/1694914736008198978/), P4 [Andersen et al., tutorial study](https://grail.cs.washington.edu/wp-content/uploads/2015/08/andersen2012tio.pdf). The paper finds tutorial value depends on game complexity; it does not support mandatory onboarding. Combined with game-thread discoverability concerns and Fifteen's recursive routing, evidence supports a small optional explanation, raising this existing candidate rather than duplicating it.

**Steps:** Add a plainly labeled, collapsed-by-default help disclosure in the existing sidebar. Explain base win condition, winning subboards, routing, and release to the nearest playable containing region. Include keyboard instructions from UX-01 in this same place instead of repeating them in another help system. Read current Python rules to verify wording.

**Acceptance:** Help is available at mobile and desktop widths and keyboard-operable, opens without resetting/changing the match, and leaves the full board layout intact. Text is accurate for levels 1–3, including a completed destination's ancestor fallback. No magic-square internals, promotional language, forced tutorial, or hover-only dependency.

## Additional accepted tickets

### UX-06 — Optional precise input for dense boards

**Priority:** 3. **Status:** closed. **Implementation:** complete (`keyboard` agent). **Review:** code review passed (`classifier`, independent of author).

Review evidence: the optional picker traverses existing snapshot children and consumes their `allowed` fields. The shared `canPlay`/`playNode` functions serve both board and picker, retaining the existing Python action and scalar/recursive path formats. Controls use 44 px minimum dimensions without altering the full-board sizing rules. Level 1–3 payload tests, forbidden-node/AI/terminal suppression, and non-mutating Back tests pass. No independent rule implementation was introduced. Final target measurements, live play, and focus evidence are recorded below.

**Evidence:** P1 MacKenzie, P2 Parhi, O3 target-size guidance; parent browser measurements found Level 3 cells approximately 9.92 CSS px wide at a 390 px viewport versus 26.06 px on desktop. The measured mobile target problem justifies an optional equivalent input method, separately from the rejected forced enlargement/focus view.

**Steps:** Add a compact optional precise-move input beside the unchanged full-board overview. Use existing position addresses and Python snapshot permissions, submitting through the existing play action. A labeled numeric address form is sufficient if it explains the outer-to-inner sequence and reports invalid input; a staged larger selector may instead reuse snapshot children. Keep this bounded to move input, without strategic hints or new game rules.

**Acceptance:** A touch user can submit a legal Level 3 move without hitting a tiny cell. Controls are comfortably usable at 390 px; full board remains visible and unchanged. Levels 1–3 work through the same path adapter. Invalid/occupied/out-of-route input cannot mutate state; Python remains authoritative. Computer turns/terminal state disable submission; restarting clears stale entry; feedback is accessible. Keyboard users retain normal board navigation.

### UX-07 — Truthful loading stages and recovery messages

**Priority:** 3. **Status:** closed. **Implementation:** complete (`research` agent). **Review:** code review passed (`classifier`, independent of author).

Review evidence: inspected real stage emission around import/download/start operations and the shared UI status receiver. Fatal messages include a phase; visible recovery text uses that phase without displaying diagnostic strings. Retry handlers capture the worker instance and ignore replaced-worker stage, fatal, and error callbacks. Six `tests/web_loading.test.cjs` checks pass, covering success readiness, all four failure phases, and stale retry messages. Python rules and engines remain unchanged. Final browser startup and simulated failure/retry evidence are recorded below.

**Implementation evidence:** `python-worker.js` emits four real lifecycle stage identifiers before runtime download, runtime preparation, game-file download and game preparation. Fatal replies carry the actual stage. `web.js` displays short stage labels, stage-appropriate recovery text without diagnostic contents, and ignores messages/errors from a replaced worker. Retry reuses the existing worker restart. Six `tests/web_loading.test.cjs` checks passed: ready once after ordered stages; failures at each of four stages without readiness; obsolete-worker stage/fatal/error rejection and safe current error text. No progress percentage or delay was added. Independent review and integration evidence are recorded below.

**Evidence:** P5 Harrison and O4 status messages; the direct code gap is that downloading, runtime setup, and game-module initialization share one download string, and every fatal error blames the internet. P5 does not prove stage labels improve Fifteen, but accurate feedback removes demonstrably incorrect diagnosis.

**Steps:** Emit actual worker lifecycle stages and display concise plain-language loading status. Distinguish download/setup failures where known; otherwise give a neutral retry message rather than inventing a cause. Reuse the existing retry flow and UX-03 live region.

**Acceptance:** Cold initialization shows only stages that actually occur; ready state ends loading; failed download and initialization paths offer appropriate retry text; retry ignores obsolete worker messages and loads once. No guessed percentage, artificial delay, cosmetic animation, file path, traceback, or game-rule change is exposed in the UI.

## Rejected candidates

| Idea | Rating/disposition | Reason |
| --- | --- | --- |
| Confirm every move | 1, rejected | Adds repetitive friction; destructive reset evidence does not justify slowing every legal move. |
| Change palette or add themes | 1, rejected | User-approved colors are fixed; non-color cues address the evidenced issue. |
| UX-04: add new non-color visual cue system | 1, rejected after baseline reinspection | T3 Balatro and O2 use-of-color support redundant cues, but current legal-region borders, inset last-move frame, X/O glyphs, and textual routing already provide them. Additional patterned borders would duplicate existing information and alter the approved appearance. The missing last-move accessible label is folded into UX-01. |
| Undo, hints, scores, achievements | 1, rejected | Game-feature expansion lacks a demonstrated UI repair need. |
| New tooltip system | 1, rejected | T4 Civ VI discoverability concerns are better addressed by existing visible status and concise help. Delayed/hover-only instructions would add barriers. |
| Mandatory game-rule tutorial modal | 1, rejected | Optional concise help is accepted as UX-05; complexity-dependent tutorial evidence does not warrant a forced modal. |
| Enlarge every Level 3 target / force a zoom or focus view | 2, rejected | P1 MacKenzie, P2 Parhi, and O3 target-size guidance establish a real precision tradeoff, but their evidence does not establish a better layout for this recursive game. Enlarging 729 cells conflicts with the approved full-board view. Keyboard navigation is the bounded improvement; native browser zoom remains available. No claim of full pointer-target accessibility compliance is made. |
| New onboarding/gameplay mechanics from MDA | 1, rejected | P3 is a conceptual framework; it supports preserving the intended gameplay and rules, not a specific interface redesign. |
| Percent-complete loading bar | 1, rejected | P5 studies determinate progress timing; actual runtime-download progress is not known by the current worker. Existing explicit Loading/Retry states are present, so a fictional percentage adds no reliable information. |

## Final classification decisions

All 15 sources are mapped: T1/O1 to UX-01; O4 to UX-03/UX-07; T2/O5 to UX-02; T3/O2 to the rejected UX-04 candidate and UX-01 label detail; T4/T5/P4 to UX-05; P1/P2/O3 to UX-06; P5 to UX-07; P3 to preservation of existing architecture. Repeated evidence confirms UX-01 at 4 and raises optional help from 2 to 3; measured mobile bounds establish the optional precise-input gap. Build order: UX-01, UX-03, then UX-02, UX-05, UX-06, UX-07 (ties may be grouped if shared-file ownership remains clear). UX-04 is deliberately absent from the build queue, not an unclosed task. Forced enlargement and fabricated progress remain rejected; they are distinct from the accepted actual research candidates.

## Review and closure protocol

The implementer records changed files and verification, then marks a ticket **implementation complete**. A separate reviewer checks acceptance, existing coding style, state/focus/race behavior, and preservation of shared rules. Findings must be resolved and rechecked before **closed**. Parent integration owns final full-suite and rendered-browser checks. Add reviewer identity and concrete evidence here when available.

## Final closure evidence — 2026-10-07

Independent code reviewer: `classifier`; implementation authors: `keyboard` (UX-01/02/06) and `research` (UX-03/05/07). The parent supplied the following actual in-app-browser results after review; the reviewer checked these against each ticket's acceptance before closing it.

| Ticket | Browser/integration evidence supporting closure |
| --- | --- |
| UX-01 | Level 1 arrows preserve exactly one Tab entry; an AI reply restores focus to a legal square. After Level 3 AI play, focus deliberately moved to New game remains there. Level 2 Space activation plays 1 / 2 and routes to board 2. Full Level 1 win and draw leave input disabled; finished restart works. Navigation/path unit coverage extends through Level 3. |
| UX-02 | HTML dialog opens with Keep playing focused. Escape during a requested Level 3→2 change preserves Level 3/history and returns focus; confirmation starts an empty Level 2 game. New-game and O-controller cancellation preserve history and Human selection. Cancel during an AI turn resumes exactly one reply (one ply becomes two). Finished restart needs no dialog. |
| UX-03 | Human/AI turns and routed instructions appear in the single atomic status region. Level 2 1 / 2 routes to board 2; Level 3 2 / 5 / 7 routes to 5 / 7. Completed Level 1 win (1,4,2,5,3) and draw (1,2,3,5,8,6,4,7,9) show correct results. Inspection confirms errors update this same region; no screen-reader audio test is claimed. |
| UX-05 | How to play opens with keyboard input without resetting the match; it remains available at 390×844. The full 729-cell board remains present with no horizontal overflow. Reviewed prose matches actual routing/ancestor fallback. |
| UX-06 | Larger controls measure approximately 77.33×44 CSS px at 390 px viewport. Level 3 picker plays 2 / 5 / 7 and then permits only outer Board 5 as supplied by Python. The original full board stays present. Finished games disable both input sets; Node tests cover all exposed levels and forbidden/occupied/AI states. |
| UX-07 | Real startup visibly passes through Preparing the game runtime and reaches ready. Six controlled worker/lifecycle tests cover ordered phases, failure in each phase without false readiness, safe recovery text, and stale-worker rejection on Retry. Failure paths were exercised in Node, not injected into the real browser; there is no unsupported claim of browser failure simulation. |

Final integrated checks supplied by the parent: **49 Python tests and 24 JavaScript tests passed**; the diff for the authoritative Python rules and engines is empty. The approved palette and full-board sizing are preserved. All six accepted tickets are closed; rejected UX-04 is not a build ticket. Changes remain local for the user's v0.2.0-dev preview and approval.
