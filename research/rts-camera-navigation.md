# RTS camera navigation research

Research date: 2026-10-07. This is source inspection and documentary research, not a play-test. Numeric values below are defaults/constants at the linked revisions, not universal RTS conventions or measured behavior of an installed copy. No game code was changed.

## OpenRA: fixed edge band, fixed direction speed, pointer-anchored zoom

Inspected development branch `bleed`, pinned to `b6fc03fcfaef1277592bbd4cbc7d44dd85219902`. Settings may override defaults, and mods affect zoom extents.

The default edge band is **5 renderer-coordinate pixels** on every side. The check is `x < margin` at the left and `x >= width - margin` at the right, likewise vertically. This is the game window boundary, not the visible map's world-space boundary. Entering the band sets a direction; moving closer does **not** increase speed. Default scrolling is enabled, scroll step is 30, mouse window locking is disabled, and wheel zoom speed is 0.04 with no modifier required. [Settings defaults](https://github.com/OpenRA/OpenRA/blob/b6fc03fcfaef1277592bbd4cbc7d44dd85219902/OpenRA.Game/Settings.cs), [direction checks](https://github.com/OpenRA/OpenRA/blob/b6fc03fcfaef1277592bbd4cbc7d44dd85219902/OpenRA.Mods.Common/Widgets/ViewportControllerWidget.cs).

