# Local v0.2.0-dev completion checklist

Publication follow-up: the user approved pushing the local changes and requested
a patch increment. The published change set is prepared as `0.2.1-dev`, including
the subsequent diamond draw symbol and 61.8% proportional symbol sizing. The
checklist below records the earlier local-preview milestone.

Baseline: `00698b3930bd8f325b1b81b85b594e3a9da73f8f` (`0.1.2-dev`).
Baseline verification: all 49 Python tests passed before edits.

- [x] Read and process 15 sources in mixed order: five game threads about five different games, five scholarly papers, five other primary sources.
- [x] Record cited findings and limits in `ui-ux-sources.md`.
- [x] Classify candidate tickets from 1–4; merge repeated ideas and reject existing or unsuitable proposals.
- [x] Implement accepted tickets in descending priority using subagents.
- [x] Each implemented ticket receives an independent subagent review before closure.
- [x] Preserve the approved palette, sidebar, and complete Level 3 board.
- [x] All rules, permissions, moves, and results still come from the original Python model.
- [x] Verify keyboard and pointer play, restart cancellation/confirmation, routing feedback, errors, and terminal states.
- [x] Inspect desktop and narrow layouts in the real browser.
- [x] Run the complete Python suite and applicable browser/JavaScript checks.
- [x] Update README, changelog, and final version to `0.2.0-dev`.
- [x] Leave a running local preview for user testing; no GitHub publication.

Version policy for this task: increment the patch after each integrated user-visible ticket, then set the explicitly requested final `0.2.0-dev`. Intermediate bumps are local development checkpoints, not separate releases.

Local checkpoints: keyboard interaction (0.1.3-dev), atomic status feedback (0.1.4-dev), reset protection (0.1.5-dev), optional rules help (0.1.6-dev), precise input (0.1.7-dev), and truthful loading feedback (0.1.8-dev). All six are now reviewed and closed; final version is `0.2.0-dev`.

Originality constraint: sources identify user problems, not designs to copy. No source assets, wording, distinctive layouts, or game-specific interactions are imported. Changes use Fifteen's established presentation and ordinary web interaction conventions.

## Verification evidence (2026-10-07)

- 49 Python tests passed with `python -m unittest discover -v`, including exhaustive base-game checks and recursive routing/state restoration.
- 24 Node tests passed with `node --test tests/web_keyboard.test.cjs tests/web_loading.test.cjs`: keyboard, reset triggers, Escape, stale AI replies, picker path submission at all exposed levels, each initialization failure stage, and obsolete worker messages.
- Real browser: Level 1 arrow navigation and Enter; Level 2 Space move `1 / 2` directed the next player to board 2; Level 3 picker move `2 / 5 / 7` directed the next player to board `5 / 7`. Each had one board tab stop; focus survived the AI reply without stealing sidebar focus.
- Real browser: cancel/Escape preserved moves and selections for level/player/new-game changes; confirm reset once; empty and finished games reset without confirmation. Cancelling during an AI turn resumed one reply (move count 1 to 2). Safe cancellation received initial dialog focus.
- Real browser: X win sequence `1,4,2,5,3` and draw sequence `1,2,3,5,8,6,4,7,9`; terminal board and picker disabled, result in the single atomic live region, immediate rematch works.
- Real browser: optional help opens by keyboard without changing game state. Mobile viewport 390×844 had no horizontal overflow and retained all 729 board cells; optional picker buttons measured approximately 77.33×44 CSS pixels. Temporary viewport override reset afterward.
- Startup was observed preparing Python then becoming ready. Failure-stage and retry behavior is exercised in Node with controlled worker failures, not a claim of testing every network failure in the browser. Live-region semantics were inspected; no screen-reader listening study or WCAG compliance claim is made.
- `git diff` is empty for `fifteen.py`, `ui.py`, `ai_evaluation.py`, `alpha_beta_engine.py`, and `experimental_ai.py`; new UI consumes existing snapshots and shared move transport. No new win detection.
- `git diff --check` passed. README and changelog describe the final update.
- Final local browser shows `v0.2.0-dev` at `http://127.0.0.1:8000/`; [preview screenshot](local-preview.png). HTTP server remains running for user review. Git HEAD remains the baseline release; no commit or push was performed.

## Review process

Research, classification, and implementation used separate subagents. An attempted additional reviewer spawn reached the available thread limit; the classifier was then reused as an independent reviewer, never reviewing its own implementation. All review findings and browser gates are tracked per ticket. The native JavaScript confirmation stalled the in-app browser during testing and was replaced with a tested in-page HTML dialog before closure.
