# Large-map rendering and preserving moves across zoom

Research date: 2026-10-08. Scope: board rendering, camera movement, and the visibility of already played marks. Research and discussion only; these are options to evaluate, not approved implementation plans. Experimental AI, game rules, and search behavior are outside this investigation.

## Findings

The useful comparison is not just a game having edge scrolling. It is how that game separates a changing camera from mostly unchanged world content, and how it represents important objects when their normal shapes become too small to read.

There are two distinct problems here:

1. **Movement performance:** a camera can change every frame without rebuilding the unchanged board every frame. Culling alone does not ensure that preparation, layout, uploads, or painting are inexpensive.
2. **Information preservation:** reducing detail should not make an occupied board appear empty. Object representations can change with scale, while the underlying facts remain available.

Neither finding requires changing AI behavior or duplicating game rules in the browser.

## What our implementation currently does

Inspected the local `ui.py`, `web.js`, and `board-camera.js` on the research date. `DETAIL_THRESHOLD = 96` stops expanding a board whose projected width is less than 96 pixels. The returned object has `children: []` and `collapsed: true`; individual leaf marks below it are therefore absent from that presentation snapshot. This is an explicit detail cutoff, not deletion of game state. It explains why a move can disappear well before it becomes subpixel-sized.

The camera uses an existing picture immediately through translation/scaling at deeper levels. The viewport request path is throttled by 100 milliseconds, has one request in flight, and reuses loaded detail while the unbuffered view stays within it. Camera views normally include an 80-pixel buffer. These facts do not by themselves identify which browser stage causes the remaining lag; profiling during the actual reported interaction is still required.

At maximum edge speed, 485.4 pixels/second moves through 80 pixels in approximately 165 milliseconds. This is a geometric calculation, not a measured worker latency. Dragging can exhaust the buffer much faster. Enlarging a buffer alone exchanges more preparation/memory for more coverage; it does not remove the cost of replacing detail.

## Factorio: cache preparation, and update only newly exposed terrain