The controller combines keyboard and edge directions, then normalizes the vector, so a corner does not scroll faster than a straight edge. Movement scales by `min(elapsed milliseconds, 25) / 25 * scrollStep`. The source comment mentions a 40 ms interval but the actual formula uses 25 ms; use the code when describing this revision. This cap prevents a long update interval from producing a proportionally huge jump, but also means stalls can lower effective speed. Edge movement requires window input focus, and keyboard movement is cleared when a UI widget has keyboard focus. Standard mouse dragging suppresses the edge/keyboard branch; joystick scrolling has its own branch, proportional to displacement from its drag origin. Default mouse scroll deadzone is 8. [Controller](https://github.com/OpenRA/OpenRA/blob/b6fc03fcfaef1277592bbd4cbc7d44dd85219902/OpenRA.Mods.Common/Widgets/ViewportControllerWidget.cs).

Wheel zoom multiplies scale by `exp(wheelDelta * zoomSpeed)` and clamps it. **Calculated**, assuming a delta of one and default speed: one increment changes scale by about 4.08%; the opposite increment reverses it when unclamped. Wheel zoom preserves the world point under the mouse by calculating it before/after and adjusting the camera center. Keyboard zoom uses steps of ±0.25 without a mouse anchor. Boundaries can prevent perfect anchoring because the resulting center is clamped. [Wheel and keyboard handlers](https://github.com/OpenRA/OpenRA/blob/b6fc03fcfaef1277592bbd4cbc7d44dd85219902/OpenRA.Mods.Common/Widgets/ViewportControllerWidget.cs), [zoom implementation](https://github.com/OpenRA/OpenRA/blob/b6fc03fcfaef1277592bbd4cbc7d44dd85219902/OpenRA.Game/Graphics/Viewport.cs).

Do not describe zoom as invariably 1×–2×: those are initial fields, subsequently recalculated from resolution, configured viewport distance and mod-provided sizes. Spectator/editor support includes an unlocked lower limit; a source TODO explicitly says zooming out until the whole map is visible still needs improved centering. Panning divides screen displacement by zoom, so a given screen movement traverses more world space when zoomed out. The clamped object is the **camera center**, not the entire visible rectangle; blocked-direction cursors communicate map limits. [Viewport geometry and limits](https://github.com/OpenRA/OpenRA/blob/b6fc03fcfaef1277592bbd4cbc7d44dd85219902/OpenRA.Game/Graphics/Viewport.cs), [cursor feedback](https://github.com/OpenRA/OpenRA/blob/b6fc03fcfaef1277592bbd4cbc7d44dd85219902/OpenRA.Mods.Common/Widgets/ViewportControllerWidget.cs).

UI nuance: this controller's edge check does not test `MouseOverWidget`; its cursor display does. Consequently, this method alone does not justify claiming that every UI panel blocks edge panning. Wheel behavior also depends on UI event dispatch reaching this widget. This is a limit of the inspected path, not a claim that every overlay permits scrolling. [Controller](https://github.com/OpenRA/OpenRA/blob/b6fc03fcfaef1277592bbd4cbc7d44dd85219902/OpenRA.Mods.Common/Widgets/ViewportControllerWidget.cs).

## Warzone 2100: fixed band, acceleration over time, zoom-dependent pan speed

Inspected `master`, pinned to `d7ce18df8d998c968915a5e6410a68626927813e`.

Both edge constants are **2 pixels** (`BOUNDARY_X`, `BOUNDARY_Y`). The direction tests use `< 2` and `>= dimension - 2`. Pointer proximity within the band does not change the target velocity. Default camera acceleration is enabled. Axes are calculated independently with no diagonal normalization: **inferred from the equations**, equal fully developed velocities in both axes give a diagonal magnitude √2 times a straight movement. [Boundary constants](https://github.com/Warzone2100/warzone2100/blob/d7ce18df8d998c968915a5e6410a68626927813e/src/displaydef.h), [camera scrolling](https://github.com/Warzone2100/warzone2100/blob/d7ce18df8d998c968915a5e6410a68626927813e/src/display.cpp).

Default configured speed is 2500, accepted range 100–5000, step 100. World speed multiplies this by `1 + 2 * normalizedViewDistance`: **calculated**, the factor ranges from 1 to 3 over the ordinary zoom distance range. With acceleration enabled, acceleration is half target speed per second and deceleration twice that acceleration; at fixed zoom this implies approximately two seconds from rest to full target speed and one second from full speed to rest. Direction reversal first zeros velocity. These are mathematical deductions, not measured timings. Disabling acceleration selects half the configured maximum speed. [Configuration constants](https://github.com/Warzone2100/warzone2100/blob/d7ce18df8d998c968915a5e6410a68626927813e/src/warzoneconfig.h), [configuration defaults/validation](https://github.com/Warzone2100/warzone2100/blob/d7ce18df8d998c968915a5e6410a68626927813e/src/warzoneconfig.cpp), [velocity integration](https://github.com/Warzone2100/warzone2100/blob/d7ce18df8d998c968915a5e6410a68626927813e/src/display.cpp).

The scrolling path uses a steady-clock delta, throttles updates below 4 ms, and caps the delta at 0.5 seconds. The comment identifies selection-box dragging as a reason to avoid a jump after a gap. Menus and multiplayer joining status block this path. Gestures reset scroll velocity; an optional rotation-lock condition also resets it. Manual movement disables the tracking camera so it cannot fight the player. Camera movement rotates into world coordinates using camera yaw and is clamped to the campaign's scroll rectangle. [Scrolling and limits](https://github.com/Warzone2100/warzone2100/blob/d7ce18df8d998c968915a5e6410a68626927813e/src/display.cpp).

The edge predicate permits scrolling when the mouse is inside the window, or outside when the setting allows it and the window has focus. Outside-window edge scrolling defaults **true for native builds but false for Emscripten/browser builds**, with an explicit comment about combined touch/mouse/trackpad devices. Do not summarize that predicate as simply requiring focus in all cases. [Window/gesture conditions](https://github.com/Warzone2100/warzone2100/blob/d7ce18df8d998c968915a5e6410a68626927813e/src/display.cpp).

Wheel zoom has context: over the radar/minimap it maps to radar zoom, while gameplay maps wheel up/down to camera zoom. The map zoom callback changes **view distance** by a configured additive amount; it does not adjust the horizontal camera position to anchor the mouse. This is center/view-distance zoom, unlike OpenRA's pointer anchor. Normal distance constants are 0–5000, replay maximum 7000; configured starting zoom has a separate minimum of 1600 and default start 2600. Debug mappings can bypass ordinary incremental-zoom limits. [Input mappings](https://github.com/Warzone2100/warzone2100/blob/d7ce18df8d998c968915a5e6410a68626927813e/src/input/keyconfig.cpp), [callbacks](https://github.com/Warzone2100/warzone2100/blob/d7ce18df8d998c968915a5e6410a68626927813e/src/keybind.cpp), [distance constants](https://github.com/Warzone2100/warzone2100/blob/d7ce18df8d998c968915a5e6410a68626927813e/src/display.h).

Zoom does not always respond: increment requests return during menus/joining or the short cooldown, and ordinary limits clamp them. Wheel mapping processing is suppressed during text input or when the mouse is over a screen-overlay child, console, construction UI, or active gesture. Incremental zoom accumulates against an existing animation's **target**, not its intermediate displayed value, then retargets an eased animation. Pinch zoom has a separate multiplicative, immediate path. [Input gating and distance animation](https://github.com/Warzone2100/warzone2100/blob/d7ce18df8d998c968915a5e6410a68626927813e/src/display.cpp).

The official guide additionally documents rotation, unit tracking, jumping to base, minimap movement and separate minimap zoom. This is evidence that edge scrolling is only one navigation method within a larger camera system. [Official quick-start guide](https://github.com/Warzone2100/warzone2100/blob/d7ce18df8d998c968915a5e6410a68626927813e/doc/quickstartguide.asciidoc).

## Interpretation for a browser board (design implications, not implemented changes)

These games demonstrate two distinct models: a narrow fixed band with immediate velocity (OpenRA), or a narrow fixed band with time-based acceleration (Warzone). Neither inspected edge algorithm accelerates simply because the pointer is closer to the border. A proportional proximity model would be a deliberate design choice, not a faithful copy of either.

Important cases for a later prototype: edges versus corners; changes in zoom during panning; pointer leaving the board/window; loss of focus; selection drags and touch gestures; wheel over controls/minimap; retargeting unfinished zoom animation; clamping at each map boundary; small content inside a larger viewport; resize and display scaling. Camera state belongs to presentation; it cannot replace Fifteen's authoritative Python magic-square rules.

## Age of Empires: documented behavior and evidence limits

AoE II: Definitive Edition exposes scroll speed and scroll inertia; the latter controls acceleration after scrolling starts. The documentation does not establish a pixel threshold or a proximity-based speed curve. [Official accessibility documentation](https://www.ageofempires.com/age-ii-de-accessibility/).

AoE IV's Season Two introduced Classic/Panoramic camera modes. Developers explain that further zoom-out impaired selection and readability. That release required returning to the main menu for an in-match mode change to apply; this is historical release behavior, not a verified current restriction. [Update 17718](https://www.ageofempires.com/news/age-of-empires-iv-update-17718/).

AoE III DE's Photo Mode documents edge movement, wheel zoom, ground/height/map limits, and possible building clipping. These are Photo Mode facts, not a specification for normal gameplay. [Update 13.690](https://www.ageofempires.com/news/age_of_empires_iii_de_update_13_690/).

The reviewed official AoE material does not publish exact edge thresholds, acceleration equations, or complete wheel-event routing. No gameplay measurements were performed.

## 0 A.D.: archived implementation example

The inspected GitHub repository is archived (September 2024); current Gitea source could not be accessed through the research tool. Treat these as implementation examples rather than verified current-release defaults.

Defaults: edge detection distance 3; scroll speed 120; wheel zoom increment 32; zoom minimum/maximum/default 50/200/120; separate position and zoom smoothing. Distances are engine parameters, not zoom percentages. [Configuration](https://raw.githubusercontent.com/0ad/0ad/master/binaries/data/config/default.cfg).

Inside the edge band, each axis adds speed × real elapsed time, regardless of proximity. Corners add both axes without normalization. Zoom translates along the viewing direction rather than anchoring the cursor. Constraints clamp zoom and the focus point; terrain handling prevents excessive cliff zoom and ground penetration. Manual panning breaks unit following. [CameraController.cpp](https://raw.githubusercontent.com/0ad/0ad/master/source/graphics/CameraController.cpp).

Camera updates stop on focus loss, touch-control takeover, or active cinematics; input events require a started game and application focus. [GameView.cpp](https://raw.githubusercontent.com/0ad/0ad/master/source/graphics/GameView.cpp).

## Related navigation systems and browser details

Supreme Commander 2 supports a whole-map strategic zoom, adjustable zoom sensitivity/scroll speed, optional edge scrolling, keyboard zoom, middle-mouse panning, camera reset, and unit tracking. This illustrates an overview/detail navigation alternative. [Publisher manual, printed pages 7, 16, 41](https://support.na.square-enix.com/document/manual/925/SC2_Manual_PC.pdf).

Browser wheel measurements may use pixels, lines, or pages and may reflect device/OS acceleration or fractional movement. A fixed assumption that one event equals one wheel notch is unreliable. [W3C Wheel Events draft](https://w3c.github.io/uievents/split/wheel-events.html).

D3 provides zoom and translation bounds; its documented wheel handling normalizes delta modes and multiplies scale by an exponential factor. At a zoom limit, a new outward wheel gesture is ignored so native page scrolling can resume. Direct transform assignment bypasses configured bounds. [D3 documentation](https://d3js.org/d3-zoom).

D3's implementation anchors wheel zoom at the pointer and adjusts translation, then applies bounds. Its constraint centers content when the viewport exceeds the world extent. The wheel listener is non-passive; Ctrl-wheel also accommodates trackpad pinch input. [D3 source](https://raw.githubusercontent.com/d3/d3-zoom/main/src/zoom.js).

## Design implications for Fifteen — synthesis, not implemented behavior

- Define the edge relative to the visible board viewport, including an explicit policy for any overlay/sidebar.
- Choose fixed speed, proximity speed, or acceleration over time separately from visual smoothing.
- Choose screen-space versus board-space speed; screen-space speed requires converting through current scale.
- Choose center or cursor zoom anchoring. Cursor anchoring may need to yield to map bounds near an edge.
- Define input ownership: board wheel zoom versus panel/page scrolling; dragging/selecting versus edge panning.
- Stop continuous movement on pointer exit, focus loss, hidden page, and modal opening; clear stale input on resumption.
- Clamp both current and intended camera states so repeated input at a limit does not accumulate delayed motion.
- Handle corners, viewport resize, browser zoom/DPI, a board smaller than the viewport, fractional wheel events, rapid direction reversal, and simultaneous zoom/pan.
- Retain keyboard or direct drag alternatives; an overview or fit-board reset may be useful for navigation.
- Camera state belongs to presentation. Existing authoritative Fifteen domain rules must continue to determine legal moves and outcomes.

These are candidate decisions and test cases inferred from the comparisons. They are not claims that every reviewed game implements them or requests to add features.
