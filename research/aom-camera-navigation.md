# Age of Mythology: Retold camera navigation: deeper evidence

Research date: 2026-10-07. Documentary research, not a play-test of an installed game. No gameplay/UI changes or publication. Sources are official developer releases and original player observations on the official forum. A forum post is primary evidence of that player's observation, not an authoritative engine specification. Historical reports are identified by build/date; they cannot establish current behavior after subsequent fixes.

## What the additional investigation establishes

**The drag controller and the edge controller must be discussed separately.** Original reports describe continuous drag as movement controlled by displacement from the initial click, with a dead zone and acceleration. That does not establish that edge scrolling uses continuous angles or proximity-dependent velocity. No verifiable Retold edge-direction implementation, pixel threshold, or acceleration equation was located in the reviewed public material.

### Outside-window scrolling: official, high confidence

Update 17.46557, November 12, 2024, restored edge panning when the cursor leaves the screen with cursor lock off in windowed mode. Update 17.51177, November 21, 2024, added a setting for this behavior, enabled by default; disabling it stops edge panning when the cursor exits the window. These notes establish continued outside-window scrolling, but do not establish a 25-pixel outer cutoff or an inner pixel band. Fifteen's 75-pixel inner band and 25-pixel outer cutoff are explicit custom choices. [17.46557](https://www.ageofempires.com/news/age-of-mythology-retold-minor-update-17-46557/), [17.51177](https://www.ageofempires.com/news/age-of-mythology-retold-update-17-51177/).

### Drag models: official availability; historical observed mechanics