Wube's developer account describes caching prepared terrain draw orders per chunk. Chunks newly entering the view only need preparation when they are not already cached. Changing render scale does not invalidate that draw-order cache. Static chunks can reuse pixels, while chunks with dynamic effects require redraw. The developers identify prefetching and spreading work over ticks as opportunities, rather than claiming they were all implemented at that point. This is a 2019 implementation account, not a complete description of today's proprietary engine. [Friday Facts #323](https://factorio.com/blog/post/fff-323)

Another developer account identifies a scrolling-specific bottleneck: shifting cached terrain and copying the complete result back rendered roughly two screens of pixels. On the cited older integrated GPU, moving increased terrain rendering from approximately 2 to 5 milliseconds. Their replacement tracks the cached texture's offset and updates changed strips, making copied pixel work proportional to scrolling distance. The numbers are historical hardware measurements, not predicted results for Fifteen. [Friday Facts #333](https://factorio.com/blog/post/fff-333)

**Inference for Fifteen:** caching recursive regions or prepared drawing data can avoid repeating work for an unchanged position merely because the camera moved. Invalidating regions after a move should account for the played leaf and any changed ancestor presentation, using authoritative game results. A texture cache may help, but a single enormous board bitmap would reintroduce memory and redraw problems at higher levels. A bounded cache of regions is the more scalable comparison.

## Factorio: an overview retains information through another representation

The current documented `furthest_game_view` zoom limit switches sufficiently distant views from detailed game rendering to chart rendering. This proves that Factorio has an explicit representation boundary; it does not expose all internal chart-renderer algorithms. [ZoomLimits](https://lua-api.factorio.com/latest/concepts/ZoomLimits.html)

The chart settings expose separate colors for friendly/enemy entities, a player-circle size, custom-tag scaling, and an absolute minimum electric-line width alongside its ordinary width. These are concrete examples of overview presentation having its own visibility parameters, rather than simply shrinking all detailed geometry uniformly. Exact marker collision policies are not specified by this API. [ChartUtilityConstants](https://lua-api.factorio.com/latest/concepts/ChartUtilityConstants.html)

Wube's 2017 map improvements describe separate map overlays, text/icon tags, and inspection of a resource patch's amount. These preserve strategic facts at factory scale without requiring every detailed sprite to remain legible. [Friday Facts #180](https://factorio.com/blog/post/fff-180)

**Inference for Fifteen:** the grid-detail cutoff and occupied-mark visibility can be separate decisions. An occupied region should retain an informative representation even when its individual buttons are omitted. The chosen representation must distinguish occupancy, last move, and actual completed-board results; an occupancy summary must never resemble a newly invented win rule.

## OpenRA: visible actors, persistent terrain data, and a separate radar representation

`WorldRenderer.PrepareRenderables` queries screen-space actors intersecting the viewport through `ScreenMap.RenderableActorsInBox`. It generates the actor renderables, overlays, and annotations separately. The implementation reuses collections and applies stable ordering to avoid flicker. This is concrete source evidence for visible-object querying and separate presentation layers, not evidence that all world work is bounded by the viewport. [WorldRenderer.cs](https://github.com/OpenRA/OpenRA/blob/bleed/OpenRA.Game/Graphics/WorldRenderer.cs)

`TerrainSpriteLayer` stores terrain vertices persistently, tracks dirty rows, uploads changed visible rows, and draws the visible row interval. Importantly, it allocates arrays/buffers for the map's dimensions: visibility limits drawing but does not eliminate whole-map storage. This particular design cannot be copied wholesale for an arbitrarily deep board without investigating memory growth. It is not a fully sparse chunk streamer. [TerrainSpriteLayer.cs](https://github.com/OpenRA/OpenRA/blob/bleed/OpenRA.Game/Graphics/TerrainSpriteLayer.cs)

`RadarWidget` has separate terrain, actor, and shroud sprites. Terrain responds to terrain-color changes; the actor layer is rebuilt each tick from actor radar signatures, independently of the main visible-actor picture. The widget also draws the main viewport rectangle and radar pings. This is a concrete example of gameplay-significant objects retaining a different representation in an overview. It does not show that every actor is always visible: game visibility/shroud checks still apply. [RadarWidget.cs](https://github.com/OpenRA/OpenRA/blob/bleed/OpenRA.Mods.Common/Widgets/RadarWidget.cs)

**Inference for Fifteen:** preserve a sparse occupied-mark layer independently of detailed empty-cell controls. Board grid, occupied marks, legal-region indication, last-move indication, and winning lines need not all have the same update frequency or detail threshold. They must still consume the same authoritative position and results. Separate layers are a performance/presentation option, not permission to change rules.

## Supreme Commander / Forged Alliance: strategic icons have their own threshold

The official Supreme Commander 2 manual documents a whole-map strategic view and controls for wheel zoom, scrolling speed, and edge scrolling. It supports the strategic-zoom interaction comparison but does not disclose its proprietary renderer's cache or scheduling implementation. [Official manual, printed pages 3, 7, and 16](https://support.na.square-enix.com/document/manual/925/SC2_Manual_PC.pdf)

The maintained FAF source for the Forged Alliance UEF commander has `Display.Mesh.IconFadeInZoom = 130` and separate mesh LOD cutoffs of 100 and 215. That is direct evidence that strategic-icon appearance is configured independently of model detail. The units/meaning of the camera value 130 and the complete engine fade/collision algorithm are not established by this blueprint alone; it is not a 130-pixel browser threshold. FAF is a maintained community implementation, not the original proprietary engine source. [UEL0001 blueprint](https://github.com/FAForever/fa/blob/develop/units/UEL0001/UEL0001_unit.bp)

**Inference for Fifteen:** a zoomed-out marker can preserve the fact and owner of a played move even when the normal X/O in a cell would be unreadable. This needs explicit overlap handling and a decision about whether the marker remains individually identifiable or becomes a summary of several marks.

## The unavoidable pixel limit versus the avoidable disappearing-mark problem

For a board drawn 300 CSS pixels wide, leaf-cell width is `300 / 3**levels`, ignoring gaps and border thickness:

| Level | Cells across | Total leaf cells | Width of one cell |
| --- | ---: | ---: | ---: |
| 4 | 81 | 6,561 | 3.70 px |
| 5 | 243 | 59,049 | 1.23 px |
| 6 | 729 | 531,441 | 0.41 px |
| 7 | 2,187 | 4,782,969 | 0.14 px |
| 8 | 6,561 | 43,046,721 | 0.046 px |

These are mathematical examples, not measurements of the user's current viewer. A higher-density display adds raster samples but does not make those objects comfortably readable in CSS-pixel terms. Showing an exact readable X/O in every cell at the overview scale is impossible once many cells share a pixel. That does **not** justify arbitrarily suppressing all evidence of occupancy. Sparse occupied positions and summaries can remain visible without instantiating every empty leaf.

Possible representations to discuss:

| Option | Preserves | Cost / limitation |
| --- | --- | --- |
| Exact scaled ink or a small raster of the marks | Precise geometric locations and patterns | Tiny marks fade or alias; X versus O becomes unreadable; dense regions can blend |
| Minimum-size X/O markers anchored to exact positions | Owner and approximate location of sparse moves | Neighboring markers overlap; marker area no longer equals cell area; picking ambiguity |
| Per-region counts or occupancy summaries | That moves exist, with exact counts if supplied | Hides individual arrangement until zoomed in; must not suggest the region is won |
| Hybrid with a distinct last-move marker | Sparse detail where readable, density where crowded, latest move discoverable | More presentation states and transition rules to specify and verify |

These alternatives are not interchangeable fixes. Whether all past moves must remain individually represented, or whether dense regions may summarize them, is a user decision before implementation. Enlarging glyphs cannot create missing space; hiding information is also not the only available response.

## Measurements and acceptance criteria to propose, not assume

1. Profile the real Level 4 camera interaction with Human/Human first, then reuse the same position at Levels 5 and 6. Distinguish frame pacing, layout, paint/compositing, snapshot generation, serialization, and queue latency. AI changes are not required for this baseline.
2. Record distributions and spikes, not only average FPS: frame time, longest main-thread task, viewport-response latency, nodes/bytes added per update, and memory after repeated pan/zoom loops. A candidate 60-Hz target is 16.7 ms per frame; this is a proposed target, not proof of meeting it.
3. Compare movement inside already loaded content with crossing a detail boundary. Test steady edge scroll, fast drag, reversal, repeated threshold crossing, and zoom anchored on the cursor. This separates camera/compositor cost from incremental-content cost.
4. Test visibility with one isolated move, opposing nearby moves, a dense cluster, a completed child board, and a last move inside a collapsed region. Zoom out and back in; each representation must remain consistent with the authoritative position.
5. For levels beyond 6, evaluate whether cost grows with visible screen area and occupied/changed regions rather than total empty leaf capacity. Cached empty-grid geometry and sparse marks are separate workloads. Historical performance in another native game does not prove a browser implementation will scale.
6. Verify keyboard access, focus continuity, legal move validation, clear legal-region indication, and winning-line presentation after any renderer change. Canvas/WebGL or flattened draw layers would trade away native per-cell controls unless accessibility and interaction are deliberately preserved.

## Browser engines: camera transforms are different from rebuilding content

PixiJS 8 render groups retain prepared rendering instructions for a stable scene structure and allow group transforms to have little CPU overhead. Separating the world from interface elements is an example in its documentation. Excessive grouping can instead reduce performance. The transferable principle is to keep unchanged content stable while moving its camera, not to assume that introducing this library fixes all bottlenecks. [Render groups](https://pixijs.com/8.x/guides/concepts/render-groups)

PixiJS explicitly warns that culling can improve GPU-bound performance but worsen CPU-bound performance. Rechecking every object to decide whether to draw it has its own cost. Its guidance also favors unchanged graphics, batched sprites, and avoiding repeated text rasterization/uploads. For a recursive board, selecting visible regions directly is a stronger scaling direction than constructing all leaves and testing each for visibility. The latter statement is an inference for this project. [Performance tips](https://pixijs.com/8.x/guides/concepts/performance-tips)

Texture caching exchanges repeated drawing work for memory. PixiJS recommends caches for content that changes infrequently, requires explicit updates after changes, and warns that very large caches, for example beyond 4096 by 4096 pixels, can fail depending on the GPU. This is not a universal hardware limit. A viewport-sized renderer with bounded region caches is a candidate; an image of the entire deeply expanded board is not a scalable substitute for its current DOM tree. [Cache as texture](https://pixijs.com/8.x/guides/components/scene-objects/container/cache-as-texture)

Phaser's historical 2018 tilemap account describes visible-tile culling and fast camera movement clipping the next row when the culling area is too tight. Padding extends coverage; disabling culling incurs the cost of the complete map. Current TilemapLayer documentation still exposes culling padding in tile units. These sources support the existence of the boundary problem and mitigation, not a claim that Fifteen uses Phaser or has precisely that bug. [Developer log 165](https://phaser.io/devlogs/165), [TilemapLayer API](https://docs.phaser.io/api-documentation/class/tilemaps-tilemaplayer)

For browser elements, width/height changes can trigger layout, whose cost depends on both element count and layout complexity. Reading geometry after writes can force immediate layout. Translation and scaling can avoid layout through compositing, but actual paint and layer behavior must be measured. Using a transform is not proof that a camera interaction is inexpensive. [Layout costs](https://web.dev/articles/avoid-large-complex-layouts-and-layout-thrashing), [Animation pipeline](https://web.dev/articles/animations-guide)

MDN recommends reusing pre-rendered canvas content and separate canvases for layers with different update patterns. Those techniques fit a mostly static grid and comparatively sparse changing marks. A canvas does not automatically retain native button semantics, keyboard navigation, or screen-reader information; preserving those is part of evaluating any replacement, not optional cleanup. [Canvas optimization](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas)

## Tangential comparison: deep-zoom image viewers

OpenSeadragon exposes choices between loading destination tiles during animation and loading along the camera's path, plus whether to prioritize immediate high-quality tiles. Its `maxTilesPerFrame` setting limits tile loading per frame, not the entire rendering workload. This illustrates a scheduling tradeoff: keep a coarse representation available while finer content arrives. Its image-viewer implementation is not itself a game-state or interaction solution. [Viewer options](https://openseadragon.github.io/docs/OpenSeadragon.html)

## Additional local performance hypotheses

These are inspection findings and possible costs, not measured explanations of the user's remaining lag:

- Deep camera motion uses transforms, but accepting refreshed detail also changes layout size. Nested grid layout and painting can still occur at those boundaries.
- Recursive render keys serialize subtree data. Ancestor keys can repeat work over descendants; an interaction revision can also invalidate presentation even when marks did not change.
- After detail updates, the renderer refreshes winning lines, collects available controls, selects a keyboard target, and updates entry state. The aggregate cost needs measurement alongside DOM replacement.
- A retained element count or passing functional tests does not measure frame pacing, paint cost, or pauses when new regions enter the view.

The clarification received during research is that marks disappear when zoomed out, rather than newly exposed cells remaining blank. Coverage scheduling remains relevant to motion performance, but it should not be substituted for that confirmed visibility issue.

## Implementation alternatives to discuss

| Candidate | Potential benefit | Affected behavior and tradeoffs |
| --- | --- | --- |
| Keep DOM controls; narrow measured expensive updates and add a separate sparse mark representation | Smallest departure from existing interaction; could solve unnecessary work and disappearing marks | Nested layout may still limit higher levels; mark overlay and controls must agree across zoom thresholds |
| Viewport-sized Canvas 2D with reusable grid/mark drawing and bounded region caches | Avoids thousands of nested layout objects; blank capacity need not require a control per leaf | Recreates visual rendering and picking; keyboard, focus, accessibility, legal-region indication, and winning lines must be preserved |
| GPU renderer such as PixiJS, using stable groups and batched drawing | More headroom for many visible marks and transforms | New dependency, GPU memory and context recovery, additional interaction integration; CPU preparation can remain the bottleneck |

My proposed order for discussion is first to measure the existing motion pipeline, then compare a small Canvas rendering experiment against the current renderer if the measurements justify it. That is a recommendation for approval, not work performed here. The visibility policy must be agreed separately: exact scaled marks, minimum-size markers, summaries, or a specified hybrid.

Any experiment should keep `fifteen.py` authoritative, reuse existing navigation behavior, leave AI unchanged, and compare sparse and dense positions. It should also cross detail thresholds repeatedly, check stale responses after zoom reversal, retain the user's no-automatic-pan requirement, and verify cache memory remains bounded during prolonged movement. Smooth movement at one level or on one machine is insufficient evidence for levels beyond 6.

## Evidence limits

This report verifies primary source code and first-party developer accounts, plus current published API documentation. It does not benchmark those games or the user's hardware. Factorio's complete renderer and Supreme Commander's underlying engine are not public here. OpenRA's moving `bleed` and FAF's moving `develop` source URLs describe what was inspected on this date and can change. No proprietary Age of Mythology rendering algorithm is inferred from these comparisons.
