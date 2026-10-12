# Magnifier movement investigation

2026-10-11. Scope: presentation performance only, primarily layout 7 at L5/L6.
No game rules, AI, magnification, controls, or movement-speed changes. No push or
version bump. Existing workspace changes were preserved.

## Method

An isolated in-app browser tab at 1280 × 720, default Human X / regular Computer O.
Each empty-board benchmark selected the level, focused the selection outline, and
held Right for 1.6 seconds. A temporary script sampled animation-frame intervals
through release plus 300 ms and timed the existing `renderBoard` function.
Probe and HTML inclusion were removed afterward.

These are local sampled results, not universal hardware guarantees. Percentiles
cover the whole sample, including settling after key release. Board-update times
are JavaScript function durations, not total worker-to-paint latency. Variability
is expected; the final L5 test was repeated.

| Step | Level | Frames | p95 interval ms | Maximum interval ms | Intervals >50 ms | Maximum board update ms |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Baseline | 5 | 40 | 199.9 | 216.6 | 20 | 91.2 |
| Baseline | 6 | 74 | 66.7 | 116.7 | 4 | 30.1 |
| Omit hidden navigation work during lens movement | 5 | 41 | 183.2 | 216.7 | 19 | 91.5 |
| Omit hidden navigation work during lens movement | 6 | 77 | 83.4 | 100.0 | 7 | 32.6 |
| Composited board surface | 5 | 69 | 166.6 | 183.3 | 8 | 77.6 |
| Composited board surface | 6 | 103 | 49.9 | 116.7 | 4 | 27.7 |
| Additional nested layout containment (discarded) | 5 | 66 | 183.3 | 199.9 | 7 | 79.7 |
| Omit invisible number/empty-mark spans | 5 | 85 | 83.4 | 116.6 | 10 | 65.6 |
| Omit invisible number/empty-mark spans | 6 | 104 | 33.4 | 116.7 | 4 | 30.5 |
| Restore identical presentation-branch identities (discarded) | 5 | 85 | 99.9 | 116.6 | 10 | 73.5 |
| Restore identical presentation-branch identities (discarded) | 6 | 98 | 66.7 | 133.5 | 5 | 45.6 |
| Canvas hierarchy frames | 5 | 90 | 66.7 | 100.1 | 10 | 62.4 |
| Canvas hierarchy frames | 6 | 120 | 17.1 | 66.6 | 3 | 26.2 |
| Canvas hierarchy and cell dividers, final | 5 | 109 | 17.1 | 100.1 | 4 | 58.0 |
| Canvas hierarchy and cell dividers, final repeat | 5 | 112 | 17.1 | 100.0 | 4 | 58.4 |
| Canvas hierarchy and cell dividers, final | 6 | 120 | 17.2 | 83.2 | 1 | 35.8 |

## Retained changes

- Keep the existing board on a composited surface with root layout/paint/style
  containment, rather than repeatedly repainting the entire moving grid.
- Skip hidden auxiliary views during layout-7 movement. Preserve the existing
  debounced camera-history recording.
- Empty lens cells keep their actual button, permissions, coordinates, accessible
  label and listener, without invisible number or mark spans. A mark span is
  created when needed. Switching layouts restores the normal numbered display.
- Draw hierarchy frames and thin cell dividers together in the existing viewport
  canvas. Preserve colors, remaining-level thicknesses, detail cutoff, and the
  last-cell highlight. This replaces thousands of pseudo-elements and shadows.
  It contains no legality, routing, win evaluation, or state-transition logic.
- Keep the left overview cached and retain the existing selection movement,
  magnification, routing colors and controls.

## Interactive checks

- L5 and L6 tested between successive rendering tweaks.
- Held arrows, Shift-speed reversals, top-left clamping, diagonal dragging toward
  the bottom-right beyond the board, and settling after release.
- No blank grid regions observed in the inspected corner views.
- L5 actual cell clicks after movement; regular-computer replies; Show legal
  region followed by a second legal move; continued movement during AI turns.
- L6 actual move through the existing position picker, regular-computer reply,
  movement during the AI turn, and recentering on the resulting routing area.
- L6 movement with two actual marks: 117 frames, p95 17.3 ms, maximum 66.6 ms,
  three intervals over 50 ms, maximum board update 30.1 ms.
- Fast L6 Shift reversal still had p95 about 50 ms and occasional 100 ms pauses.
- Routing outlines, last-move indicator, and layer thickness visually inspected.
- Added regression coverage for lazy mark creation, preserved permissions and
  listener identity, and restoring cell numbers when leaving layout 7.
- All 52 JavaScript tests and all 58 Python tests passed.

## Remaining limits

Fresh detail updates still create/update many actual cell buttons and can cause
isolated 80–100 ms stalls. The improvements do not prove stutter-free behavior,
particularly at faster movement or later in long games. Long populated games,
completed-board cascades, other display sizes and weaker hardware still need
dedicated performance testing.

The existing fixed lens magnification/detail cutoff does not expose actual cell
buttons at L6 in this viewport; marks use the existing sparse overlay. The L6
gameplay check therefore used the existing position picker. Changing that zoom
or interaction behavior would be a separate visible change and was not done.