Update 18.12962, March 20, 2025, added Continuous Drag, World Drag, and No Drag. Continuous Drag retained the previous behavior and was the default. The release does not provide their equations. [Official update](https://www.ageofempires.com/news/age-of-mythology-retold-update-18-12962/).

An August 31, 2024 original feature request describes the old controller as continuing to move according to the direction of mouse displacement from the click origin, rather than grabbing terrain directly. This supports describing historical Continuous Drag as a velocity-control interaction: move the mouse from its origin to request movement, instead of moving the world exactly with the mouse. This is a qualitative observation, not proof of a particular linear speed formula. [Original observation](https://forums.ageofempires.com/t/feature-request-modern-camera-dragging/260448).

An August 28, 2024 report includes demonstration video links and complains that broad drag offset is necessary before camera movement begins. A developer, FE_Yorkie, acknowledged it as a tracked issue on September 2. This is stronger evidence of a historical dead-zone/response issue than an uncorroborated complaint, but neither the report nor acknowledgment publishes a threshold or acceleration curve. [Report and developer response](https://forums.ageofempires.com/t/hotkey-unable-to-pan-the-camera-using-the-middle-mouse-button/259888).

A September 24, 2024 settings discussion contains original screenshots and identifies Camera Drag Invert Direction, Click Drag Panning Speed, Camera Acceleration, Camera Edge Scrolling, and the Move Camera with Mouse binding. It identifies right-click as the default mouse binding and reports other mouse-button bindings. Exact ranges/defaults were not established here. [Settings evidence](https://forums.ageofempires.com/t/left-click-to-drag-screen/262782).

A March 21, 2025 report for build 18.12962 states that World Drag ignored the speed/inversion settings while Continuous Drag responded to them. Treat this as a historical reported inconsistency, not current promised behavior. Fifteen's direct-grab drag is conceptually closer to World Drag, but is not an exact reproduction verified against Retold. [Build-specific report](https://forums.ageofempires.com/t/new-drag-scroll-bug/271524).

### Input ownership and stuck movement: concrete official edge cases

November 7, 2024 update 17.43876 fixed panning remaining enabled after release over the minimap and improved windowed panning with cursor lock. These show that ending a gesture on another UI surface and window confinement matter. [Official update](https://www.ageofempires.com/news/age-of-mythology-retold-update-17-43876/).

April 24, 2025 update 18.21333 changed World Drag to cancel on window focus loss and popup opening. This is directly relevant to keeping browser camera input from continuing behind a dialog or in another window. [Official update](https://www.ageofempires.com/news/age-of-mythology-retold-update-18-21333/).

November 20, 2025 update 18.56738 fixed mouse panning in windowed mode with customized DPI scale; World Drag persisting with Shift over the minimap; camera movement continuing after opening chat with Enter; unexpected camera movement with modifiers; and keys not clearing on release. It also separated keyboard-only Zoom In/Out bindings from a dedicated wheel Camera Zoom binding to fix repeated zoom. Wheel input is therefore an impulse requiring different handling from a held key. The same update introduced unit Perspective and Follow cameras, with Escape exit and cancellation when the unit becomes invisible or a cinematic begins. These alternate cameras are distinct contexts; their behavior must not be generalized to ordinary edge scrolling. [Official update](https://www.ageofempires.com/news/age-of-mythology-retold-update-18-56738/).

## Comparison with the Fifteen implementation at the time of research

This section records the implementation inspected during research. Subsequent
0.2.4-dev edits removed focus-driven panning, replaced eight directions with the
center-to-mouse vector, and added a one-second speed ramp from 300 to 485.4 pixels
per second. See the README and camera source for the final published behavior.

The authoritative implementation inspected is [board-camera.js](../board-camera.js), particularly `resize`, `draw`, `wheel`, `pointerMove`, `edgeDirection`, and `startEdge`. These are verified local-source facts, not claims about Retold.

| Item | Fifteen | Retold evidence |
| --- | --- | --- |
| Inner activation zone | 75 CSS pixels | Exact width unknown |
| Outside region | At most 25 CSS pixels beyond any side | Official optional continuation outside window; exact cutoff unknown |
| Direction | Per-axis -1/0/1, normalized; eight requested directions | Edge direction equation unknown; continuous drag observations do not settle it |
| Edge velocity | 300 screen pixels/second, independent of proximity and zoom | Settings exist; exact edge velocity, proximity curve, acceleration curve unknown |
| Drag | Left mouse, 5-pixel activation threshold, direct grab | Three modes officially documented; historical Continuous Drag offset/dead-zone response |
| Wheel anchor | World point under cursor preserved until centering/clamping interferes | Cursor versus center anchoring not established by reviewed sources |
| Zoom range | 1–9 times fitted board size | Exact ordinary zoom limits not established here |
| Fit behavior | 100 CSS pixels above/below at minimum, each fitting axis centered | No equivalent board-fit guarantee documented |

Fifteen's frame interval is capped at 50 milliseconds. Extremely long frames therefore do not generate a large catch-up leap, though effective speed can drop during stalls. Both drag and edge controls default Off. Edge movement is suppressed during dragging, focus loss, hidden-page state, and an open dialog. This makes its input lifecycle partly analogous to Retold's officially documented cancellation concerns without reproducing its engine.

### Why ours can appear limited to vertical movement

The board is square and the viewer is landscape. `draw` centers any axis where the board fits, and `edgeDirection` removes that axis's movement. This means an intermediate zoom can allow vertical panning while disallowing horizontal panning.

**Calculated example, not a measured current viewport:** for an 810-by-500 CSS-pixel viewer, the fitted board is 300 pixels square after the 100-pixel upper/lower gaps. Vertical overflow starts above 500/300 = 1.667x zoom; horizontal overflow starts above 810/300 = 2.7x. Between those points, a corner request can become purely vertical. At a map limit, one component can likewise be removed and the remaining component renormalized to full speed. This is separate from the eight-direction controller.

## Outstanding questions and a reproducible verification plan

Public documentation reviewed does not settle Retold's edge direction count, corner normalization, inner/outer distances, position-dependent velocity, acceleration constants, zoom-dependent speed, or zoom anchor. Reporting guesses as an exact AoM comparison would be misleading.

To settle those points, a controlled play-test should record the Retold build, resolution, Windows DPI, camera acceleration/speed settings, window mode, and zoom. Track one stationary terrain landmark while holding the pointer at known coordinates: mid-edge, multiple positions inside a corner, different distances from the edge, and outside the window. Compare frame-by-frame displacement vectors before and after acceleration stabilizes. Use camera rotation zero and avoid map limits. Repeat at two zooms; repeat with acceleration zero versus nonzero. For zoom anchoring, place the cursor on an off-center landmark and zoom without panning, then observe whether the landmark remains under it. Test mouse release over the minimap, popup/chat opening, focus loss, and toggling confinement separately.

An ordinary gameplay video showing diagonal travel without controlled cursor coordinates cannot reliably distinguish eight-direction edge movement from continuous-angle motion, acceleration transients, or boundary clamping. This research does not claim to have performed the above play-test.
